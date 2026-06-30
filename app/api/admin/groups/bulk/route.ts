import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications/send';

const INDEX_REGEX = /^[A-Z]{2,6}\.\d{2}\.\d{3}\.\d{3}\.\d{2}$/;

type ParsedStudent = {
  name: string;
  index: string;
  gender?: 'M' | 'F' | null;
};

type ParsedGroup = {
  group_number: number;
  members: ParsedStudent[]; // first = leader
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTableRows(html: string): string[][] {
  // Pull all <tr> blocks, then extract <td> text content
  const rows: string[][] = [];
  const trMatches = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const tr of trMatches) {
    const cells: string[] = [];
    const tdMatches = tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
    for (const td of tdMatches) {
      cells.push(td[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function normaliseGender(raw: string): 'M' | 'F' | null {
  const v = raw.trim().toUpperCase();
  if (['M', 'MALE', 'BOY'].includes(v)) return 'M';
  if (['F', 'FEMALE', 'GIRL'].includes(v)) return 'F';
  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function autoGroup(students: ParsedStudent[]): ParsedGroup[] {
  const hasGender = students.some((s) => s.gender);

  let ordered: ParsedStudent[];
  if (hasGender) {
    // Shuffle each gender pool separately, then interleave for balance
    const males   = shuffle(students.filter((s) => s.gender === 'M'));
    const females = shuffle(students.filter((s) => s.gender === 'F'));
    const unknown = shuffle(students.filter((s) => !s.gender));
    const result: ParsedStudent[] = [];
    const maxLen = Math.max(males.length, females.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < males.length)   result.push(males[i]);
      if (i < females.length) result.push(females[i]);
    }
    result.push(...unknown);
    ordered = result;
  } else {
    // No gender info — fully random shuffle
    ordered = shuffle(students);
  }

  // Distribute into groups of 4 or 5 (max 5), as evenly as possible
  const n = ordered.length;
  if (n === 0) return [];

  const numGroups = Math.ceil(n / 5);
  // Some groups get 5, the rest get 4
  const fives = n - numGroups * 4; // how many groups of 5
  const sizes: number[] = [
    ...Array(fives).fill(5),
    ...Array(numGroups - fives).fill(4),
  ];

  const groups: ParsedGroup[] = [];
  let cursor = 0;
  for (const size of sizes) {
    if (cursor >= n) break;
    groups.push({
      group_number: groups.length + 1,
      members: ordered.slice(cursor, cursor + size),
    });
    cursor += size;
  }
  return groups;
}

function parseAutoList(rows: string[][]): { students: ParsedStudent[]; hasGender: boolean } {
  // Detect header row — skip it
  const header = rows[0]?.map((c) => c.toLowerCase()) ?? [];
  const nameCol = header.findIndex((h) => h.includes('name'));
  const indexCol = header.findIndex((h) => h.includes('index'));
  const genderCol = header.findIndex((h) => h.includes('gender') || h.includes('sex'));

  const dataRows = nameCol >= 0 || indexCol >= 0 ? rows.slice(1) : rows;

  const nC = nameCol >= 0 ? nameCol : 0;
  const iC = indexCol >= 0 ? indexCol : 1;
  const gC = genderCol >= 0 ? genderCol : -1;

  const students: ParsedStudent[] = [];
  for (const row of dataRows) {
    const idx = row[iC]?.trim().toUpperCase().replace(/\s/g, '');
    if (!idx || !INDEX_REGEX.test(idx)) continue;
    students.push({
      name: row[nC]?.trim() ?? '',
      index: idx,
      gender: gC >= 0 ? normaliseGender(row[gC] ?? '') : null,
    });
  }

  return { students, hasGender: gC >= 0 };
}

function parsePreFormedGroups(rows: string[][]): ParsedGroup[] {
  // Expected format (with or without header):
  // Group No | Student Name | Index Number
  // Same group number appears on consecutive rows; first row per group = leader
  const header = rows[0]?.map((c) => c.toLowerCase()) ?? [];
  const hasHeader =
    header.some((h) => h.includes('group')) ||
    header.some((h) => h.includes('name')) ||
    header.some((h) => h.includes('index'));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  // Detect column positions
  const h = header;
  const gC = h.findIndex((c) => c.includes('group')) >= 0
    ? h.findIndex((c) => c.includes('group'))
    : 0;
  const nC = h.findIndex((c) => c.includes('name')) >= 0
    ? h.findIndex((c) => c.includes('name'))
    : 1;
  const iC = h.findIndex((c) => c.includes('index')) >= 0
    ? h.findIndex((c) => c.includes('index'))
    : 2;

  const groupMap = new Map<number, ParsedGroup>();

  for (const row of dataRows) {
    const rawGroup = row[gC]?.trim();
    const groupNum = parseInt(rawGroup ?? '', 10);
    if (isNaN(groupNum)) continue;

    const idx = row[iC]?.trim().toUpperCase().replace(/\s/g, '');
    if (!idx || !INDEX_REGEX.test(idx)) continue;

    if (!groupMap.has(groupNum)) {
      groupMap.set(groupNum, { group_number: groupNum, members: [] });
    }
    const grp = groupMap.get(groupNum)!;
    if (grp.members.length < 5) {
      grp.members.push({ name: row[nC]?.trim() ?? '', index: idx });
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => a.group_number - b.group_number);
}

// ── POST /api/admin/groups/bulk  { mode: 'parse' | 'confirm', ... } ──────────

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const form = await req.formData();
  const mode = form.get('mode') as string;        // 'parse' | 'confirm'
  const uploadMode = form.get('upload_mode') as string; // 'auto' | 'preformed'
  const academicYear = parseInt(form.get('academic_year') as string, 10);

  if (isNaN(academicYear)) {
    return NextResponse.json({ ok: false, error: 'Missing academic_year' }, { status: 400 });
  }

  // ── PARSE MODE: extract groups from docx, return preview ──────────────────
  if (mode === 'parse') {
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const { value: html } = await mammoth.convertToHtml({ buffer: buf });
    const rows = extractTableRows(html);

    if (rows.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'No table found in the document. Make sure the document has a table with student data.' },
        { status: 422 }
      );
    }

    if (uploadMode === 'auto') {
      const { students, hasGender } = parseAutoList(rows);
      if (students.length === 0) {
        return NextResponse.json(
          { ok: false, error: 'No valid index numbers found. Check the document format.' },
          { status: 422 }
        );
      }
      const groups = autoGroup(students);
      return NextResponse.json({ ok: true, groups, hasGender, totalStudents: students.length });
    } else {
      const groups = parsePreFormedGroups(rows);
      if (groups.length === 0) {
        return NextResponse.json(
          { ok: false, error: 'No valid groups found. Ensure the table has Group No, Student Name, and Index Number columns.' },
          { status: 422 }
        );
      }
      return NextResponse.json({ ok: true, groups, totalStudents: groups.reduce((s, g) => s + g.members.length, 0) });
    }
  }

  // ── CONFIRM MODE: bulk insert parsed groups into roster ───────────────────
  if (mode === 'confirm') {
    const groupsRaw = form.get('groups') as string;
    if (!groupsRaw) return NextResponse.json({ ok: false, error: 'Missing groups data' }, { status: 400 });

    let groups: ParsedGroup[];
    try {
      groups = JSON.parse(groupsRaw);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid groups JSON' }, { status: 400 });
    }

    if (!Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json({ ok: false, error: 'No groups to insert' }, { status: 400 });
    }

    const admin = createAdminClient();
    const inserted: number[] = [];
    const skipped: number[] = [];

    for (const grp of groups) {
      if (grp.members.length === 0) continue;
      const leader_index = grp.members[0].index;
      const member_indexes = grp.members.map((m) => m.index);

      const { data, error } = await admin
        .from('admin_group_roster')
        .insert({
          academic_year: academicYear,
          group_number: grp.group_number,
          leader_index,
          member_indexes,
          uploaded_by: user.id,
        })
        .select('id')
        .single();

      if (error) {
        skipped.push(grp.group_number);
        continue;
      }

      inserted.push(grp.group_number);

      // Flag leader in users table if already registered
      const { data: leaderUser } = await admin
        .from('users')
        .update({ is_group_leader: true })
        .eq('index_number', leader_index)
        .eq('role', 'student')
        .select('id')
        .maybeSingle();

      if (leaderUser?.id) {
        await sendNotification({
          userId: leaderUser.id,
          type: 'group_leader_assigned',
          title: 'You are a Group Leader',
          body: `You have been designated as the leader for Group ${grp.group_number} (${academicYear} cohort). Log in to create your group.`,
          link: '/student/group',
          emailData: { groupNumber: grp.group_number, academicYear },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      inserted: inserted.length,
      skipped: skipped.length,
      skippedGroups: skipped,
    });
  }

  return NextResponse.json({ ok: false, error: 'Invalid mode' }, { status: 400 });
}
