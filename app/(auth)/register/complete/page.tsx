import Link from 'next/link';

export default function RegisterComplete() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Profile not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your account exists but no profile is linked to it. This usually means
        registration was interrupted. Contact an administrator, or sign out and
        register again.
      </p>
      <div className="mt-6 flex gap-3">
        <form action="/api/auth/logout" method="post">
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Sign out
          </button>
        </form>
        <Link
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
