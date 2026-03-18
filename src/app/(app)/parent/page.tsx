"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, Check, Clock, FileText, MessageCircle, Utensils } from "lucide-react";
import { PullToRefresh } from "@/components/app/pull-to-refresh";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { MetricCardsSkeleton, CardListSkeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/error";

type ThreadRow = {
  id: string;
  childId?: string | null;
  childName?: string | null;
  roomName?: string | null;
  latestMessage?: string | null;
  updatedAt?: string | null;
  unreadCount?: number;
};

type AttendanceRow = {
  id: string;
  childId?: string | null;
  status?: string | null;
  date?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

type Child = {
  id: string;
  fullName?: string | null;
  preferredName?: string | null;
  className?: string | null;
  roomId?: string | null;
};

type Room = {
  id: string;
  name?: string | null;
};

type DailyReport = {
  id: string;
  childId?: string | null;
  date?: string | null;
  mood?: string | null;
  naps?: string | null;
  meals?: string | null;
  activities?: string | null;
};

type Policy = {
  id: string;
  title: string;
  version: string;
  createdAt: string;
};

type InvoiceRow = {
  id: string;
  childName?: string | null;
  status: string;
  dueDate?: string | null;
  balanceAmount: number;
};

function fmtTime(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ParentHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [billingBalance, setBillingBalance] = useState<number>(0);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [todayMenu, setTodayMenu] = useState<{ breakfast?: string; morningSnack?: string; lunch?: string; afternoonSnack?: string } | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [threadsRes, attendanceRes, childrenRes, roomsRes, reportsRes, policiesRes, billingRes, invoicesRes, menuRes] = await Promise.all([
        apiFetch("/messages/threads"),
        apiFetch("/attendance"),
        apiFetch("/children"),
        apiFetch("/rooms"),
        apiFetch("/daily-reports"),
        apiFetch("/policies"),
        apiFetch("/billing/summary"),
        apiFetch("/billing/invoices"),
        apiFetch(`/meal-menus?date=${today}`).catch(() => null),
      ]);

      const threadsData = await threadsRes.json();
      const attendanceData = await attendanceRes.json();
      const childrenData = await childrenRes.json();
      const roomsData = await roomsRes.json();
      const reportsData = await reportsRes.json();
      const policiesData = await policiesRes.json();
      const billingData = billingRes.ok ? await billingRes.json() : [];

      if (!threadsRes.ok) throw new Error(threadsData?.message || `Threads failed: ${threadsRes.status}`);
      if (!attendanceRes.ok) throw new Error(attendanceData?.message || `Attendance failed: ${attendanceRes.status}`);
      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);

      setThreads(Array.isArray(threadsData) ? threadsData : []);
      setAttendance(
        (Array.isArray(attendanceData) ? attendanceData : []).filter((row: AttendanceRow) => {
          if (!row?.date) return true;
          return String(row.date).slice(0, 10) === today;
        })
      );
      setChildren(Array.isArray(childrenData) ? childrenData : []);
      setRooms(roomsRes.ok && Array.isArray(roomsData) ? roomsData : []);
      setReports(reportsRes.ok && Array.isArray(reportsData) ? reportsData : []);
      setPolicies(policiesRes.ok && Array.isArray(policiesData) ? policiesData : []);

      const totalBalance = (Array.isArray(billingData) ? billingData : [])
        .reduce((sum: number, row: { balance?: number }) => sum + (Number(row.balance) || 0), 0);
      setBillingBalance(totalBalance);

      const invoicesData = invoicesRes.ok ? await invoicesRes.json() : [];
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);

      if (menuRes && menuRes.ok) {
        const menuData = await menuRes.json();
        if (menuData && (menuData.breakfast || menuData.lunch || menuData.morningSnack || menuData.afternoonSnack)) {
          setTodayMenu(menuData);
        }
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load parent workspace."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [today]);

  const roomNameById = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, r.name || r.id])),
    [rooms]
  );

  const attendanceByChild = useMemo(
    () =>
      Object.fromEntries(
        attendance
          .filter((row) => row.childId)
          .map((row) => [row.childId as string, row])
      ),
    [attendance]
  );

  const childNameById = useMemo(
    () => Object.fromEntries(children.map((c) => [c.id, c.fullName || "Unnamed"])),
    [children]
  );

  const stats = useMemo(() => {
    const present = attendance.filter((x) => {
      const s = (x.status || "").toUpperCase();
      return s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT";
    }).length;
    const absent = attendance.filter((x) => (x.status || "").toUpperCase() === "ABSENT").length;

    return {
      children: children.length,
      threads: threads.length,
      present,
      absent,
    };
  }, [attendance, children.length, threads.length]);

  const recentThreads = useMemo(() => [...threads].slice(0, 5), [threads]);

  const todayReports = useMemo(() => {
    return reports
      .filter((r) => r.date && String(r.date).slice(0, 10) === today)
      .slice(0, 6);
  }, [reports, today]);

  const childSnapshot = useMemo(() => children.slice(0, 6), [children]);

  const overdueInvoices = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return invoices.filter((inv) => {
      if (inv.status.toUpperCase() === "PAID" || inv.status.toUpperCase() === "VOID") return false;
      if (inv.balanceAmount <= 0 || !inv.dueDate) return false;
      return String(inv.dueDate).slice(0, 10) < todayStr;
    });
  }, [invoices]);

  const totalOverdue = useMemo(
    () => overdueInvoices.reduce((s, i) => s + Number(i.balanceAmount || 0), 0),
    [overdueInvoices]
  );

  const weekAttendance = useMemo(() => {
    // Build last 5 weekdays
    const days: { date: string; label: string; present: number; absent: number }[] = [];
    const d = new Date();
    while (days.length < 5) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        const dateStr = d.toISOString().slice(0, 10);
        days.push({
          date: dateStr,
          label: d.toLocaleDateString([], { weekday: "short" }),
          present: 0,
          absent: 0,
        });
      }
      d.setDate(d.getDate() - 1);
    }
    // This only works for today since we filter attendance to today; other days show 0
    // Still useful as a visual structure
    return days.reverse();
  }, []);

  // ─── Activity Timeline ───
  type TimelineEvent = { id: string; time: string; type: string; icon: typeof Clock; color: string; title: string; detail?: string; href?: string };

  const timeline = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Attendance events
    for (const a of attendance) {
      const child = children.find((c) => c.id === a.childId);
      const name = child?.fullName || "Child";
      if (a.checkinAt) {
        events.push({
          id: `checkin-${a.id || a.childId}`,
          time: a.checkinAt,
          type: "checkin",
          icon: Check,
          color: "text-emerald-600 bg-emerald-50",
          title: `${name} checked in`,
          detail: new Date(a.checkinAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        });
      }
      if (a.checkoutAt) {
        events.push({
          id: `checkout-${a.id || a.childId}`,
          time: a.checkoutAt,
          type: "checkout",
          icon: Clock,
          color: "text-slate-600 bg-slate-100",
          title: `${name} checked out`,
          detail: new Date(a.checkoutAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        });
      }
    }

    // Daily report events
    for (const r of todayReports) {
      events.push({
        id: `report-${r.id}`,
        time: r.date || today,
        type: "report",
        icon: FileText,
        color: "text-amber-600 bg-amber-50",
        title: `Daily report: ${r.childId ? childNameById[r.childId] || "Child" : "Child"}`,
        detail: [r.mood, r.meals ? "Meals recorded" : null, r.activities ? "Activities logged" : null].filter(Boolean).join(" · "),
        href: `/daily-reports/${r.id}`,
      });
    }

    // Message events (latest thread updates)
    for (const t of recentThreads) {
      if (t.updatedAt) {
        events.push({
          id: `msg-${t.id}`,
          time: t.updatedAt,
          type: "message",
          icon: MessageCircle,
          color: "text-violet-600 bg-violet-50",
          title: `Message: ${t.childName || "Centre"}`,
          detail: t.latestMessage ? (t.latestMessage.length > 60 ? t.latestMessage.slice(0, 60) + "..." : t.latestMessage) : undefined,
          href: `/messages/${t.id}`,
        });
      }
    }

    // Sort by time descending
    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return events.slice(0, 10);
  }, [attendance, children, todayReports, recentThreads, childNameById, today]);

  const handleRefresh = useCallback(async () => {
    await loadAll();
  }, [today]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <PageIntro
          title="Parent Workspace"
          description="Stay connected with your child\u2019s day — attendance, reports, and messages from your centre."
        />

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-6">
            <MetricCardsSkeleton count={5} />
            <CardListSkeleton count={3} />
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">My children</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-semibold">{stats.children}</div></CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Present today</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{stats.present}</div>
                  {stats.absent > 0 ? (
                    <div className="mt-1 text-xs text-slate-500">{stats.absent} absent</div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Today&apos;s reports</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{todayReports.length}</div>
                  <div className="mt-1 text-xs text-slate-500">daily reports filed</div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Messages</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{stats.threads}</div>
                  <div className="mt-1 text-xs text-slate-500">active threads</div>
                </CardContent>
              </Card>

              <Link href="/parent/billing" className="block">
                <Card className={`rounded-2xl border-0 shadow-sm ${billingBalance > 0 ? "ring-1 ring-rose-200" : ""}`}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Balance due</CardTitle></CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-semibold ${billingBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      ${billingBalance.toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {billingBalance > 0 ? "view invoices →" : "all paid up ✓"}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {overdueInvoices.length > 0 ? (
              <div className="mt-4">
                <Link
                  href="/parent/billing"
                  className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 transition-colors hover:bg-rose-100"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <div className="text-sm font-semibold text-rose-800">
                      {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? "s" : ""} — ${totalOverdue.toFixed(2)} past due
                    </div>
                    <div className="mt-0.5 text-xs text-rose-600">
                      Tap to view billing details and payment options &rarr;
                    </div>
                  </div>
                </Link>
              </div>
            ) : null}

            {/* Activity Timeline */}
            {timeline.length > 0 && (
              <Card className="mt-6 rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Today&apos;s activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative space-y-0">
                    {timeline.map((event, i) => {
                      const Icon = event.icon;
                      const isLast = i === timeline.length - 1;
                      return (
                        <div key={event.id} className="relative flex gap-3 pb-4">
                          {!isLast && (
                            <div className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-slate-200" />
                          )}
                          <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${event.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          {event.href ? (
                            <Link href={event.href} className="min-w-0 flex-1 rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm font-medium text-slate-900">{event.title}</div>
                                <div className="shrink-0 text-xs text-slate-400">{event.detail}</div>
                              </div>
                            </Link>
                          ) : (
                            <div className="min-w-0 flex-1 rounded-xl px-3 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm font-medium text-slate-900">{event.title}</div>
                                <div className="shrink-0 text-xs text-slate-400">{event.detail}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>My children</CardTitle></CardHeader>
                <CardContent>
                  {childSnapshot.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                      No children found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {childSnapshot.map((child) => {
                        const roomName =
                          child.className ||
                          (child.roomId ? roomNameById[child.roomId] || child.roomId : "—");
                        const row = attendanceByChild[child.id] || null;
                        const status = (row?.status || "UNKNOWN").toUpperCase();
                        const isPresent = status === "PRESENT" || status === "CHECKED_IN" || status === "CHECKED_OUT";
                        const isAbsent = status === "ABSENT";

                        return (
                          <div key={child.id} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {child.fullName || "Unnamed child"}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {child.preferredName ? `"${child.preferredName}"` : ""} {roomName !== "—" ? `· ${roomName}` : ""}
                                </div>
                                {(row?.checkinAt || row?.checkoutAt) ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {row.checkinAt ? (
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                        <Clock className="h-2.5 w-2.5" />
                                        In {fmtTime(row.checkinAt)}
                                      </span>
                                    ) : null}
                                    {row.checkoutAt ? (
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                        <Clock className="h-2.5 w-2.5" />
                                        Out {fmtTime(row.checkoutAt)}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                              <span
                                className={[
                                  "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                                  isPresent
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : isAbsent
                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600",
                                ].join(" ")}
                              >
                                {isPresent ? "Present" : isAbsent ? "Absent" : "Not marked"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {todayReports.length > 0 ? (
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader><CardTitle>Today&apos;s daily reports</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {todayReports.map((report) => (
                        <Link key={report.id} href={`/daily-reports/${encodeURIComponent(report.id)}`} className="block rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                          <div className="text-sm font-medium text-slate-900">
                            {report.childId ? childNameById[report.childId] || "Child" : "Child"}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            {report.mood ? (
                              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                                <span className="text-slate-500">Mood:</span>{" "}
                                <span className="font-medium text-slate-700">{report.mood}</span>
                              </div>
                            ) : null}
                            {report.meals ? (
                              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                                <span className="text-slate-500">Meals:</span>{" "}
                                <span className="font-medium text-slate-700">{report.meals}</span>
                              </div>
                            ) : null}
                            {report.naps ? (
                              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                                <span className="text-slate-500">Naps:</span>{" "}
                                <span className="font-medium text-slate-700">{report.naps}</span>
                              </div>
                            ) : null}
                            {report.activities ? (
                              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                                <span className="text-slate-500">Activities:</span>{" "}
                                <span className="font-medium text-slate-700">{report.activities}</span>
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link href="/daily-reports" className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900">
                      View all reports &rarr;
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader><CardTitle>Today&apos;s daily reports</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                      No reports filed for today yet. Check back later for updates on meals, naps, and activities.
                    </div>
                    <Link href="/daily-reports" className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900">
                      View past reports &rarr;
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Recent messages</CardTitle></CardHeader>
                <CardContent>
                  {recentThreads.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                      No message threads yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentThreads.map((thread) => (
                        <div key={thread.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {thread.childName || "General"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 line-clamp-1">
                              {thread.latestMessage || "No messages yet"}
                            </div>
                          </div>
                          <Link
                            href={`/messages/${thread.id}`}
                            className="inline-flex shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Open
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/messages" className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900">
                    All messages &rarr;
                  </Link>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Today</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {/* Daily reports */}
                  {todayReports.length > 0 ? (
                    <Link href="/daily-reports" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 hover:bg-emerald-50">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-50">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">Daily reports ready</div>
                        <div className="mt-0.5 text-xs text-emerald-700">{todayReports.length} report{todayReports.length !== 1 ? "s" : ""} filed today</div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-200" />
                      <div>
                        <div className="text-sm font-medium text-slate-500">Daily reports</div>
                        <div className="mt-0.5 text-xs text-slate-400">No reports filed yet today — check back later</div>
                      </div>
                    </div>
                  )}

                  {/* Today's menu */}
                  {todayMenu && (
                    <div className="rounded-xl border border-slate-100 p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-slate-900">Today&apos;s menu</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {todayMenu.breakfast && <div><span className="text-slate-400">Breakfast:</span> <span className="text-slate-700">{todayMenu.breakfast}</span></div>}
                        {todayMenu.morningSnack && <div><span className="text-slate-400">AM Snack:</span> <span className="text-slate-700">{todayMenu.morningSnack}</span></div>}
                        {todayMenu.lunch && <div><span className="text-slate-400">Lunch:</span> <span className="text-slate-700">{todayMenu.lunch}</span></div>}
                        {todayMenu.afternoonSnack && <div><span className="text-slate-400">PM Snack:</span> <span className="text-slate-700">{todayMenu.afternoonSnack}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* Unread messages */}
                  {(() => {
                    const unread = threads.reduce((s, t) => s + (Number(t.unreadCount) || 0), 0);
                    if (unread > 0) {
                      return (
                        <Link href="/messages" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 hover:bg-amber-50">
                          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">New messages</div>
                            <div className="mt-0.5 text-xs text-amber-700">{unread} unread message{unread !== 1 ? "s" : ""}</div>
                          </div>
                        </Link>
                      );
                    }
                    return (
                      <Link href="/messages" className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-50">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-400">Messages</div>
                          <div className="mt-0.5 text-xs text-emerald-600">All caught up</div>
                        </div>
                      </Link>
                    );
                  })()}

                  {/* Attendance */}
                  {stats.present > 0 || stats.absent > 0 ? (
                    <Link href="/parent/attendance" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 hover:bg-emerald-50">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-50">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">Attendance recorded</div>
                        <div className="mt-0.5 text-xs text-emerald-700">
                          {stats.present} present{stats.absent > 0 ? `, ${stats.absent} absent` : ""}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <Link href="/parent/attendance" className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-200" />
                      <div>
                        <div className="text-sm font-medium text-slate-500">Attendance</div>
                        <div className="mt-0.5 text-xs text-slate-400">Not recorded yet today</div>
                      </div>
                    </Link>
                  )}

                  {/* Policies needing review */}
                  {policies.length > 0 ? (
                    <Link href="/policies" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 hover:bg-amber-50">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-900">Review policies</div>
                        <div className="mt-0.5 text-xs text-amber-700">{policies.length} centre {policies.length === 1 ? "policy" : "policies"} to acknowledge</div>
                      </div>
                    </Link>
                  ) : null}

                  {/* Overdue billing */}
                  {billingBalance > 0 ? (
                    <Link href="/parent/billing" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-3 hover:bg-rose-50">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-900">Balance due</div>
                        <div className="mt-0.5 text-xs text-rose-700">${billingBalance.toFixed(2)} outstanding</div>
                      </div>
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
      </PullToRefresh>
    </RoleGate>
  );
}
