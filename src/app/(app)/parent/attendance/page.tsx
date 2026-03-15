"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

type Child = {
  id: string;
  fullName?: string | null;
  preferredName?: string | null;
  roomId?: string | null;
};

type AttendanceRow = {
  id: string;
  childId: string;
  status?: string | null;
  date?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

function fmtTime(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDate(value: string) {
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekDays(anchor: Date): string[] {
  const day = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(isoDate(d));
  }
  return days;
}

function statusLabel(status?: string | null) {
  const s = (status || "").toUpperCase();
  if (s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT") return "Present";
  if (s === "ABSENT") return "Absent";
  return "Not marked";
}

function statusColor(status?: string | null) {
  const s = (status || "").toUpperCase();
  if (s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "ABSENT") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

export default function ParentAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = useMemo(() => isoDate(new Date()), []);

  const anchorDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);

  const weekLabel = useMemo(() => {
    const start = new Date(weekDays[0] + "T00:00:00");
    const end = new Date(weekDays[6] + "T00:00:00");
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString([], opts)} – ${end.toLocaleDateString([], opts)}`;
  }, [weekDays]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [childrenRes, attendanceRes] = await Promise.all([
        apiFetch("/children"),
        apiFetch("/attendance"),
      ]);
      const childrenData = await childrenRes.json();
      const attendanceData = await attendanceRes.json();
      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);
      if (!attendanceRes.ok) throw new Error(attendanceData?.message || `Attendance failed: ${attendanceRes.status}`);
      setChildren(Array.isArray(childrenData) ? childrenData : []);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (e: any) {
      setError(e?.message || "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const attendanceByChildAndDate = useMemo(() => {
    const map: Record<string, Record<string, AttendanceRow>> = {};
    for (const row of attendance) {
      if (!row.childId || !row.date) continue;
      const dateKey = String(row.date).slice(0, 10);
      if (!map[row.childId]) map[row.childId] = {};
      map[row.childId][dateKey] = row;
    }
    return map;
  }, [attendance]);

  const todayRows = useMemo(() => {
    return children.map((child) => {
      const row = attendanceByChildAndDate[child.id]?.[today] || null;
      return { child, row };
    });
  }, [children, attendanceByChildAndDate, today]);

  const stats = useMemo(() => {
    const present = todayRows.filter(({ row }) => {
      const s = (row?.status || "").toUpperCase();
      return s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT";
    }).length;
    const checkedIn = todayRows.filter(({ row }) => (row?.status || "").toUpperCase() === "CHECKED_IN").length;
    return { total: children.length, present, checkedIn };
  }, [todayRows, children.length]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <div>
        <div className="mb-4">
          <Link href="/parent" className="text-sm text-slate-500 hover:text-slate-700">
            &larr; Back to parent home
          </Link>
        </div>

        <PageIntro
          title="Attendance"
          description="Track your child's check-in and check-out times."
        />

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading attendance...
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">My children</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-semibold">{stats.total}</div></CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Present today</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{stats.present}</div>
                  <div className="mt-1 text-xs text-slate-500">of {stats.total} children</div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Currently checked in</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{stats.checkedIn}</div>
                  <div className="mt-1 text-xs text-slate-500">at the center now</div>
                </CardContent>
              </Card>
            </div>

            {/* Today's detail */}
            <Card className="mt-6 rounded-2xl border-0 shadow-sm">
              <CardHeader><CardTitle>Today &mdash; {fmtDate(today)}</CardTitle></CardHeader>
              <CardContent>
                {todayRows.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">No children found.</div>
                ) : (
                  <div className="space-y-3">
                    {todayRows.map(({ child, row }) => (
                      <div key={child.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {child.fullName || "Unnamed child"}
                            </div>
                            {(row?.checkinAt || row?.checkoutAt) ? (
                              <div className="mt-2 flex flex-wrap gap-3">
                                {row.checkinAt ? (
                                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                    <Clock className="h-3 w-3" />
                                    In: {fmtTime(row.checkinAt)}
                                  </div>
                                ) : null}
                                {row.checkoutAt ? (
                                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    <Clock className="h-3 w-3" />
                                    Out: {fmtTime(row.checkoutAt)}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-slate-400">No check-in/check-out times recorded</div>
                            )}
                          </div>
                          <span className={["inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium", statusColor(row?.status)].join(" ")}>
                            {statusLabel(row?.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly view */}
            <Card className="mt-6 rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Weekly view</CardTitle>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWeekOffset((w) => w - 1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-[140px] text-center text-sm font-medium text-slate-700">
                      {weekLabel}
                    </span>
                    <button
                      onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
                      disabled={weekOffset >= 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {weekOffset !== 0 ? (
                      <button
                        onClick={() => setWeekOffset(0)}
                        className="ml-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        This week
                      </button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Child</th>
                        {weekDays.map((day) => (
                          <th
                            key={day}
                            className={[
                              "pb-3 text-center text-xs font-medium uppercase tracking-wide",
                              day === today ? "text-slate-900" : "text-slate-500",
                            ].join(" ")}
                          >
                            {fmtDate(day).split(",")[0]}
                            {day === today ? (
                              <div className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-emerald-500" />
                            ) : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((child) => (
                        <tr key={child.id} className="border-b border-slate-50">
                          <td className="py-3 pr-4 text-sm font-medium text-slate-900">
                            {child.fullName || "Unnamed"}
                          </td>
                          {weekDays.map((day) => {
                            const row = attendanceByChildAndDate[child.id]?.[day] || null;
                            const s = (row?.status || "").toUpperCase();
                            const isPresent = s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT";
                            const isAbsent = s === "ABSENT";
                            const isFuture = day > today;

                            return (
                              <td key={day} className="py-3 text-center">
                                {isFuture ? (
                                  <span className="text-xs text-slate-300">&mdash;</span>
                                ) : isPresent ? (
                                  <div>
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                                      ✓
                                    </span>
                                    {(row?.checkinAt || row?.checkoutAt) ? (
                                      <div className="mt-1 text-[10px] leading-tight text-slate-400">
                                        {fmtTime(row?.checkinAt) || ""}
                                        {row?.checkinAt && row?.checkoutAt ? "–" : ""}
                                        {fmtTime(row?.checkoutAt) || ""}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : isAbsent ? (
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-xs font-medium text-rose-600">
                                    ✕
                                  </span>
                                ) : (
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
                                    &mdash;
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleGate>
  );
}
