"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
        <AlertTriangle className="h-7 w-7 text-rose-500" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-slate-900">
        Page error
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        This page encountered an error. Your data is safe. Try refreshing or go
        back.
      </p>
      {error.message && (
        <p className="mt-2 max-w-md rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600">
          {error.message.slice(0, 200)}
        </p>
      )}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
