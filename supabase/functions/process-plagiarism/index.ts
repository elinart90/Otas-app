// =============================================================================
// process-plagiarism Edge Function
// =============================================================================
// Runs in Supabase Deno runtime. Triggered by a database webhook on
// INSERT into plagiarism_reports (or by direct HTTP call from the upload API).
//
// Pipeline:
//   1. Receive {reportId} in the request body
//   2. Fetch the report row + the uploaded PDF from Storage
//   3. Extract text via unpdf
//   4. Normalise + shingle the student document
//   5. Iterate all archived projects, compute Jaccard + matched passages
//      (using each archive's cached `shingles` column; compute and cache
//      it on the fly if missing)
//   6. Write plagiarism_matches rows + update plagiarism_reports.status
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

// --------- Configuration ---------
const SHINGLE_SIZE = 5;
const MIN_PASSAGE_RUN = 2;
const MAX_ARCHIVES_PER_REPORT = 500; // safety cap
const FUNCTION_TIMEOUT_BUDGET_MS = 50_000;

// --------- Stop words (mirror of lib/plagiarism/normalise.ts) ---------
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "by",
  "for", "from", "had", "has", "have", "having", "i", "in", "into", "is",
  "it", "its", "of", "on", "or", "that", "the", "this", "these", "those",
  "to", "was", "were", "will", "with", "would", "we", "our", "they",
  "their", "he", "she", "his", "her", "them", "us", "you", "your", "do",
  "does", "did", "but", "so", "not", "no", "yes", "also", "than", "then",
  "when", "which", "who", "whom", "where", "why", "how", "what", "while",
  "about", "after", "before", "above", "below", "between", "over", "under",
]);

// --------- Algorithm primitives ---------

