import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="panel max-w-md p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">404</p>
        <h1 className="mt-2 text-xl font-semibold">Page or report not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The record may have been removed, or you may not have permission to view it.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-semibold text-violet-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
