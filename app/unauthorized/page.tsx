import Link from 'next/link';

export default function Unauthorized() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-semibold">403 — Not authorised</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Your account role does not have permission to view this page.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Return home
      </Link>
    </main>
  );
}