function normaliseText(raw: string): string[] {
  if (!raw) return [];
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function fnv1a(s: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash +
      ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

type Shingle = { hash: number; start: number };

function shingleTokens(tokens: string[], size: number): Shingle[] {
  if (tokens.length < size) return [];
  const out: Shingle[] = [];
  for (let i = 0; i <= tokens.length - size; i++) {
    out.push({ hash: fnv1a(tokens.slice(i, i + size).join(" ")), start: i });
  }
  return out;
}

function fingerprint(shingles: Shingle[]): number[] {
  return [...new Set(shingles.map((s) => s.hash))];
}

function jaccard(a: Set<number>, b: Set<number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const h of small) if (large.has(h)) inter++;
  const union = a.size + b.size - inter;
  return inter / union;
}

type Passage = { studentStart: number; studentEnd: number; shingleCount: number };

function findPassages(
  studentShingles: Shingle[],
  archive: Set<number>,
  size: number,
): Passage[] {
  const out: Passage[] = [];
  let runStart = -1, runEnd = -1, runLen = 0;
  for (const s of studentShingles) {
    if (archive.has(s.hash)) {
      if (runStart === -1) {
        runStart = s.start;
        runLen = 1;
      } else {
        runLen++;
      }
      runEnd = s.start + size - 1;
    } else if (runStart !== -1) {
      if (runLen >= MIN_PASSAGE_RUN) {
        out.push({ studentStart: runStart, studentEnd: runEnd, shingleCount: runLen });
      }
      runStart = -1;
      runLen = 0;
    }
  }
  if (runStart !== -1 && runLen >= MIN_PASSAGE_RUN) {
    out.push({ studentStart: runStart, studentEnd: runEnd, shingleCount: runLen });
  }
  return out;
}

function coverageOf(passages: Passage[], total: number): number {
  if (total === 0) return 0;
  const covered = new Set<number>();
  for (const p of passages) {
    for (let i = p.studentStart; i <= p.studentEnd; i++) covered.add(i);
  }
  return Math.min(1, covered.size / total);
}

// --------- PDF extraction ---------

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

// --------- Main handler ---------

interface Payload {
  reportId?: string;
  record?: { id: string };
}

Deno.serve(async (req: Request) => {
  const started = Date.now();

  // CORS preflight (for direct browser invocation during dev)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // Webhook payloads put the row in `record`. Direct API calls pass reportId.
  const reportId = body.reportId ?? body.record?.id;
  if (!reportId) {
    return new Response(JSON.stringify({ error: "reportId required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // Service-role client (bypasses RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Mark as processing
  await supabase
    .from("plagiarism_reports")
    .update({ status: "processing" })
    .eq("id", reportId);

  try {
    // ----- 1. Load report -----
    const { data: report, error: reportErr } = await supabase
      .from("plagiarism_reports")
      .select("id, user_id, document_url, document_name")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      throw new Error(`Report not found: ${reportErr?.message}`);
    }

    // ----- 2. Download the PDF from Storage -----
    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from("plagiarism-uploads")
      .download(report.document_url);

    if (dlErr || !fileBlob) {
      throw new Error(`Storage download failed: ${dlErr?.message}`);
    }

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());

    // ----- 3. Extract text -----
    let rawText = "";
    try {
      rawText = await extractPdfText(bytes);
    } catch (e) {
      throw new Error(
        `PDF extraction failed (file may be corrupted or scanned image-only): ${
          e instanceof Error ? e.message : "unknown"
        }`,
      );
    }

    if (!rawText.trim()) {
      throw new Error("Extracted text is empty. PDF may be image-based; try OCR or upload a text PDF.");
    }

    // ----- 4. Shingle the student document -----
    const studentTokens = normaliseText(rawText);
    if (studentTokens.length < SHINGLE_SIZE) {
      throw new Error("Document is too short to analyse (fewer than 5 content words after normalisation).");
    }

    const studentShingles = shingleTokens(studentTokens, SHINGLE_SIZE);
    const studentFingerprintSet = new Set(studentShingles.map((s) => s.hash));

    // ----- 5. Fetch archived projects with cached shingles -----
    const { data: archives, error: archErr } = await supabase
      .from("projects")
      .select("id, title, shingles, shingles_size, abstract")
      .eq("status", "archived")
      .limit(MAX_ARCHIVES_PER_REPORT);

    if (archErr) throw new Error(`Archive fetch failed: ${archErr.message}`);

    // ----- 6. Compare against each archive -----
    type ArchiveMatch = {
      archiveId: string;
      title: string;
      similarity: number;
      passages: Passage[];
    };
    const matches: ArchiveMatch[] = [];

    for (const arc of archives ?? []) {
      if (Date.now() - started > FUNCTION_TIMEOUT_BUDGET_MS) break;

      let archiveFp: Set<number>;

      // Use cached fingerprint if size matches our shingle size
      if (Array.isArray(arc.shingles) && arc.shingles_size === SHINGLE_SIZE) {
        archiveFp = new Set(arc.shingles as number[]);
      } else {
        // Build fingerprint from whatever text we have on the archived project.
        // In production this would be the archive's full document text, but for
        // the test corpus we only have title + abstract — that's enough to
        // demonstrate the algorithm works.
        const archiveText = `${arc.title ?? ""} ${arc.abstract ?? ""}`;
        const archTokens = normaliseText(archiveText);
        if (archTokens.length < SHINGLE_SIZE) continue;

        const archShingles = shingleTokens(archTokens, SHINGLE_SIZE);
        const fp = fingerprint(archShingles);
        archiveFp = new Set(fp);

        // Cache it on the row so we don't recompute next time
        await supabase
          .from("projects")
          .update({
            shingles: fp,
            shingles_size: SHINGLE_SIZE,
            shingles_token_count: archTokens.length,
            shingles_updated_at: new Date().toISOString(),
          })
          .eq("id", arc.id);
      }

      const sim = jaccard(studentFingerprintSet, archiveFp);
      if (sim === 0) continue; // skip archives with no overlap at all

      const passages = findPassages(studentShingles, archiveFp, SHINGLE_SIZE);
      if (passages.length === 0) continue;

      matches.push({
        archiveId: arc.id,
        title: arc.title,
        similarity: sim,
        passages,
      });
    }

    // Sort matches by similarity descending
    matches.sort((a, b) => b.similarity - a.similarity);

    // ----- 7. Persist matches and overall report -----
    if (matches.length > 0) {
      const matchRows = matches.slice(0, 50).map((m) => ({
        report_id: reportId,
        matched_archive_id: m.archiveId,
        similarity_score: Number(m.similarity.toFixed(4)),
        matched_passages: m.passages.map((p) => ({
          studentStart: p.studentStart,
          studentEnd: p.studentEnd,
          shingleCount: p.shingleCount,
          excerpt: studentTokens
            .slice(p.studentStart, Math.min(p.studentEnd + 1, p.studentStart + 30))
            .join(" "),
        })),
      }));

      const { error: matchErr } = await supabase
        .from("plagiarism_matches")
        .insert(matchRows);
      if (matchErr) console.error("Match insert error:", matchErr);
    }

    // Calculate overall similarity = max coverage across all matches
    const allPassages = matches.flatMap((m) => m.passages);
    const overallSimilarity = coverageOf(allPassages, studentTokens.length);

    await supabase
      .from("plagiarism_reports")
      .update({
        overall_similarity: Number(overallSimilarity.toFixed(4)),
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    return new Response(
      JSON.stringify({
        ok: true,
        reportId,
        matches: matches.length,
        overallSimilarity,
        tookMs: Date.now() - started,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[process-plagiarism] fatal:", e);
    await supabase
      .from("plagiarism_reports")
      .update({
        status: "failed",
        error_message: e instanceof Error ? e.message : "Unknown error",
        processed_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
