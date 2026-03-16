"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type ThreadRow = {
  id: string;
  childId?: string | null;
  childName?: string | null;
  roomName?: string | null;
  latestMessage?: string | null;
  updatedAt?: string | null;
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

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [threadsRes, attendanceRes, childrenRes, roomsRes, reportsRes, policiesRes, billingRes, invoicesRes] = await Promise.all([
        apiFetch("/messages/threads"),
        apiFetch("/attendance"),
        apiFetch("/children"),
        apiFetch("/rooms"),
        apiFetch("/daily-reports"),
        apiFetch("/policies"),
        apiFetch("/billing/summary"),
        apiFetch("/billing/invoices"),
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
        .reduce((sum: number, row: any) => sum + (Number(row.balance) || 0), 0);
      setBillingBalance(totalBalance);

      const invoicesData = invoicesRes.ok ? await invoicesRes.json() : [];
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
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

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <div>
        <PageIntro
          title="Parent Workspace"
          description="Stay connected with your child's day — attendance, reports, and messages."
        />

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading parent workspace...
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
                <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/parent/attendance" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">View attendance</div>
                    <div className="mt-1 text-sm text-slate-600">
                      See check-in and check-out times and weekly history.
                    </div>
                  </Link>
                  <Link href="/parent/billing" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">View billing</div>
                    <div className="mt-1 text-sm text-slate-600">
                      See invoices, payments, and account balance.
                    </div>
                  </Link>
                  <Link href="/messages" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Send a message</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Communicate with your child&apos;s teacher or admin.
                    </div>
                  </Link>
                  <Link href="/daily-reports" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">View daily reports</div>
                    <div className="mt-1 text-sm text-slate-600">
                      See meals, naps, mood, and activities for your child.
                    </div>
                  </Link>
                  <Link href="/policies" className={[
                    "block rounded-xl border p-4 hover:bg-slate-50",
                    policies.length > 0 ? "border-amber-200 bg-amber-50/30" : "border-slate-200",
                  ].join(" ")}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-900">Review policies</div>
                      {policies.length > 0 ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {policies.length} policies
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      View and acknowledge daycare policies.
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </RoleGate>
  );
}
