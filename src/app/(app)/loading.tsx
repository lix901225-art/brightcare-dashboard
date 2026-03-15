export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title skeleton */}
      <div>
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="mt-2 h-4 w-72 rounded-lg bg-slate-100" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-9 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 h-5 w-24 rounded bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-1/4 rounded bg-slate-100" />
              <div className="h-4 w-1/4 rounded bg-slate-100" />
              <div className="h-4 w-1/6 rounded bg-slate-100" />
              <div className="h-4 w-1/6 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
