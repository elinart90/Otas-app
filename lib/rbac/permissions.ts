export type UserRole = 'student' | 'supervisor' | 'panel' | 'hod' | 'admin';

/**
 * Map of role -> list of route prefixes the role can access.
 * Admin gets access to everything.
 */
const ROLE_ROUTES: Record<UserRole, string[]> = {
  student: ['/student'],
  supervisor: ['/supervisor'],
  panel: ['/panel'],
  hod: ['/hod', '/supervisor'], // HoDs can also see supervisor views
  admin: ['/admin', '/hod', '/supervisor', '/panel', '/student'], // Admin sees all
};

/**
 * Route prefixes accessible to non-final-year students (levels 100-300).
 * They can use tools but cannot access the full project workflow.
 */
const RESTRICTED_STUDENT_ROUTES = ['/student/tools'];

/**
 * Default landing page for each role after successful login.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  student: '/student',
  supervisor: '/supervisor',
  panel: '/panel',
  hod: '/hod',
  admin: '/admin',
};

/** Home for non-final-year students. */
export const RESTRICTED_STUDENT_HOME = '/student/tools';

/**
 * Returns true if a non-final-year student can access the given path.
 */
export function canAccessAsRestrictedStudent(pathname: string): boolean {
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/unauthorized') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/archive/') ||
    pathname.startsWith('/profile')
  ) {
    return true;
  }
  return RESTRICTED_STUDENT_ROUTES.some((prefix) => pathname.startsWith(prefix));
}

export function canAccess(role: UserRole | null, pathname: string): boolean {
  // Public routes
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/unauthorized') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth')
  ) {
    return true;
  }

  if (!role) return false;

  // API routes: pass the path-prefix check; route handlers enforce auth/RBAC.
  if (pathname.startsWith('/api/')) return true;

  // Shared cross-role read-only pages (archive viewer)
  if (pathname.startsWith('/archive/')) return true;

  // Shared profile and settings page accessible to all authenticated users
  if (pathname.startsWith('/profile')) return true;

  const allowed = ROLE_ROUTES[role] ?? [];
  return allowed.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Validates the role enum value coming from user metadata or DB.
 */
export function isValidRole(value: unknown): value is UserRole {
  return (
    value === 'student' ||
    value === 'supervisor' ||
    value === 'panel' ||
    value === 'hod' ||
    value === 'admin'
  );
}
