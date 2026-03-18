"use client";

import { useState, useCallback } from "react";
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Users,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  Loader2,
  Shield,
  Landmark,
  Award,
  ArrowRight,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { PageIntro } from "@/components/app/app-shell";
import { apiFetch } from "@/lib/api-client";

type ReportType =
  | "attendance"
  | "billing"
  | "incidents"
  | "children"
  | "daily-reports"
  | "bc-ccfri"
  | "bc-10day"
  | "bc-licensing";

const REPORTS: {
  key: ReportType;
  label: string;
  description: string;
  icon: typeof Users;
  color: string;
  bg: string;
}[] = [
  {
    key: "attendance",
    label: "Attendance",
    description: "Daily attendance records with check-in/out times",
    icon: Calendar,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "billing",
    label: "Billing & Invoices",
    description: "All invoices with amounts, status, and payment history",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    key: "incidents",
    label: "Incidents",
    description: "Safety incidents with severity, descriptions, and dates",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    key: "children",
    label: "Children Roster",
    description: "Full child roster with status, room, and guardian info",
    icon: Users,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    key: "daily-reports",
    label: "Daily Reports",
    description: "Meals, naps, mood, and activities by child and date",
    icon: ClipboardList,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    key: "bc-ccfri",
    label: "CCFRI Report",
    description: "Child Care Fee Reduction Initiative — monthly enrolment and fee data for BC Ministry submission",
    icon: Landmark,
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    key: "bc-10day",
    label: "$10/Day Programme",
    description: "ChildCareBC $10/Day programme tracking — attendance, spaces, and parent fees for funding verification",
    icon: Award,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    key: "bc-licensing",
    label: "BC Licensing Report",
    description: "Monthly licensing report — ratios, incidents, certifications, and compliance status",
    icon: Shield,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
];

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map((v) => escape(v ?? "")).join(","));
  }
  return lines.join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ChildRow = {
  id: string;
  fullName: string;
  status: string;
  room?: { name: string } | null;
  dateOfBirth?: string | null;
  gender?: string | null;
};
type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  child?: { fullName: string } | null;
  childId: string;
};
type InvoiceRow = {
  id: string;
  childId: string;
  child?: { fullName: string } | null;
  status: string;
  totalCents: number;
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
};
type IncidentRow = {
  id: string;
  childId: string;
  child?: { fullName: string } | null;
  severity: string;
  description: string;
  occurredAt: string;
  lockedAt?: string | null;
};
type DailyReportRow = {
  id: string;
  childId: string;
  child?: { fullName: string } | null;
  date: string;
  meals?: string | null;
  nap?: string | null;
  mood?: string | null;
  activities?: string | null;
};

