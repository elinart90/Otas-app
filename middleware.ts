import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  canAccess,
  canAccessAsRestrictedStudent,
  isValidRole,
  ROLE_HOME,
  RESTRICTED_STUDENT_HOME,
  type UserRole,
} from '@/lib/rbac/permissions';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/') && !pathname.startsWith('/api/auth');
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/unauthorized') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/browse') ||             // public archive browse
    pathname.startsWith('/api/archive/public');   // public archive API

  // Not authenticated
  if (!user) {
    if (isPublic) return response;
    if (isApi) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated -> determine role.
  // Source of truth: public.users.role. We cache it in user_metadata for speed.
  let role: UserRole | null = null;
  const metaRole = user.user_metadata?.role;
  if (isValidRole(metaRole)) {
    role = metaRole;
  } else {
    // Fallback: read from public.users
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile && isValidRole(profile.role)) role = profile.role;
  }

  // Determine if a student is final-year (stored in metadata at registration).
  // Non-final-year students (levels 100-300) get a restricted route set.
  // If metadata doesn't have is_final_year yet (pre-migration accounts), fall back to DB.
  let isRestrictedStudent = false;
  if (role === 'student') {
    const metaFinalYear = user.user_metadata?.is_final_year;
    if (typeof metaFinalYear === 'boolean') {
      isRestrictedStudent = !metaFinalYear;
    } else {
      // DB fallback for accounts created before migration 015
      const { data: studentProfile } = await supabase
        .from('users')
        .select('is_final_year')
        .eq('id', user.id)
        .single();
      isRestrictedStudent = studentProfile?.is_final_year === false;
    }
  }

  const effectiveHome =
    isRestrictedStudent ? RESTRICTED_STUDENT_HOME : (role ? ROLE_HOME[role] : '/');

  // If logged in but visiting login/register, send to their dashboard
  if (role && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL(effectiveHome, request.url));
  }

  // Authenticated but no profile yet -> force them to complete registration
  if (!role && !pathname.startsWith('/register')) {
    if (isApi) {
      return NextResponse.json(
        { ok: false, error: 'Profile not configured' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/register/complete', request.url));
  }

  // Authorization check (page routes only — API routes self-enforce)
  if (role) {
    const allowed = isRestrictedStudent
      ? canAccessAsRestrictedStudent(pathname)
      : canAccess(role, pathname);

    if (!allowed) {
      if (isApi) {
        return NextResponse.json(
          { ok: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(
        new URL(isRestrictedStudent ? RESTRICTED_STUDENT_HOME : '/unauthorized', request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static files in /public and Next.js internals.
    // The pattern `.*\\..*` excludes any path with a file extension (e.g.
    // /pdf.worker.min.mjs, /robots.txt, /sitemap.xml) — those are served
    // statically and should bypass auth/role gating.
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};