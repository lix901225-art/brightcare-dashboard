"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Check,
} from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { PageLoadingSkeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/error";

/* ─── types ─── */

type Child = {
  id: string;
  fullName?: string | null;
  status?: string | null;
  dob?: string | null;
  roomId?: string | null;
  startDate?: string | null;
};
type Room = { id: string; name: string; capacity?: number | null };
type AttendanceRow = {
  id: string;
  childId: string;
  date: string;
  status: string;
};
type InvoiceRow = {
  id: string;
  childId: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  issueDate?: string | null;
};
type IncidentRow = {
  id: string;
  severity: string;
  occurredAt: string;
};

/* ─── page ─── */

export default function AnalyticsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [satisfaction, setSatisfaction] = useState<{ avg: number | null; count: number }>({ avg: null, count: 0 });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [childrenRes, roomsRes, attendanceRes, invoicesRes, incidentsRes] =
          await Promise.all([
            apiFetch("/children"),
            apiFetch("/rooms"),
            apiFetch("/attendance"),
            apiFetch("/billing/invoices").catch(() => null),
            apiFetch("/incidents").catch(() => null),
          ]);

        setChildren(childrenRes.ok ? await childrenRes.json() : []);
        setRooms(roomsRes.ok ? await roomsRes.json() : []);
        setAttendance(attendanceRes.ok ? await attendanceRes.json() : []);
        setInvoices(invoicesRes?.ok ? await invoicesRes.json() : []);
        setIncidents(incidentsRes?.ok ? await incidentsRes.json() : []);

        // Load survey satisfaction
        try {
          const templatesRes = await apiFetch("/surveys/templates?activeOnly=true");
          if (templatesRes.ok) {
            const templates = await templatesRes.json();
            if (Array.isArray(templates) && templates.length > 0) {
              const summaryRes = await apiFetch(`/surveys/templates/${templates[0].id}/summary`);
              if (summaryRes.ok) {
                const summary = await summaryRes.json();
                setSatisfaction({ avg: summary.averageRating, count: summary.totalResponses });
              }
            }
          }
        } catch { /* non-critical */ }
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Unable to load analytics data."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ─── Enrolment metrics ─── */
  const enrolment = useMemo(() => {
    const active = children.filter((c) => c.status === "ACTIVE").length;
    const waitlist = children.filter((c) => c.status === "WAITLIST").length;
    const withdrawn = children.filter((c) => c.status === "WITHDRAWN").length;
    const totalCapacity = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
    const occupancyPct = totalCapacity > 0 ? Math.round((active / totalCapacity) * 100) : 0;

    return { active, waitlist, withdrawn, totalCapacity, occupancyPct };
  }, [children, rooms]);

  /* ─── Room occupancy breakdown ─── */
  const roomOccupancy = useMemo(() => {
    const childrenByRoom: Record<string, number> = {};
    for (const c of children.filter((c) => c.status === "ACTIVE")) {
      if (c.roomId) {
        childrenByRoom[c.roomId] = (childrenByRoom[c.roomId] || 0) + 1;
      }
    }
    return rooms.map((room) => {
      const count = childrenByRoom[room.id] || 0;
      const capacity = room.capacity || 0;
      const pct = capacity > 0 ? Math.round((count / capacity) * 100) : 0;
      return { ...room, count, pct };
    });
  }, [children, rooms]);

  /* ─── Attendance trends (last 14 days) ─── */
  const attendanceTrend = useMemo(() => {
    const today = new Date();
    const days: { date: string; present: number; absent: number; total: number }[] = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayAttendance = attendance.filter((a) => a.date === dateStr);
      const present = dayAttendance.filter(
        (a) =>
          a.status === "PRESENT" ||
          a.status === "CHECKED_IN" ||
          a.status === "CHECKED_OUT"
      ).length;
      const absent = dayAttendance.filter((a) => a.status === "ABSENT").length;

      days.push({ date: dateStr, present, absent, total: present + absent });
    }
    return days;
  }, [attendance]);

  /* ─── Revenue metrics ─── */
  const revenue = useMemo(() => {
    const paidInvoices = invoices.filter(
      (i) => i.status.toUpperCase() === "PAID"
    );
    const totalRevenue = paidInvoices.reduce(
      (s, i) => s + Number(i.paidAmount || 0),
      0
    );
    const outstandingBalance = invoices
      .filter(
        (i) =>
          i.status.toUpperCase() !== "VOID" &&
          i.status.toUpperCase() !== "PAID"
      )
      .reduce((s, i) => s + Number(i.balanceAmount || 0), 0);
    const overdueCount = invoices.filter((i) => {
      if (i.status.toUpperCase() === "PAID" || i.status.toUpperCase() === "VOID")
        return false;
      if (!i.issueDate) return false;
      return (
        i.balanceAmount > 0 &&
        i.issueDate.slice(0, 10) <
          new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
      );
    }).length;

    return { totalRevenue, outstandingBalance, overdueCount, invoiceCount: invoices.length };
  }, [invoices]);

  /* ─── Incident trends (last 6 months) ─── */
  const incidentTrend = useMemo(() => {
    const months: { label: string; count: number; highSeverity: number }[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
      const label = d.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
      const monthIncidents = incidents.filter(
        (inc) => inc.occurredAt.slice(0, 7) === monthStr
      );
      months.push({
        label,
        count: monthIncidents.length,
        highSeverity: monthIncidents.filter(
          (inc) =>
            inc.severity === "High" || inc.severity === "Critical"
        ).length,
      });
    }
    return months;
  }, [incidents]);

  /* ─── Occupancy forecasting ─── */
  const forecast = useMemo(() => {
    const activeChildren = children.filter((c) => c.status === "ACTIVE");
    const totalCapacity = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
    const waitlistCount = children.filter((c) => c.status === "WAITLIST").length;

    /* Simple projection based on waitlist conversion rate */
    const avgMonthlyEnrolment = Math.max(1, Math.round(waitlistCount * 0.15));
    const spotsAvailable = Math.max(0, totalCapacity - activeChildren.length);
    const monthsToFull =
      spotsAvailable > 0 && avgMonthlyEnrolment > 0
        ? Math.ceil(spotsAvailable / avgMonthlyEnrolment)
        : 0;

    return {
      currentOccupancy: activeChildren.length,
      totalCapacity,
      spotsAvailable,
      waitlistCount,
      monthsToFull,
      projectedFullDate:
        monthsToFull > 0
          ? (() => {
              const d = new Date();
              d.setMonth(d.getMonth() + monthsToFull);
              return d.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
            })()
          : "At capacity",
    };
  }, [children, rooms]);

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  const maxAttendance = Math.max(1, ...attendanceTrend.map((d) => d.total));

  function exportCsv() {
    const rows: string[][] = [
      ["BrightCare OS — Monthly Report"],
      [],
      ["Metric", "Value"],
      ["Total children enrolled", String(children.filter((c) => (c.status || "").toUpperCase() === "ACTIVE").length)],
      ["Total rooms", String(rooms.length)],
      ["Total capacity", String(rooms.reduce((s, r) => s + (r.capacity || 0), 0))],
      ["Occupancy %", enrolment.occupancyPct + "%"],
      [],
      ["Revenue", "Amount"],
      ["Total revenue (paid)", "$" + revenue.totalRevenue.toFixed(2)],
      ["Outstanding balance", "$" + revenue.outstandingBalance.toFixed(2)],
      ["Overdue invoices", String(revenue.overdueCount)],
      [],
      ["Attendance (last 14 days)", "Date", "Present", "Absent", "Total"],
      ...attendanceTrend.map((d) => ["", d.date, String(d.present), String(d.absent), String(d.total)]),
      [],
      ["Room Occupancy", "Room", "Enrolled", "Capacity", "Occupancy %"],
      ...rooms.map((r) => {
        const enrolled = children.filter((c) => c.roomId === r.id && (c.status || "").toUpperCase() === "ACTIVE").length;
        const cap = r.capacity || 0;
        return ["", r.name, String(enrolled), String(cap), cap > 0 ? Math.round((enrolled / cap) * 100) + "%" : "N/A"];
      }),
    ];

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brightcare-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Analytics & Forecasting"
            description="Enrolment trends, occupancy projections, attendance patterns, and financial overview."
          />
          <button
            onClick={exportCsv}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* ─── Key metrics ─── */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Occupancy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {enrolment.occupancyPct}%
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {enrolment.active} / {enrolment.totalCapacity} spaces
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Waitlist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{enrolment.waitlist}</div>
              <div className="mt-1 text-xs text-slate-500">
                {forecast.spotsAvailable} spots available
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Revenue (paid)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                ${revenue.totalRevenue.toFixed(0)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {revenue.invoiceCount} invoices
              </div>
            </CardContent>
          </Card>
          <Card className={`rounded-2xl border-0 shadow-sm ${revenue.outstandingBalance > 0 ? "ring-1 ring-amber-200" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className={revenue.outstandingBalance > 0 ? "text-sm text-amber-600" : "text-sm text-slate-500"}>
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-semibold ${revenue.outstandingBalance > 0 ? "text-amber-700" : ""}`}>
                ${revenue.outstandingBalance.toFixed(0)}
              </div>
              {revenue.overdueCount > 0 ? (
                <div className="mt-1 text-xs text-rose-600">
                  {revenue.overdueCount} overdue
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* ─── Occupancy forecast ─── */}
        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Occupancy Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 text-sm font-medium text-slate-700">Current occupancy</div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      enrolment.occupancyPct >= 90
                        ? "bg-rose-500"
                        : enrolment.occupancyPct >= 75
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, enrolment.occupancyPct)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{enrolment.active} children enrolled</span>
                  <span>{enrolment.totalCapacity} total capacity</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-600">Spots available</span>
                  <span className="font-semibold text-slate-900">{forecast.spotsAvailable}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-600">Waitlist size</span>
                  <span className="font-semibold text-slate-900">{forecast.waitlistCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-600">Projected full capacity</span>
                  <span className="font-semibold text-slate-900">{forecast.projectedFullDate}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Room occupancy breakdown ─── */}
        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Room Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roomOccupancy.length === 0 ? (
              <div className="text-sm text-slate-500">No rooms configured.</div>
            ) : (
              <div className="space-y-3">
                {roomOccupancy.map((room) => (
                  <div key={room.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{room.name}</span>
                      <span className="text-slate-500">
                        {room.count} / {room.capacity || "∞"}
                        {room.capacity ? ` (${room.pct}%)` : ""}
                      </span>
                    </div>
                    {room.capacity ? (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            room.pct >= 90
                              ? "bg-rose-400"
                              : room.pct >= 75
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                          style={{ width: `${Math.min(100, room.pct)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Attendance trend (14-day bar chart) ─── */}
        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance — Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5" style={{ height: 120 }}>
              {attendanceTrend.map((day) => {
                const h = day.total > 0 ? Math.max(8, (day.present / maxAttendance) * 100) : 4;
                const absentH =
                  day.absent > 0 ? Math.max(4, (day.absent / maxAttendance) * 100) : 0;
                return (
                  <div
                    key={day.date}
                    className="group relative flex flex-1 flex-col items-center justify-end"
                    style={{ height: "100%" }}
                  >
                    {absentH > 0 ? (
                      <div
                        className="w-full rounded-t bg-rose-200"
                        style={{ height: `${absentH}%` }}
                      />
                    ) : null}
                    <div
                      className="w-full rounded-t bg-emerald-400"
                      style={{ height: `${h}%` }}
                    />
                    <div className="mt-1 text-[9px] text-slate-400">
                      {day.date.slice(8)}
                    </div>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded bg-slate-800 px-2 py-1 text-[10px] text-white group-hover:block whitespace-nowrap">
                      {day.date}: {day.present}P / {day.absent}A
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-emerald-400" />
                Present
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-rose-200" />
                Absent
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Incident trend (6-month) ─── */}
        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Trends — 6 Months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3" style={{ height: 100 }}>
              {incidentTrend.map((month) => {
                const maxCount = Math.max(1, ...incidentTrend.map((m) => m.count));
                const h = month.count > 0 ? Math.max(8, (month.count / maxCount) * 100) : 4;
                return (
                  <div key={month.label} className="flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
                    <div
                      className={`w-full rounded-t ${month.highSeverity > 0 ? "bg-rose-400" : "bg-amber-300"}`}
                      style={{ height: `${h}%` }}
                    />
                    <div className="mt-2 text-center">
                      <div className="text-xs font-medium text-slate-600">{month.count}</div>
                      <div className="text-[10px] text-slate-400">{month.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {incidentTrend.some((m) => m.highSeverity > 0) ? (
              <div className="mt-3 text-xs text-rose-600">
                High/critical incidents highlighted in red
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ─── Enrolment breakdown ─── */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Enrolment Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <div className="text-3xl font-bold text-emerald-700">{enrolment.active}</div>
                <div className="mt-1 text-sm text-emerald-600">Active</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <div className="text-3xl font-bold text-amber-700">{enrolment.waitlist}</div>
                <div className="mt-1 text-sm text-amber-600">Waitlist</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-3xl font-bold text-slate-600">{enrolment.withdrawn}</div>
                <div className="mt-1 text-sm text-slate-500">Withdrawn</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parent Satisfaction */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Parent satisfaction</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-3xl font-bold text-slate-900">{satisfaction.avg != null ? satisfaction.avg.toFixed(1) : "—"}</div>
                <div className="mt-1 text-sm text-slate-500">Avg rating / 5</div>
                {satisfaction.avg != null && (
                  <div className="mt-2 flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={`text-lg ${n <= Math.round(satisfaction.avg!) ? "text-amber-400" : "text-slate-200"}`}>★</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-3xl font-bold text-slate-900">{satisfaction.count}</div>
                <div className="mt-1 text-sm text-slate-500">Responses</div>
              </div>
            </div>
            {satisfaction.count === 0 && (
              <div className="mt-3 text-center text-sm text-slate-400">No survey responses yet. Create a survey in the Surveys page.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
