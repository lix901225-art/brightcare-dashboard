"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatTime } from "@/lib/api-helpers";
import { attendanceBadge as badgeClass } from "@/lib/badge-styles";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

type Child = {
  id: string;
  fullName?: string | null;
  preferredName?: string | null;
  status?: string | null;
  roomId?: string | null;
  className?: string | null;
};

type Room = {
  id: string;
  name?: string | null;
};

type AttendanceRow = {
  id?: string;
  childId: string;
  status?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  recordedAt?: string | null;
};

function fmt(value?: string | null) {
  return formatTime(value) || "—";
}

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const filterChildId = searchParams.get("childId") || "";

  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomFilter, setRoomFilter] = useState("");

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [childrenRes, roomsRes, attendanceRes] = await Promise.all([
        apiFetch("/children"),
        apiFetch("/rooms"),
        apiFetch(`/attendance?date=${date}`),
      ]);

      const childrenData = await childrenRes.json();
      const roomsData = await roomsRes.json();
      const attendanceData = await attendanceRes.json();

      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);
      if (!roomsRes.ok) throw new Error(roomsData?.message || `Rooms failed: ${roomsRes.status}`);
      if (!attendanceRes.ok) throw new Error(attendanceData?.message || `Attendance failed: ${attendanceRes.status}`);

      setChildren(Array.isArray(childrenData) ? childrenData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load attendance."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [date]);

  const roomNameById = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, r.name || r.id])),
    [rooms]
  );

  const rows = useMemo(() => {
    const byChild = Object.fromEntries(attendance.map((a) => [a.childId, a]));
    return children.map((child) => {
      const att = byChild[child.id];
      return {
        child,
        attendance: att || null,
        roomName: child.className || (child.roomId ? roomNameById[child.roomId] || child.roomId : "—"),
      };
    });
  }, [children, attendance, roomNameById]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (filterChildId) {
      result = result.filter(({ child }) => child.id === filterChildId);
    }
    if (roomFilter) {
      result = result.filter(({ child }) => child.roomId === roomFilter);
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;
    return result.filter(({ child, roomName, attendance }) =>
      [
        child.id,
        child.fullName,
        child.preferredName,
        roomName,
        attendance?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query, roomFilter, filterChildId]);

  const stats = useMemo(() => {
    const statuses = rows.map((r) => (r.attendance?.status || "UNKNOWN").toUpperCase());
    return {
      total: rows.length,
      present: statuses.filter((s) => s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT").length,
      absent: statuses.filter((s) => s === "ABSENT").length,
      unknown: statuses.filter((s) => s === "UNKNOWN").length,
      checkedIn: statuses.filter((s) => s === "CHECKED_IN").length,
    };
  }, [rows]);

  async function mark(childId: string, status: "PRESENT" | "ABSENT") {
    try {
      setSavingId(childId);
      setError("");
      setOk("");

      const res = await apiFetch("/attendance/batch", {
        method: "POST",
        body: JSON.stringify({
          entries: [{ childId, date, status }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Attendance update failed: ${res.status}`);

      setOk("Attendance updated.");
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update attendance."));
    } finally {
      setSavingId("");
    }
  }

  async function checkIn(childId: string) {
    try {
      setSavingId(childId);
      setError("");
      setOk("");

      const res = await apiFetch("/attendance/checkin", {
        method: "POST",
        body: JSON.stringify({ childId, date }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Check-in failed: ${res.status}`);

      setOk("Checked in.");
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to check in."));
    } finally {
      setSavingId("");
    }
  }

  async function checkOut(childId: string) {
    try {
      setSavingId(childId);
      setError("");
      setOk("");

      const res = await apiFetch("/attendance/checkout", {
        method: "POST",
        body: JSON.stringify({ childId, date }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Check-out failed: ${res.status}`);

      setOk("Checked out.");
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to check out."));
    } finally {
      setSavingId("");
    }
  }

  async function bulkCheckOut() {
    const checkedIn = filteredRows.filter(
      (r) => (r.attendance?.status || "").toUpperCase() === "CHECKED_IN"
    );
    if (checkedIn.length === 0) {
      setOk("No checked-in children to check out.");
      return;
    }

    if (!confirm(`Check out ${checkedIn.length} children?`)) return;

    try {
      setMarkingAll(true);
      setError("");
      setOk("");

      const results = await Promise.allSettled(
        checkedIn.map((r) =>
          apiFetch("/attendance/checkout", {
            method: "POST",
            body: JSON.stringify({ childId: r.child.id, date }),
          }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data?.message || `Check-out failed for ${r.child.fullName}`);
            }
          })
        )
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        setError(`${failed} check-out(s) failed.`);
      }
      setOk(`${checkedIn.length - failed} children checked out.`);
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to bulk check out."));
    } finally {
      setMarkingAll(false);
    }
  }

  async function markAll(status: "PRESENT" | "ABSENT") {
    const unmarked = filteredRows.filter(
      (r) => !r.attendance || (r.attendance.status || "").toUpperCase() === "UNKNOWN"
    );
    if (unmarked.length === 0) {
      setOk("All children already have attendance marked.");
      return;
    }

    const label = status === "PRESENT" ? "present" : "absent";
    if (!confirm(`Mark ${unmarked.length} unmarked children as ${label}?`)) return;

    try {
      setMarkingAll(true);
      setError("");
      setOk("");

      const entries = unmarked.map((r) => ({
        childId: r.child.id,
        date,
        status,
      }));

      const res = await apiFetch("/attendance/batch", {
        method: "POST",
        body: JSON.stringify({ date, entries }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Batch mark failed: ${res.status}`);

      setOk(`${unmarked.length} children marked ${label}.`);
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to mark attendance."));
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <PageIntro
          title="Attendance"
          description="Daily roster, attendance status, and quick actions for operations."
        />

        {ok ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {ok}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.total}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Present</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.present}</div>
              {stats.total > 0 ? <div className="mt-1 text-xs text-emerald-600">{Math.round((stats.present / stats.total) * 100)}% attendance</div> : null}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Absent</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.absent}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Checked in</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.checkedIn}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Unmarked</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.unknown}</div>
              {stats.unknown > 0 ? <div className="mt-1 text-xs text-amber-600">Needs attention</div> : null}
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search child, room, status..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.name || room.id}</option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            />
          </div>
        </div>

        {(stats.unknown > 0 || stats.checkedIn > 0) ? (
          <div className="mb-6 flex flex-wrap gap-3">
            {stats.unknown > 0 ? (
              <>
                <button
                  onClick={() => markAll("PRESENT")}
                  disabled={markingAll}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {markingAll ? "Processing..." : `Mark all present (${stats.unknown})`}
                </button>
                <button
                  onClick={() => markAll("ABSENT")}
                  disabled={markingAll}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  Mark all absent
                </button>
              </>
            ) : null}
            {stats.checkedIn > 0 ? (
              <button
                onClick={bulkCheckOut}
                disabled={markingAll}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
              >
                {markingAll ? "Processing..." : `End-of-day checkout (${stats.checkedIn})`}
              </button>
            ) : null}
          </div>
        ) : null}

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Daily roster</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : filteredRows.length === 0 ? (
              <FilteredEmptyState
                totalCount={children.length}
                filterLabel="search or filter"
              />
            ) : (
              <>
                {/* Mobile card view */}
                <div className="space-y-3 md:hidden">
                  {filteredRows.map(({ child, roomName, attendance }) => {
                    const status = (attendance?.status || "UNKNOWN").toUpperCase();
                    const busy = savingId === child.id;
                    return (
                      <div key={child.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-slate-900">{child.fullName || child.id}</div>
                            <div className="text-xs text-slate-500">{roomName}</div>
                          </div>
                          <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", badgeClass(status)].join(" ")}>
                            {status}
                          </span>
                        </div>
                        {(attendance?.checkinAt || attendance?.checkoutAt) && (
                          <div className="mt-2 flex gap-4 text-xs text-slate-500">
                            {attendance?.checkinAt && <span>In: {fmt(attendance.checkinAt)}</span>}
                            {attendance?.checkoutAt && <span>Out: {fmt(attendance.checkoutAt)}</span>}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(status === "UNKNOWN" || status === "ABSENT") && (
                            <>
                              <button disabled={busy} onClick={() => checkIn(child.id)} className="inline-flex h-8 items-center rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-medium text-sky-700 disabled:opacity-50">Check in</button>
                              <button disabled={busy} onClick={() => mark(child.id, "PRESENT")} className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 disabled:opacity-50">Present</button>
                              {status !== "ABSENT" && <button disabled={busy} onClick={() => mark(child.id, "ABSENT")} className="inline-flex h-8 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 disabled:opacity-50">Absent</button>}
                            </>
                          )}
                          {status === "PRESENT" && (
                            <>
                              <button disabled={busy} onClick={() => checkIn(child.id)} className="inline-flex h-8 items-center rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-medium text-sky-700 disabled:opacity-50">Check in</button>
                              <button disabled={busy} onClick={() => mark(child.id, "ABSENT")} className="inline-flex h-8 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 disabled:opacity-50">Absent</button>
                            </>
                          )}
                          {status === "CHECKED_IN" && (
                            <button disabled={busy} onClick={() => checkOut(child.id)} className="inline-flex h-8 items-center rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-medium text-violet-700 disabled:opacity-50">Check out</button>
                          )}
                          {status === "CHECKED_OUT" && <span className="text-xs text-slate-400">Done for today</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Child</th>
                        <th className="px-4 py-3 font-medium">Room</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Check-in</th>
                        <th className="px-4 py-3 font-medium">Check-out</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(({ child, roomName, attendance }) => {
                        const status = (attendance?.status || "UNKNOWN").toUpperCase();
                        const busy = savingId === child.id;

                        return (
                          <tr key={child.id} className="border-t border-slate-200">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{child.fullName || child.id}</div>
                              <div className="text-xs text-slate-500">{child.preferredName || "—"}</div>
                            </td>
                            <td className="px-4 py-3">{roomName}</td>
                            <td className="px-4 py-3">
                              <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", badgeClass(status)].join(" ")}>
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3">{fmt(attendance?.checkinAt || attendance?.recordedAt)}</td>
                            <td className="px-4 py-3">{fmt(attendance?.checkoutAt)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {status === "UNKNOWN" || status === "ABSENT" ? (
                                  <>
                                    <button
                                      disabled={busy}
                                      onClick={() => checkIn(child.id)}
                                      className="inline-flex h-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                                    >
                                      Check in
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => mark(child.id, "PRESENT")}
                                      className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                    >
                                      Present
                                    </button>
                                    {status !== "ABSENT" ? (
                                      <button
                                        disabled={busy}
                                        onClick={() => mark(child.id, "ABSENT")}
                                        className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                      >
                                        Absent
                                      </button>
                                    ) : null}
                                  </>
                                ) : null}
                                {status === "PRESENT" ? (
                                  <>
                                    <button
                                      disabled={busy}
                                      onClick={() => checkIn(child.id)}
                                      className="inline-flex h-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                                    >
                                      Check in
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => mark(child.id, "ABSENT")}
                                      className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                    >
                                      Absent
                                    </button>
                                  </>
                                ) : null}
                                {status === "CHECKED_IN" ? (
                                  <button
                                    disabled={busy}
                                    onClick={() => checkOut(child.id)}
                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-3 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                                  >
                                    Check out
                                  </button>
                                ) : null}
                                {status === "CHECKED_OUT" ? (
                                  <span className="inline-flex h-9 items-center px-3 text-sm text-slate-400">Done for today</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
