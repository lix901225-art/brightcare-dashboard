import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-slate-900">Unauthorized</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your membership or role does not allow access to this area.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
