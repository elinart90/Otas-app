import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';
import {
  Monitor, Zap, HardHat, Globe, BarChart3, Flame,
  type LucideIcon,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ── Faculty configuration ────────────────────────────────────
type FacultyConfig = {
  short: string;
  icon: LucideIcon;
  /** Tailwind classes for the left-border accent */
  border: string;
  /** Icon container background + text */
  iconStyle: string;
  /** Header label colour */
  labelStyle: string;
};

const FACULTY_CONFIG: Record<string, FacultyConfig> = {
  'Faculty of Computing and Mathematical Sciences': {
    short: 'FCMS', icon: Monitor,
    border: 'border-l-info',
    iconStyle: 'bg-info/10 text-info',
    labelStyle: 'text-info',
  },
  'Faculty of Engineering': {
    short: 'FoE', icon: Zap,
    border: 'border-l-warning',
    iconStyle: 'bg-warning/15 text-warning-foreground',
    labelStyle: 'text-warning-foreground',
  },
  'Faculty of Mining and Minerals Technology': {
    short: 'FMMT', icon: HardHat,
    border: 'border-l-destructive',
    iconStyle: 'bg-destructive/10 text-destructive',
    labelStyle: 'text-destructive',
  },
  'Faculty of Geosciences and Environmental Studies': {
    short: 'FGES', icon: Globe,
    border: 'border-l-success',
    iconStyle: 'bg-success/10 text-success',
    labelStyle: 'text-success',
  },
  'Faculty of Integrated Management Science': {
    short: 'FIMS', icon: BarChart3,
    border: 'border-l-primary',
    iconStyle: 'bg-primary-muted text-primary',
    labelStyle: 'text-primary',
  },
  'School of Petroleum Studies': {
    short: 'SPS', icon: Flame,
    border: 'border-l-warning',
    iconStyle: 'bg-warning/15 text-warning-foreground',
    labelStyle: 'text-warning-foreground',
  },
};

const FALLBACK_CONFIG: FacultyConfig = {
  short: '—', icon: Monitor,
  border: 'border-l-border',
  iconStyle: 'bg-secondary text-muted-foreground',
  labelStyle: 'text-muted-foreground',
};

// Canonical display order
const FACULTY_ORDER = [
  'Faculty of Computing and Mathematical Sciences',
  'Faculty of Engineering',
  'Faculty of Mining and Minerals Technology',
  'Faculty of Geosciences and Environmental Studies',
  'Faculty of Integrated Management Science',
  'School of Petroleum Studies',
];

// ── Types ────────────────────────────────────────────────────
type ProgrammeRow = { id: string; name: string; code: string | null };
type DepartmentRow = {
  id: string; name: string; code: string | null;
  description: string | null; programmes: ProgrammeRow[];
};
type FacultyGroup = { faculty: string; departments: DepartmentRow[] };

export default async function AdminDepartmentsPage() {
  const supabase = createClient();

  const [
    { data: departments, error: deptErr },
    { data: programmes,  error: progErr  },
  ] = await Promise.all([
    supabase.from('departments').select('id, name, code, description').order('name'),
    supabase.from('programmes').select('id, name, code, department_id').order('name'),
  ]);

  if (deptErr || progErr) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {deptErr?.message ?? progErr?.message}
      </div>
    );
  }

  const deptRows = (departments ?? []) as Array<{
    id: string; name: string; code: string | null; description: string | null;
  }>;
  const progRows = (programmes ?? []) as Array<{
    id: string; name: string; code: string | null; department_id: string;
  }>;

  const deptWithProgs: DepartmentRow[] = deptRows.map((d) => ({
    ...d,
    programmes: progRows.filter((p) => p.department_id === d.id),
  }));

  // Group by faculty (description field)
  const facultyMap = new Map<string, DepartmentRow[]>();
  for (const dept of deptWithProgs) {
    const faculty = dept.description ?? 'Other';
    if (!facultyMap.has(faculty)) facultyMap.set(faculty, []);
    facultyMap.get(faculty)!.push(dept);
  }

  const facultyGroups: FacultyGroup[] = [];
  for (const f of FACULTY_ORDER) {
    const depts = facultyMap.get(f);
    if (depts) facultyGroups.push({ faculty: f, departments: depts });
  }
  for (const [f, depts] of facultyMap) {
    if (!FACULTY_ORDER.includes(f)) facultyGroups.push({ faculty: f, departments: depts });
  }

  const unassigned = progRows.filter(
    (p) => !deptRows.some((d) => d.id === p.department_id)
  );

  const totalProgs = progRows.length;

  return (
    <>
      <PageHeader
        title="Departments & programmes"
        subtitle={`${deptRows.length} departments · ${totalProgs} programmes · ${facultyGroups.length} faculties / schools`}
      />

      {deptWithProgs.length === 0 ? (
        <EmptyCard
          title="No departments configured"
          body="Run migration 013 in the Supabase SQL Editor to load the full UMaT department catalogue."
        />
      ) : (
        <div className="space-y-10">
          {facultyGroups.map((group) => {
            const cfg = FACULTY_CONFIG[group.faculty] ?? FALLBACK_CONFIG;
            const FacultyIcon = cfg.icon;
            const totalDeptProgs = group.departments.reduce(
              (acc, d) => acc + d.programmes.length, 0
            );

            return (
              <section key={group.faculty}>
                {/* ── Faculty header ── */}
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.iconStyle}`}
                    aria-hidden
                  >
                    <FacultyIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h2 className={`text-sm font-bold ${cfg.labelStyle}`}>
                        {group.faculty}
                      </h2>
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        {cfg.short}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {group.departments.length} department{group.departments.length !== 1 ? 's' : ''} · {totalDeptProgs} programme{totalDeptProgs !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>

                {/* ── Department cards ── */}
                <div className="space-y-3 pl-11">
                  {group.departments.map((dept) => (
                    <div
                      key={dept.id}
                      className={`rounded-xl border-l-4 border border-border bg-card p-5 shadow-card transition-shadow duration-150 hover:shadow-elevated ${cfg.border}`}
                    >
                      {/* Dept header row */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {dept.name}
                          </p>
                          {dept.code && (
                            <span className="mt-1 inline-block rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                              {dept.code}
                            </span>
                          )}
                        </div>
                        <span className={`pill shrink-0 ${dept.programmes.length ? 'pill-primary' : 'pill-muted'}`}>
                          {dept.programmes.length} prog{dept.programmes.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Programme chips */}
                      {dept.programmes.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {dept.programmes.map((prog) => (
                            <div
                              key={prog.id}
                              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1"
                            >
                              <span className="text-xs font-medium text-foreground">
                                {prog.name}
                              </span>
                              {prog.code && (
                                <span className="rounded border border-border bg-secondary px-1.5 py-px font-mono text-[9px] font-semibold text-muted-foreground">
                                  {prog.code}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground italic">
                          No programmes assigned to this department yet.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Unassigned programmes */}
          {unassigned.length > 0 && (
            <section className="rounded-xl border border-warning/30 bg-warning/5 p-5">
              <h2 className="text-sm font-semibold text-foreground">
                Unassigned programmes ({unassigned.length})
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {unassigned.map((p) => (
                  <span key={p.id} className="pill pill-warning">
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
