"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        An unexpected error occurred. This has been logged. You can try again or
        return to the dashboard.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
    </main>
  );
}
