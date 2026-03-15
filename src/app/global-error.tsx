"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <div className="text-5xl">&#9888;&#65039;</div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">
            Critical Error
          </h1>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            The application encountered a critical error. Please try refreshing
            the page.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-slate-400">
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
