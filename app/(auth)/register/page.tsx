import { createAdminClient } from '@/lib/supabase/admin';
import { RegisterForm, type DepartmentOption } from './register-form';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const admin = createAdminClient();

  const [{ data: depts }, { data: progs }] = await Promise.all([
    admin.from('departments').select('id, name, code').order('name'),
    admin.from('programmes').select('id, name, code, department_id').order('name'),
  ]);

  const departments: DepartmentOption[] = (depts ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code ?? null,
    programmes: (progs ?? [])
      .filter((p) => p.department_id === d.id)
      .map((p) => ({ id: p.id, name: p.name, code: p.code ?? null })),
  }));

  return <RegisterForm departments={departments} />;
}
