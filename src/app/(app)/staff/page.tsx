"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock, FileText, Users } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type Child = {
  id: string;
  fullName?: string | null;
  preferredName?: string | null;
  className?: string | null;
  roomId?: string | null;
};

type AttendanceRow = {
  id: string;
  childId?: string | null;
  status?: string | null;
  date?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

type ThreadRow = {
  id: string;
  childId?: string | null;
  childName?: string | null;
  roomName?: string | null;
  latestMessage?: string | null;
  updatedAt?: string | null;
  unreadCount?: number;
};

type Room = {
  id: string;
  name?: string | null;
  capacity?: number | null;
};

type DailyReport = {
  id: string;
  childId?: string | null;
  date?: string | null;
};

type IncidentRow = {
  id: string;
  severity?: string | null;
  occurredAt?: string | null;
};

function fmtTime(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function StaffHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [childrenRes, attendanceRes, threadsRes, roomsRes, reportsRes, incidentsRes] = await Promise.all([
        apiFetch("/children"),
        apiFetch("/attendance"),
        apiFetch("/messages/threads"),
        apiFetch("/rooms"),
        apiFetch("/daily-reports"),
        apiFetch("/incidents"),
      ]);

      const childrenData = await childrenRes.json();
      const attendanceData = await attendanceRes.json();
      const threadsData = await threadsRes.json();
      const roomsData = await roomsRes.json();
      const reportsData = await reportsRes.json();
      const incidentsData = await incidentsRes.json();

      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);
      if (!attendanceRes.ok) throw new Error(attendanceData?.message || `Attendance failed: ${attendanceRes.status}`);
      if (!threadsRes.ok) throw new Error(threadsData?.message || `Threads failed: ${threadsRes.status}`);

      setChildren(Array.isArray(childrenData) ? childrenData : []);
      setAttendance(
        (Array.isArray(attendanceData) ? attendanceData : []).filter((row: AttendanceRow) => {
          if (!row?.date) return true;
          return String(row.date).slice(0, 10) === today;
        })
      );
      setThreads(Array.isArray(threadsData) ? threadsData : []);
      setRooms(roomsRes.ok && Array.isArray(roomsData) ? roomsData : []);
      setReports(reportsRes.ok && Array.isArray(reportsData) ? reportsData : []);
      setIncidents(incidentsRes.ok && Array.isArray(incidentsData) ? incidentsData : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load staff workspace."));
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

  const metrics = useMemo(() => {
    const present = attendance.filter((x) => {
      const s = (x.status || "").toUpperCase();
      return s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT";
    }).length;
    const absent = attendance.filter((x) => (x.status || "").toUpperCase() === "ABSENT").length;
    const unmarked = Math.max(children.length - present - absent, 0);

    const todayReports = reports.filter((r) => r.date && String(r.date).slice(0, 10) === today).length;
    const childrenWithReport = new Set(
      reports.filter((r) => r.date && String(r.date).slice(0, 10) === today).map((r) => r.childId)
    ).size;
    const missingReports = Math.max(children.length - childrenWithReport, 0);

    const unreadMessages = threads.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekIncidents = incidents.filter((i) => i.occurredAt && new Date(i.occurredAt) >= sevenDaysAgo).length;

    return {
      activeChildren: children.length,
      present,
      absent,
      unmarked,
      todayReports,
      missingReports,
      unreadMessages,
      weekIncidents,
    };
  }, [attendance, children, reports, today, threads, incidents]);

  const followUpChildren = useMemo(() => {
    return children
      .filter((child) => !attendanceByChild[child.id])
      .slice(0, 6);
  }, [children, attendanceByChild]);

  const recentThreads = useMemo(() => [...threads].slice(0, 5), [threads]);

  const reportCoverage = useMemo(() => {
    const childrenWithReport = new Set(
      reports
        .filter((r) => r.date && String(r.date).slice(0, 10) === today)
        .map((r) => r.childId)
    );
    const missing = children.filter((c) => !childrenWithReport.has(c.id));
    const covered = children.filter((c) => childrenWithReport.has(c.id));
    return { missing, covered, total: children.length };
  }, [children, reports, today]);

  const endOfDayChecklist = useMemo(() => {
    const allMarked = metrics.unmarked === 0 && children.length > 0;
    const allReported = metrics.missingReports === 0 && children.length > 0;
    const allCheckedOut = children.length > 0 && children.every((c) => {
      const row = attendanceByChild[c.id];
      if (!row) return true; // absent or unmarked
      const s = (row.status || "").toUpperCase();
      return s === "ABSENT" || s === "CHECKED_OUT";
    });
    const items = [
      { label: "All attendance marked", done: allMarked, link: "/attendance" },
      { label: "Daily reports filed for all children", done: allReported, link: "/daily-reports" },
      { label: "All children checked out", done: allCheckedOut, link: "/attendance" },
    ];
    const doneCount = items.filter((i) => i.done).length;
    return { items, doneCount, total: items.length };
  }, [children, metrics, attendanceByChild, incidents, today]);

  const ratioByRoom = useMemo(() => {
    return rooms.map((room) => {
      const roomChildren = children.filter((c) => c.roomId === room.id || c.className === room.name);
      const presentCount = roomChildren.filter((c) => {
        const row = attendanceByChild[c.id];
        if (!row) return false;
        const s = (row.status || "").toUpperCase();
        return s === "PRESENT" || s === "CHECKED_IN";
      }).length;
      return { ...room, childCount: roomChildren.length, presentCount };
    });
  }, [rooms, children, attendanceByChild]);

  return (
    <RoleGate allow={["STAFF", "OWNER"]}>
      <div>
        <PageIntro
          title="Staff Workspace"
          description="Your daily hub for attendance, reports, and classroom operations."
        />

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading staff workspace...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Children today</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{metrics.present}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {metrics.absent} absent · {metrics.unmarked} unmarked
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Daily reports</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{metrics.todayReports}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {metrics.missingReports > 0
                      ? `${metrics.missingReports} children missing reports`
                      : "All children reported"}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Unread messages</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{metrics.unreadMessages}</div>
                  <div className="mt-1 text-xs text-slate-500">{threads.length} total threads</div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Incidents this week</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{metrics.weekIncidents}</div>
                  {metrics.weekIncidents > 0 ? (
                    <Link href="/incidents" className="mt-1 text-xs text-amber-600 hover:text-amber-700">
                      Review incidents &rarr;
                    </Link>
                  ) : (
                    <div className="mt-1 text-xs text-emerald-600">No incidents reported</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {(metrics.unmarked > 0 || metrics.missingReports > 0) ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {metrics.unmarked > 0 ? (
                  <Link href="/attendance" className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100">
                    {metrics.unmarked} children need attendance marked
                  </Link>
                ) : null}
                {metrics.missingReports > 0 ? (
                  <Link href="/daily-reports" className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100">
                    {metrics.missingReports} children missing daily reports
                  </Link>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>End-of-day checklist</CardTitle>
                    <span className={[
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                      endOfDayChecklist.doneCount === endOfDayChecklist.total
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    ].join(" ")}>
                      {endOfDayChecklist.doneCount}/{endOfDayChecklist.total} complete
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {endOfDayChecklist.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.link}
                        className={[
                          "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                          item.done ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {item.done ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                        )}
                        <span className={[
                          "text-sm font-medium",
                          item.done ? "text-emerald-700" : "text-slate-700",
                        ].join(" ")}>
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                  {endOfDayChecklist.doneCount === endOfDayChecklist.total ? (
                    <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
                      All tasks complete for today
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Room occupancy</CardTitle>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3 w-3" />
                      Live count
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {ratioByRoom.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">No rooms configured.</div>
                  ) : (
                    <div className="space-y-3">
                      {ratioByRoom.map((room) => {
                        const cap = room.capacity || 0;
                        const pct = cap > 0 ? Math.round((room.presentCount / cap) * 100) : 0;
                        const atCapacity = cap > 0 && room.presentCount >= cap;
                        return (
                          <div key={room.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-slate-900">{room.name || room.id}</div>
                              <div className="flex items-center gap-2">
                                <span className={[
                                  "text-sm font-semibold",
                                  atCapacity ? "text-rose-600" : "text-slate-900",
                                ].join(" ")}>
                                  {room.presentCount}
                                </span>
                                {cap > 0 ? (
                                  <span className="text-xs text-slate-500">/ {cap}</span>
                                ) : null}
                                <span className="text-xs text-slate-400">present</span>
                              </div>
                            </div>
                            {cap > 0 ? (
                              <div className="mt-2">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={[
                                      "h-full rounded-full transition-all",
                                      atCapacity ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500",
                                    ].join(" ")}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <div className="mt-1 flex justify-between text-xs text-slate-500">
                                  <span>{room.childCount} enrolled</span>
                                  <span>{pct}% occupied</span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/attendance" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Take attendance</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Mark present and absent children for today.
                    </div>
                  </Link>
                  <Link href="/daily-reports" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">File daily reports</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Log meals, naps, mood, and activities for each child.
                    </div>
                  </Link>
                  <Link href="/incidents" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Report incident</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Document safety incidents for compliance records.
                    </div>
                  </Link>
                  <Link href="/children" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Child records</div>
                    <div className="mt-1 text-sm text-slate-600">
                      View profiles, medical notes, and classroom placement.
                    </div>
                  </Link>
                  <Link href="/billing" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Billing &amp; invoices</div>
                    <div className="mt-1 text-sm text-slate-600">
                      View family balances and invoice status.
                    </div>
                  </Link>
                  <Link href="/messages" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">Messages</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Communicate with families about their child.
                    </div>
                  </Link>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Today&apos;s attendance</CardTitle></CardHeader>
                <CardContent>
                  {children.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                      No children enrolled.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {children.slice(0, 8).map((child) => {
                        const roomName =
                          child.className ||
                          (child.roomId ? roomNameById[child.roomId] || child.roomId : "—");
                        const row = attendanceByChild[child.id] || null;
                        const status = (row?.status || "").toUpperCase();
                        const isPresent = status === "PRESENT" || status === "CHECKED_IN" || status === "CHECKED_OUT";
                        const isAbsent = status === "ABSENT";

                        return (
                          <div key={child.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {child.fullName || "Unnamed child"}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-500">{roomName}</span>
                                {row?.checkinAt ? (
                                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                                    <Clock className="h-2.5 w-2.5" />
                                    In {fmtTime(row.checkinAt)}
                                  </span>
                                ) : null}
                                {row?.checkoutAt ? (
                                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-500">
                                    <Clock className="h-2.5 w-2.5" />
                                    Out {fmtTime(row.checkoutAt)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <span
                              className={[
                                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                                isPresent
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : isAbsent
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700",
                              ].join(" ")}
                            >
                              {isPresent ? "Present" : isAbsent ? "Absent" : "Unmarked"}
                            </span>
                          </div>
                        );
                      })}
                      {children.length > 8 ? (
                        <Link href="/attendance" className="block text-sm font-medium text-slate-600 hover:text-slate-900">
                          View all {children.length} children &rarr;
                        </Link>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {reportCoverage.missing.length > 0 ? (
              <Card className="mt-6 rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Daily report coverage</CardTitle>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {reportCoverage.missing.length} missing
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${reportCoverage.total > 0 ? (reportCoverage.covered.length / reportCoverage.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-slate-500">
                      <span>{reportCoverage.covered.length} of {reportCoverage.total} reports filed</span>
                      <span>{reportCoverage.total > 0 ? Math.round((reportCoverage.covered.length / reportCoverage.total) * 100) : 0}%</span>
                    </div>
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">Still need reports</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {reportCoverage.missing.slice(0, 10).map((child) => {
                      const roomName =
                        child.className ||
                        (child.roomId ? roomNameById[child.roomId] || child.roomId : "");
                      return (
                        <div key={child.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{child.fullName || "Unnamed"}</div>
                            {roomName ? <div className="text-xs text-slate-500">{roomName}</div> : null}
                          </div>
                          <Link
                            href="/daily-reports"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <FileText className="h-3 w-3" />
                            File
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                  {reportCoverage.missing.length > 10 ? (
                    <div className="mt-2 text-xs text-slate-500">
                      + {reportCoverage.missing.length - 10} more children
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Recent family threads</CardTitle></CardHeader>
                <CardContent>
                  {recentThreads.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                      No message threads yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentThreads.map((thread) => (
                        <div key={thread.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {thread.childName || "General"}
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-1">
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
                <CardHeader><CardTitle>Classroom overview</CardTitle></CardHeader>
                <CardContent>
                  {rooms.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                      No rooms found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rooms.map((room) => {
                        const count = children.filter((child) => child.roomId === room.id || child.className === room.name).length;
                        const pct = room.capacity && room.capacity > 0 ? Math.round((count / room.capacity) * 100) : null;

                        return (
                          <div key={room.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-slate-900">{room.name || room.id}</div>
                              <div className="text-sm text-slate-500">
                                {count}{room.capacity ? ` / ${room.capacity}` : ""} children
                              </div>
                            </div>
                            {pct !== null ? (
                              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={[
                                    "h-full rounded-full",
                                    pct > 100 ? "bg-rose-500" : pct >= 90 ? "bg-amber-500" : "bg-emerald-500",
                                  ].join(" ")}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
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
