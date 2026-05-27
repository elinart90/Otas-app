import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  checkTitle,
  type ArchiveTitle,
  type SimilarityResult,
} from '@/lib/similarity/title-check';

const InputSchema = z.object({
  title: z.string().min(5, 'Title is too short').max(300, 'Title is too long'),
  /** Whether to persist the check (set to false during live debounced typing). */
  persist: z.boolean().default(false),
});

export type TitleCheckResponse =
  | { ok: true; result: SimilarityResult }
  | { ok: false; error: string };

export async function POST(request: NextRequest): Promise<NextResponse<TitleCheckResponse>> {
  // Auth gate
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Parse + validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { title, persist } = parsed.data;

  // Pull the archive corpus.
  // We pull from BOTH archives (formally archived projects) AND projects
  // (in-flight titles), so a student can't propose the same title as a
  // peer in the same cohort either.
  const [archivesRes, projectsRes] = await Promise.all([
    supabase
      .from('archives')
      .select('id, year, project_id, projects!inner(title)')
      .limit(2000),
    supabase
      .from('projects')
      .select('id, title, academic_year')
      .neq('status', 'draft')
      .neq('created_by', user.id) // exclude the user's own in-flight projects
      .limit(2000),
  ]);

  if (archivesRes.error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to load archive corpus' },
      { status: 500 }
    );
  }

  const corpus: ArchiveTitle[] = [
    ...(archivesRes.data ?? []).map((row: any) => ({
      id: row.id,
      title: row.projects?.title ?? '',
      year: row.year,
    })),
    ...(projectsRes.data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      year: row.academic_year,
    })),
  ].filter((c) => c.title);

  // Run the algorithm
  const result = checkTitle(title, corpus, 10);

  // Persist if requested (only on submit, not on every keystroke)
  if (persist) {
    const { error: insertError } = await supabase
      .from('title_similarity_checks')
      .insert({
        user_id: user.id,
        proposed_title: title,
        matches: result.matches,
        highest_score: result.highestScore,
      });
    if (insertError) {
      console.error('[title-check] persist failed:', insertError);
      // Don't fail the request — the check itself succeeded.
    }
  }

  return NextResponse.json({ ok: true, result });
}
