"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <WifiOff className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-slate-500">
          It looks like you&apos;ve lost your internet connection. Some features may
          still be available from cached data.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