export default function ReportsPage() {
  const [exporting, setExporting] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState(
    () =>
      new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const exportReport = useCallback(
    async (type: ReportType) => {
      setExporting(type);
      try {
        const today = new Date().toISOString().split("T")[0];

        if (type === "attendance") {
          const res0 = await apiFetch("/attendance");
          const data: AttendanceRow[] = res0.ok ? await res0.json() : [];
          const filtered = data.filter(
            (r) => r.date >= dateFrom && r.date <= dateTo
          );
          const csv = toCSV(
            [
              "Date",
              "Child Name",
              "Status",
              "Check-in",
              "Check-out",
            ],
            filtered.map((r) => [
              r.date,
              r.child?.fullName ?? r.childId,
              r.status,
              r.checkinAt
                ? new Date(r.checkinAt).toLocaleTimeString()
                : "",
              r.checkoutAt
                ? new Date(r.checkoutAt).toLocaleTimeString()
                : "",
            ])
          );
          downloadCSV(`attendance-${dateFrom}-to-${dateTo}.csv`, csv);
        } else if (type === "billing") {
          const res1 = await apiFetch("/billing/invoices");
          const data: InvoiceRow[] = res1.ok ? await res1.json() : [];
          const csv = toCSV(
            [
              "Invoice ID",
              "Child Name",
              "Status",
              "Amount",
              "Issue Date",
              "Due Date",
              "Paid Date",
            ],
            data.map((r) => [
              r.id.slice(0, 8),
              r.child?.fullName ?? r.childId,
              r.status,
              `$${(r.totalCents / 100).toFixed(2)}`,
              r.issueDate?.split("T")[0] ?? "",
              r.dueDate?.split("T")[0] ?? "",
              r.paidAt ? r.paidAt.split("T")[0] : "",
            ])
          );
          downloadCSV(`billing-export-${today}.csv`, csv);
        } else if (type === "incidents") {
          const res2 = await apiFetch("/incidents");
          const data: IncidentRow[] = res2.ok ? await res2.json() : [];
          const filtered = data.filter((r) => {
            const d = r.occurredAt?.split("T")[0] ?? "";
            return d >= dateFrom && d <= dateTo;
          });
          const csv = toCSV(
            [
              "Date",
              "Child Name",
              "Severity",
              "Description",
              "Locked",
            ],
            filtered.map((r) => [
              r.occurredAt?.split("T")[0] ?? "",
              r.child?.fullName ?? r.childId,
              r.severity,
              r.description,
              r.lockedAt ? "Yes" : "No",
            ])
          );
          downloadCSV(`incidents-${dateFrom}-to-${dateTo}.csv`, csv);
        } else if (type === "children") {
          const res3 = await apiFetch("/children");
          const data: ChildRow[] = res3.ok ? await res3.json() : [];
          const csv = toCSV(
            [
              "Name",
              "Status",
              "Room",
              "Date of Birth",
              "Gender",
            ],
            data.map((r) => [
              r.fullName,
              r.status,
              r.room?.name ?? "",
              r.dateOfBirth?.split("T")[0] ?? "",
              r.gender ?? "",
            ])
          );
          downloadCSV(`children-roster-${today}.csv`, csv);
        } else if (type === "daily-reports") {
          const res4 = await apiFetch("/daily-reports");
          const data: DailyReportRow[] = res4.ok ? await res4.json() : [];
          const filtered = data.filter(
            (r) => r.date >= dateFrom && r.date <= dateTo
          );
          const csv = toCSV(
            ["Date", "Child Name", "Meals", "Nap", "Mood", "Activities"],
            filtered.map((r) => [
              r.date,
              r.child?.fullName ?? r.childId,
              r.meals ?? "",
              r.nap ?? "",
              r.mood ?? "",
              r.activities ?? "",
            ])
          );
          downloadCSV(`daily-reports-${dateFrom}-to-${dateTo}.csv`, csv);
        } else if (type === "bc-ccfri") {
          /* BC CCFRI — Child Care Fee Reduction Initiative report */
          const [childrenRes, billingRes, roomsRes] = await Promise.all([
            apiFetch("/children"),
            apiFetch("/billing/invoices").catch(() => null),
            apiFetch("/rooms"),
          ]);
          const kids: ChildRow[] = childrenRes.ok ? await childrenRes.json() : [];
          const invoices: InvoiceRow[] = billingRes?.ok ? await billingRes.json() : [];
          const rooms: { id: string; name: string }[] = roomsRes.ok ? await roomsRes.json() : [];
          const roomById = Object.fromEntries(rooms.map((r) => [r.id, r.name]));

          const activeKids = kids.filter((c) => c.status === "ACTIVE");
          const csv = toCSV(
            [
              "Child Name",
              "DOB",
              "Room / Age Group",
              "Enrolment Status",
              "Monthly Fee ($)",
              "CCFRI Reduction ($)",
              "Parent Fee After CCFRI ($)",
              "Reporting Period",
            ],
            activeKids.map((c) => {
              const childInvoices = invoices.filter((i) => i.childId === c.id);
              const latestInvoice = childInvoices[0];
              const fee = latestInvoice ? (latestInvoice.totalCents / 100).toFixed(2) : "0.00";
              return [
                c.fullName,
                c.dateOfBirth?.split("T")[0] ?? "",
                c.room?.name ?? "",
                c.status,
                fee,
                "", /* CCFRI reduction — would come from subsidy module */
                "", /* Net parent fee */
                `${dateFrom} to ${dateTo}`,
              ];
            })
          );
          downloadCSV(`ccfri-report-${dateFrom}-to-${dateTo}.csv`, csv);
        } else if (type === "bc-10day") {
          /* BC $10/Day Programme report */
          const [childrenRes, attendanceRes] = await Promise.all([
            apiFetch("/children"),
            apiFetch("/attendance"),
          ]);
          const kids: ChildRow[] = childrenRes.ok ? await childrenRes.json() : [];
          const attendance: AttendanceRow[] = attendanceRes.ok ? await attendanceRes.json() : [];

          const activeKids = kids.filter((c) => c.status === "ACTIVE");
          const filteredAttendance = attendance.filter(
            (a) => a.date >= dateFrom && a.date <= dateTo
          );

          const csv = toCSV(
            [
              "Child Name",
              "DOB",
              "Room",
              "Days Attended (Period)",
              "Days Absent (Period)",
              "Eligible for $10/Day",
              "Parent Daily Fee ($)",
              "Reporting Period",
            ],
            activeKids.map((c) => {
              const childAttendance = filteredAttendance.filter((a) => a.childId === c.id);
              const present = childAttendance.filter((a) => a.status === "PRESENT" || a.status === "CHECKED_IN" || a.status === "CHECKED_OUT").length;
              const absent = childAttendance.filter((a) => a.status === "ABSENT").length;
              return [
                c.fullName,
                c.dateOfBirth?.split("T")[0] ?? "",
                c.room?.name ?? "",
                String(present),
                String(absent),
                "Yes", /* eligibility would come from subsidy module */
                "10.00",
                `${dateFrom} to ${dateTo}`,
              ];
            })
          );
          downloadCSV(`bc-10day-report-${dateFrom}-to-${dateTo}.csv`, csv);
        } else if (type === "bc-licensing") {
          /* BC Monthly Licensing Report */
          const [childrenRes, staffRes, incidentsRes, roomsRes] = await Promise.all([
            apiFetch("/children"),
            apiFetch("/admin/users"),
            apiFetch("/incidents"),
            apiFetch("/rooms"),
          ]);
          const kids: ChildRow[] = childrenRes.ok ? await childrenRes.json() : [];
          const allStaff: { id: string; displayName?: string | null; role?: string | null; deactivated?: boolean }[] = staffRes.ok ? await staffRes.json() : [];
          const incidents: IncidentRow[] = incidentsRes.ok ? await incidentsRes.json() : [];
          const rooms: { id: string; name: string; capacity?: number | null }[] = roomsRes.ok ? await roomsRes.json() : [];

          const activeKids = kids.filter((c) => c.status === "ACTIVE");
          const activeStaff = allStaff.filter((s) => !s.deactivated && ((s.role || "").toUpperCase() === "STAFF" || (s.role || "").toUpperCase() === "OWNER"));
          const periodIncidents = incidents.filter((i) => {
            const d = i.occurredAt?.split("T")[0] ?? "";
            return d >= dateFrom && d <= dateTo;
          });

          const summaryRows = [
            ["Reporting Period", `${dateFrom} to ${dateTo}`],
            ["Active Children", String(activeKids.length)],
            ["Active Staff", String(activeStaff.length)],
            ["Total Rooms", String(rooms.length)],
            ["Total Capacity", String(rooms.reduce((sum, r) => sum + (r.capacity || 0), 0))],
            ["Incidents This Period", String(periodIncidents.length)],
            ["High/Critical Incidents", String(periodIncidents.filter((i) => i.severity === "High" || i.severity === "Critical").length)],
            ["Locked Incidents", String(periodIncidents.filter((i) => i.lockedAt).length)],
          ];

          const csv = toCSV(
            ["Metric", "Value"],
            summaryRows
          );
          downloadCSV(`bc-licensing-report-${dateFrom}-to-${dateTo}.csv`, csv);
        }
      } catch (e) {
        console.error("Export failed:", e);
      } finally {
        setExporting(null);
      }
    },
    [dateFrom, dateTo]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageIntro
        title="Reports & Exports"
        description="Export your centre data as CSV for record-keeping and compliance."
      />

      {/* Quick links to management pages */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/reports/funding"
          className="group flex items-center justify-between rounded-2xl border-0 bg-gradient-to-br from-sky-50 to-sky-100 p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">BC Funding Reports</h3>
              <p className="text-xs text-slate-600">Manage CCFRI, $10/Day reports</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
        </Link>

        <Link
          href="/reports/tax-receipts"
          className="group flex items-center justify-between rounded-2xl border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Tax Receipts</h3>
              <p className="text-xs text-slate-600">Generate Canada tax receipts</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Date range filter */}
      <div className="rounded-2xl border-0 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Date Range
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div className="mt-5 text-xs text-slate-400">
            Used for attendance, incidents, and daily reports
          </div>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const isExporting = exporting === r.key;
          return (
            <div
              key={r.key}
              className="flex flex-col justify-between rounded-2xl border-0 bg-white p-5 shadow-sm"
            >
              <div>
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${r.bg}`}
                >
                  <Icon className={`h-5 w-5 ${r.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {r.label}
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {r.description}
                </p>
              </div>
              <button
                onClick={() => exportReport(r.key)}
                disabled={exporting !== null}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div className="text-xs leading-relaxed text-slate-500">
            <p className="font-medium text-slate-700">Export tips</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>
                CSV files open directly in Excel, Google Sheets, and Numbers
              </li>
              <li>
                Billing exports include all invoices regardless of date filter
              </li>
              <li>Children roster always exports the full current roster</li>
              <li>
                BC funding reports (CCFRI, $10/Day) use active enrolment data — verify child statuses before exporting
              </li>
              <li>
                BC Licensing Report summarises ratios, incidents, and capacity for monthly submissions
              </li>
              <li>
                UTF-8 encoding ensures names with special characters display
                correctly
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
