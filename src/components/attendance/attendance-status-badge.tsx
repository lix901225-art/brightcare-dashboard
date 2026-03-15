export default function AttendanceStatusBadge({
  status,
}: {
  status: "PRESENT" | "ABSENT" | "LATE_PICKUP" | "CHECKED_OUT";
}) {
  const styles =
    status === "PRESENT"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "ABSENT"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : status === "LATE_PICKUP"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-sky-50 text-sky-700 border-sky-200";

  const label =
    status === "PRESENT"
      ? "Present"
      : status === "ABSENT"
      ? "Absent"
      : status === "LATE_PICKUP"
      ? "Late Pickup"
      : "Checked Out";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}
