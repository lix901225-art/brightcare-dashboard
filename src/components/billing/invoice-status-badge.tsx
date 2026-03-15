export default function InvoiceStatusBadge({
  status,
}: {
  status: "PAID" | "DUE" | "OVERDUE" | "PARTIAL";
}) {
  const styles =
    status === "PAID"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "DUE"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : status === "PARTIAL"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      {status === "PAID" ? "Paid" : status === "DUE" ? "Due" : status === "PARTIAL" ? "Partial" : "Overdue"}
    </span>
  );
}
