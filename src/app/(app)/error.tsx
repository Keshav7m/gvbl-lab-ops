"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel mx-auto mt-10 max-w-lg p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
      <h1 className="mt-3 text-lg font-semibold">This page could not be loaded</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {/prisma|database|connect/i.test(error.message)
          ? "The database is not reachable right now. No data has been lost — try again in a moment."
          : "An unexpected error occurred. No data has been changed."}
      </p>
      {error.digest && <p className="mt-2 text-xs text-ink-faint">Reference: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
