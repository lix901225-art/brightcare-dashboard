"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Shield, TrendingUp, AlertTriangle } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { MetricCardsSkeleton, CardListSkeleton } from "@/components/ui/skeleton";

type Child = { id: string; fullName?: string | null; status?: string | null };
type AttendanceRow = { id: string; childId: string; status?: string | null; checkinAt?: string | null; checkoutAt?: string | null };
type ThreadRow = { id: string; unreadCount?: number };
type GuardianRow = {
  id: string;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  isPickupAuthorized?: boolean;
};
type BillingSummary = { childId: string; childName: string; total: number; paid: number; balance: number };
type IncidentRow = { id: string; childId: string; severity: string; type: string; occurredAt: string; description: string; lockedAt?: string | null };
type InvoiceRow = { id: string; status: string; dueDate?: string | null; totalAmount: number; paidAmount: number; balanceAmount: number; childName: string };
type DailyReportRow = { id: string; childId?: string | null; date?: string | null };
type RoomRow = { id: string; name: string; capacity?: number | null };

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [guardianMap, setGuardianMap] = useState<Record<string, GuardianRow[]>>({});
  const [billingSummary, setBillingSummary] = useState<BillingSummary[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReportRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [childrenRes, attendanceRes, threadsRes, billingRes, incidentsRes, invoicesRes, reportsRes, roomsRes] = await Promise.all([
        apiFetch("/children"),
        apiFetch("/attendance"),
        apiFetch("/messages/threads"),
        apiFetch("/billing/summary"),
        apiFetch("/incidents"),
        apiFetch("/billing/invoices"),
        apiFetch("/daily-reports"),
        apiFetch("/rooms"),
      ]);

      const childrenData = await childrenRes.json();
      const attendanceData = await attendanceRes.json();
      const threadsData = await threadsRes.json();
      const billingData = await billingRes.json();
      const incidentsData = await incidentsRes.json();
      const invoicesData = invoicesRes.ok ? await invoicesRes.json() : [];

      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);
      if (!attendanceRes.ok) throw new Error(attendanceData?.message || `Attendance failed: ${attendanceRes.status}`);
      if (!threadsRes.ok) throw new Error(threadsData?.message || `Threads failed: ${threadsRes.status}`);

      const childRows = Array.isArray(childrenData) ? childrenData : [];
      const attendanceRows = Array.isArray(attendanceData) ? attendanceData : [];
      const threadRows = Array.isArray(threadsData) ? threadsData : [];
      const billingRows = billingRes.ok && Array.isArray(billingData) ? billingData : [];
      const incidentRows = incidentsRes.ok && Array.isArray(incidentsData) ? incidentsData : [];
      const invoiceRows = Array.isArray(invoicesData) ? invoicesData : [];

      const guardianEntries = await Promise.all(
        childRows.map(async (child: Child) => {
          try {
            const res = await apiFetch(`/children/${child.id}/guardians`);
            const data = await res.json();
            return [child.id, Array.isArray(data) ? data : []] as const;
          } catch {
            return [child.id, []] as const;
          }
        })
      );

      setChildren(childRows);
      setAttendance(attendanceRows);
      setThreads(threadRows);
      setGuardianMap(Object.fromEntries(guardianEntries));
      setBillingSummary(billingRows);
      setIncidents(incidentRows);
      setInvoices(invoiceRows);

      const reportsData = reportsRes.ok ? await reportsRes.json() : [];
      setDailyReports(Array.isArray(reportsData) ? reportsData : []);

      const roomsData = roomsRes.ok ? await roomsRes.json() : [];
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch (e: any) {
      setError(e?.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const metrics = useMemo(() => {
    const activeChildren = children.filter((c) => (c.status || "").toUpperCase() === "ACTIVE").length;
    const presentToday = attendance.filter((row) => {
      const s = (row.status || "").toUpperCase();
      return s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT";
    }).length;
    const absentToday = attendance.filter((row) => (row.status || "").toUpperCase() === "ABSENT").length;
    const unmarkedToday = Math.max(0, children.length - presentToday - absentToday);

    const missingGuardianCoverage = children.filter((child) => {
      const guardians = guardianMap[child.id] || [];
      const hasPrimary = guardians.some((g) => g.isPrimaryContact);
      const hasEmergency = guardians.some((g) => g.isEmergencyContact);
      const hasPickup = guardians.some((g) => g.isPickupAuthorized);
      return !hasPrimary || !hasEmergency || !hasPickup;
    }).length;

    const unreadMessages = threads.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0);
    const outstandingBalance = billingSummary.reduce((sum, b) => sum + Number(b.balance || 0), 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentIncidents = incidents.filter((i) => new Date(i.occurredAt) >= sevenDaysAgo);

    const waitlistCount = children.filter((c) => (c.status || "").toUpperCase() === "WAITLIST").length;

    const attendanceRate = children.length > 0 ? Math.round((presentToday / children.length) * 100) : 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    const overdueInvoices = invoices.filter(
      (inv) => inv.balanceAmount > 0 && inv.dueDate && inv.dueDate.slice(0, 10) < todayStr && inv.status.toUpperCase() !== "VOID" && inv.status.toUpperCase() !== "PAID"
    );
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

    const collectionRate = outstandingBalance + billingSummary.reduce((sum, b) => sum + Number(b.paid || 0), 0) > 0
      ? Math.round((billingSummary.reduce((sum, b) => sum + Number(b.paid || 0), 0) / (outstandingBalance + billingSummary.reduce((sum, b) => sum + Number(b.paid || 0), 0))) * 100)
      : 100;

    return {
      totalChildren: children.length,
      activeChildren,
      waitlistCount,
      presentToday,
      absentToday,
      unmarkedToday,
      attendanceRate,
      missingGuardianCoverage,
      threadCount: threads.length,
      unreadMessages,
      outstandingBalance,
      overdueCount: overdueInvoices.length,
      overdueAmount,
      collectionRate,
      recentIncidentCount: recentIncidents.length,
    };
  }, [attendance, children, guardianMap, threads, billingSummary, incidents, invoices]);

  const weeklyAttendance = useMemo(() => {
    const days: { label: string; date: string; present: number; absent: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
      // Note: attendance state currently only holds today's. We show today filled, rest as placeholder zeros.
      // This is a structural foundation — once the API supports date-range queries, it will populate fully.
      if (dateStr === new Date().toISOString().slice(0, 10)) {
        const present = attendance.filter((row) => {
          const s = (row.status || "").toUpperCase();
          return s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT";
        }).length;
        const absent = attendance.filter((row) => (row.status || "").toUpperCase() === "ABSENT").length;
        days.push({ label: dayLabel, date: dateStr, present, absent, total: children.length });
      } else {
        days.push({ label: dayLabel, date: dateStr, present: 0, absent: 0, total: children.length });
      }
    }
    return days;
  }, [attendance, children.length]);

  const enrollmentBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const child of children) {
      const status = (child.status || "ACTIVE").toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [children]);

  const recentIncidents = useMemo(() => {
    return [...incidents]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 5);
  }, [incidents]);

  const overdueChildren = useMemo(() => {
    return billingSummary.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);
  }, [billingSummary]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const reportCoverage = useMemo(() => {
    const todayReportChildIds = new Set(
      dailyReports
        .filter((r) => r.date && String(r.date).slice(0, 10) === todayStr)
        .map((r) => r.childId)
    );
    const covered = children.filter((c) => todayReportChildIds.has(c.id)).length;
    return { covered, total: children.length, pct: children.length > 0 ? Math.round((covered / children.length) * 100) : 0 };
  }, [dailyReports, children, todayStr]);

  const licensingCompliance = useMemo(() => {
    const totalLicensedCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const roomsMissingCapacity = rooms.filter((r) => !r.capacity || r.capacity <= 0);
    const activeChildren = children.filter((c) => (c.status || "").toUpperCase() === "ACTIVE").length;
    const overCapacity = totalLicensedCapacity > 0 && activeChildren > totalLicensedCapacity;
    const utilizationPct = totalLicensedCapacity > 0 ? Math.round((activeChildren / totalLicensedCapacity) * 100) : 0;

    let status: "ready" | "attention" | "over" = "ready";
    if (overCapacity) status = "over";
    else if (roomsMissingCapacity.length > 0) status = "attention";

    return {
      totalLicensedCapacity,
      activeChildren,
      roomsMissingCapacity: roomsMissingCapacity.length,
      totalRooms: rooms.length,
      overCapacity,
      utilizationPct,
      status,
    };
  }, [rooms, children]);

  const operationalHealth = useMemo(() => {
    // Composite score: attendance rate (30%), collection rate (25%), report coverage (25%), guardian coverage (20%)
    const attendanceScore = metrics.attendanceRate;
    const collectionScore = metrics.collectionRate;
    const reportScore = reportCoverage.pct;
    const guardianTotal = children.length;
    const guardianCovered = guardianTotal - metrics.missingGuardianCoverage;
    const guardianScore = guardianTotal > 0 ? Math.round((guardianCovered / guardianTotal) * 100) : 100;

    const composite = Math.round(
      attendanceScore * 0.3 + collectionScore * 0.25 + reportScore * 0.25 + guardianScore * 0.2
    );

    return {
      composite,
      attendance: attendanceScore,
      collection: collectionScore,
      reports: reportScore,
      guardian: guardianScore,
    };
  }, [metrics, reportCoverage, children.length]);

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <PageIntro
          title="Dashboard"
          description="Daily overview of attendance, guardian coverage, and operations."
        />

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-6">
            <MetricCardsSkeleton count={6} />
            <CardListSkeleton count={3} />
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Enrolled</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{metrics.totalChildren}</div>
                  <div className="mt-1 text-xs text-slate-500">{metrics.activeChildren} active</div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Present today</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{metrics.presentToday}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {metrics.attendanceRate}% rate
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Outstanding</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">${metrics.outstandingBalance.toFixed(0)}</div>
                  <div className="mt-1 text-xs text-slate-500">{metrics.collectionRate}% collected</div>
                </CardContent>
              </Card>

              <Card className={`rounded-2xl border-0 shadow-sm ${metrics.overdueCount > 0 ? "ring-1 ring-rose-200" : ""}`}>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Overdue</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-3xl font-semibold ${metrics.overdueCount > 0 ? "text-rose-600" : ""}`}>{metrics.overdueCount}</div>
                  {metrics.overdueCount > 0 ? (
                    <div className="mt-1 text-xs text-rose-600">${metrics.overdueAmount.toFixed(0)} past due</div>
                  ) : (
                    <div className="mt-1 text-xs text-emerald-600">all current</div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Messages</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{metrics.unreadMessages}</div>
                  <div className="mt-1 text-xs text-slate-500">{metrics.threadCount} threads</div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Incidents</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-3xl font-semibold ${metrics.recentIncidentCount > 0 ? "text-amber-600" : ""}`}>{metrics.recentIncidentCount}</div>
                  <div className="mt-1 text-xs text-slate-500">this week</div>
                </CardContent>
              </Card>
            </div>

            {(metrics.missingGuardianCoverage > 0 || metrics.unmarkedToday > 0 || metrics.recentIncidentCount > 0 || metrics.waitlistCount > 0) ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {metrics.waitlistCount > 0 ? (
                  <Link href="/enrollment" className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100">
                    {metrics.waitlistCount} on waitlist
                  </Link>
                ) : null}
                {metrics.unmarkedToday > 0 ? (
                  <Link href="/attendance" className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100">
                    {metrics.unmarkedToday} children unmarked today
                  </Link>
                ) : null}
                {metrics.missingGuardianCoverage > 0 ? (
                  <Link href="/guardians" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800 hover:bg-rose-100">
                    {metrics.missingGuardianCoverage} missing guardian coverage
                  </Link>
                ) : null}
                {metrics.recentIncidentCount > 0 ? (
                  <Link href="/incidents" className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100">
                    {metrics.recentIncidentCount} incidents this week
                  </Link>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/attendance" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Take attendance</div>
                    <div className="mt-1 text-sm text-slate-600">Mark present and absent children for today.</div>
                  </Link>
                  <Link href="/daily-reports" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Daily reports</div>
                    <div className="mt-1 text-sm text-slate-600">Log meals, naps, mood, and activities for each child.</div>
                  </Link>
                  <Link href="/children" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Child roster</div>
                    <div className="mt-1 text-sm text-slate-600">View and update child profiles and enrollment.</div>
                  </Link>
                  <Link href="/incidents" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Report incident</div>
                    <div className="mt-1 text-sm text-slate-600">Document safety incidents for compliance records.</div>
                  </Link>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {overdueChildren.length > 0 ? (
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader><CardTitle>Outstanding balances</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {overdueChildren.map((b) => (
                          <div key={b.childId} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                            <div className="text-sm font-medium text-slate-900">{b.childName}</div>
                            <div className="text-sm font-semibold text-rose-700">${b.balance.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                      <Link href="/billing" className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900">
                        View all billing &rarr;
                      </Link>
                    </CardContent>
                  </Card>
                ) : null}

                {recentIncidents.length > 0 ? (
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader><CardTitle>Recent incidents</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {recentIncidents.map((inc) => (
                          <div key={inc.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-slate-900">{inc.type}</div>
                              <span className={[
                                "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                inc.severity.toLowerCase() === "critical" || inc.severity.toLowerCase() === "high"
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600",
                              ].join(" ")}>
                                {inc.severity}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {new Date(inc.occurredAt).toLocaleDateString()} · {inc.description.slice(0, 80)}{inc.description.length > 80 ? "..." : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Link href="/incidents" className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900">
                        View all incidents &rarr;
                      </Link>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Operational health</CardTitle>
                    <span className={[
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                      operationalHealth.composite >= 80 ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                      operationalHealth.composite >= 60 ? "border-amber-200 bg-amber-50 text-amber-700" :
                      "border-rose-200 bg-rose-50 text-rose-700",
                    ].join(" ")}>
                      <TrendingUp className="h-3 w-3" />
                      {operationalHealth.composite}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {([
                      { label: "Attendance", value: operationalHealth.attendance, weight: "30%" },
                      { label: "Billing collection", value: operationalHealth.collection, weight: "25%" },
                      { label: "Daily reports", value: operationalHealth.reports, weight: "25%" },
                      { label: "Guardian coverage", value: operationalHealth.guardian, weight: "20%" },
                    ] as const).map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">{item.label}</span>
                          <span className="text-slate-500">{item.value}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={[
                              "h-full rounded-full transition-all",
                              item.value >= 80 ? "bg-emerald-500" :
                              item.value >= 60 ? "bg-amber-400" : "bg-rose-400",
                            ].join(" ")}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center">
                    <div className={[
                      "text-2xl font-bold",
                      operationalHealth.composite >= 80 ? "text-emerald-700" :
                      operationalHealth.composite >= 60 ? "text-amber-700" : "text-rose-700",
                    ].join(" ")}>
                      {operationalHealth.composite >= 80 ? "Excellent" : operationalHealth.composite >= 60 ? "Fair" : "Needs attention"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">Overall operational score</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Daily report coverage</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <div className="relative h-28 w-28">
                      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                        <circle cx="18" cy="18" r="15.91" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                        <circle
                          cx="18" cy="18" r="15.91" fill="none"
                          stroke={reportCoverage.pct >= 80 ? "#10b981" : reportCoverage.pct >= 50 ? "#f59e0b" : "#f43f5e"}
                          strokeWidth="2.5"
                          strokeDasharray={`${reportCoverage.pct} ${100 - reportCoverage.pct}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-xl font-bold text-slate-900">{reportCoverage.pct}%</div>
                        <div className="text-[10px] text-slate-500">filed</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{reportCoverage.covered}</span> of {reportCoverage.total} children
                    </div>
                    {reportCoverage.total - reportCoverage.covered > 0 ? (
                      <Link href="/daily-reports" className="text-xs font-medium text-amber-600 hover:text-amber-700">
                        {reportCoverage.total - reportCoverage.covered} missing &rarr;
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600">All filed ✓</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Revenue snapshot</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total billed</div>
                      <div className="mt-1 text-2xl font-bold text-slate-900">
                        ${(metrics.outstandingBalance + billingSummary.reduce((s, b) => s + Number(b.paid || 0), 0)).toFixed(0)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="text-xs text-emerald-600">Collected</div>
                        <div className="mt-0.5 text-lg font-semibold text-emerald-700">
                          ${billingSummary.reduce((s, b) => s + Number(b.paid || 0), 0).toFixed(0)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <div className="text-xs text-rose-600">Outstanding</div>
                        <div className="mt-0.5 text-lg font-semibold text-rose-700">
                          ${metrics.outstandingBalance.toFixed(0)}
                        </div>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${metrics.collectionRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{metrics.collectionRate}% collection rate</span>
                      <span>{metrics.overdueCount} overdue</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {rooms.length > 0 && (
              <div className="mt-6">
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Licensing compliance
                      </CardTitle>
                      <span className={[
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                        licensingCompliance.status === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                        licensingCompliance.status === "attention" ? "border-amber-200 bg-amber-50 text-amber-700" :
                        "border-rose-200 bg-rose-50 text-rose-700",
                      ].join(" ")}>
                        {licensingCompliance.status === "ready" ? <Shield className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {licensingCompliance.status === "ready" ? "Inspection ready" :
                         licensingCompliance.status === "attention" ? "Needs attention" : "Over capacity"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Licensed capacity</div>
                        <div className="mt-1 text-xl font-bold text-slate-900">{licensingCompliance.totalLicensedCapacity}</div>
                        <div className="text-xs text-slate-500">across {licensingCompliance.totalRooms} rooms</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Active enrolled</div>
                        <div className="mt-1 text-xl font-bold text-slate-900">{licensingCompliance.activeChildren}</div>
                        <div className="text-xs text-slate-500">{licensingCompliance.utilizationPct}% of capacity</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Utilization</div>
                        <div className="mt-1">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={[
                                "h-full rounded-full transition-all",
                                licensingCompliance.utilizationPct > 100 ? "bg-rose-500" :
                                licensingCompliance.utilizationPct >= 90 ? "bg-amber-400" : "bg-emerald-500",
                              ].join(" ")}
                              style={{ width: `${Math.min(licensingCompliance.utilizationPct, 100)}%` }}
                            />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {licensingCompliance.utilizationPct}% utilized
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Missing data</div>
                        <div className={`mt-1 text-xl font-bold ${licensingCompliance.roomsMissingCapacity > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {licensingCompliance.roomsMissingCapacity}
                        </div>
                        <div className="text-xs text-slate-500">
                          {licensingCompliance.roomsMissingCapacity > 0 ? "rooms need licensed capacity" : "all rooms set"}
                        </div>
                      </div>
                    </div>
                    {(licensingCompliance.status === "attention" || licensingCompliance.status === "over") && (
                      <div className={[
                        "mt-3 flex items-center gap-2 rounded-xl border p-3 text-sm",
                        licensingCompliance.status === "over" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700",
                      ].join(" ")}>
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {licensingCompliance.status === "over"
                          ? `Active enrollment (${licensingCompliance.activeChildren}) exceeds licensed capacity (${licensingCompliance.totalLicensedCapacity}). Review before next inspection.`
                          : `${licensingCompliance.roomsMissingCapacity} room(s) missing licensed capacity data. Update in Rooms to ensure inspection readiness.`}
                      </div>
                    )}
                    <Link href="/rooms" className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900">
                      Manage rooms &amp; licensed capacity &rarr;
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <Card className="rounded-2xl border-0 shadow-sm lg:col-span-2">
                <CardHeader><CardTitle>Today&apos;s attendance snapshot</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                    {weeklyAttendance.map((day) => {
                      const maxVal = Math.max(day.total, 1);
                      const presentPct = (day.present / maxVal) * 100;
                      const absentPct = (day.absent / maxVal) * 100;
                      const isToday = day.date === new Date().toISOString().slice(0, 10);

                      return (
                        <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                          <div className="flex w-full flex-col items-center" style={{ height: 90 }}>
                            <div className="relative w-full max-w-[32px] flex-1 overflow-hidden rounded-t-md bg-slate-100">
                              {day.present > 0 || day.absent > 0 ? (
                                <>
                                  <div
                                    className="absolute bottom-0 w-full bg-emerald-400 transition-all"
                                    style={{ height: `${presentPct}%` }}
                                  />
                                  <div
                                    className="absolute w-full bg-rose-300 transition-all"
                                    style={{ height: `${absentPct}%`, bottom: `${presentPct}%` }}
                                  />
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div className={`text-[10px] font-medium ${isToday ? "text-slate-900" : "text-slate-400"}`}>
                            {day.label}
                          </div>
                          {isToday && day.present > 0 ? (
                            <div className="text-[10px] text-emerald-600">{day.present}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" /> Present
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-rose-300" /> Absent
                    </span>
                    <span className="ml-auto text-slate-400">Today&apos;s rate: {metrics.attendanceRate}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Enrollment breakdown</CardTitle></CardHeader>
                <CardContent>
                  {enrollmentBreakdown.length === 0 ? (
                    <div className="text-sm text-slate-400">No enrollment data.</div>
                  ) : (
                    <div className="space-y-3">
                      {enrollmentBreakdown.map(({ status, count }) => {
                        const pct = children.length > 0 ? Math.round((count / children.length) * 100) : 0;
                        const color =
                          status === "ACTIVE" ? "bg-emerald-500" :
                          status === "WAITLIST" ? "bg-amber-400" :
                          status === "INACTIVE" || status === "WITHDRAWN" ? "bg-slate-300" :
                          "bg-sky-400";
                        return (
                          <div key={status}>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-700">{status}</span>
                              <span className="text-slate-500">{count} ({pct}%)</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-medium text-slate-900">
                        <span>Total</span>
                        <span>{children.length}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </RoleGate>
  );
}
