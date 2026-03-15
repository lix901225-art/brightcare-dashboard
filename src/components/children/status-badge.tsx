export default function StatusBadge({
  status,
}: {
  status: "ACTIVE" | "PENDING_DOCS" | "WAITLIST";
}) {
  const styles =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "PENDING_DOCS"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  const label =
    status === "ACTIVE"
      ? "Active"
      : status === "PENDING_DOCS"
      ? "Pending Docs"
      : "Waitlist";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}
