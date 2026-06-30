import { createAdminClient } from '@/lib/supabase/admin';
import { RegisterForm, type FacultyOption } from './register-form';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const admin = createAdminClient();

  const [{ data: depts }, { data: progs }] = await Promise.all([
    admin.from('departments').select('id, name, code, faculty').order('name'),
    admin.from('programmes').select('id, name, code, department_id').order('name'),
  ]);

  // Build Faculty → Department → Programme tree
  const facultyMap = new Map<string, FacultyOption>();

  const FACULTY_ORDER = [
    'Faculty of Mining and Minerals Technology',
    'Faculty of Engineering',
    'Faculty of Computing and Mathematical Sciences',
    'Faculty of Geosciences and Environmental Studies',
    'Faculty of Integrated Management Science',
    'GNPC School of Petroleum Studies',
  ];

  for (const d of depts ?? []) {
    const facultyName = (d.faculty as string | null) ?? d.name;
    if (!facultyMap.has(facultyName)) {
      facultyMap.set(facultyName, { name: facultyName, departments: [] });
    }
    facultyMap.get(facultyName)!.departments.push({
      id: d.id,
      name: d.name,
      code: d.code ?? null,
      programmes: (progs ?? [])
        .filter((p) => p.department_id === d.id)
        .map((p) => ({ id: p.id, name: p.name, code: p.code ?? null })),
    });
  }

  // Sort faculties in canonical order
  const faculties: FacultyOption[] = [
    ...FACULTY_ORDER.map((f) => facultyMap.get(f)).filter(Boolean) as FacultyOption[],
    ...Array.from(facultyMap.values()).filter((f) => !FACULTY_ORDER.includes(f.name)),
  ];

  return <RegisterForm faculties={faculties} />;
}
