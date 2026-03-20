"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MoreHorizontal, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatTime } from "@/lib/api-helpers";
import { attendanceBadge as badgeClass } from "@/lib/badge-styles";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

/* ─── types ─── */

type Child = {
  id: string;
  fullName?: string | null;
  preferredName?: string | null;
  status?: string | null;
  roomId?: string | null;
  className?: string | null;
};

type Room = { id: string; name?: string | null };

type AttendanceRow = {
  id?: string;
  childId: string;
  status?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  recordedAt?: string | null;
};

const SYMPTOMS = ["Fever", "Cough", "Runny nose", "Vomiting", "Rash", "Other"] as const;

function fmt(value?: string | null) {
  return formatTime(value) || "—";
}

/* ─── Health Check Modal ─── */

function HealthCheckModal({
  childName,
  onPass,
  onFail,
  onCancel,
  saving,
}: {
  childName: string;
  onPass: (data: { temperature?: number; symptoms: string[]; notes: string }) => void;
  onFail: (data: { temperature?: number; symptoms: string[]; notes: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [temperature, setTemperature] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  function toggleSymptom(s: string) {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function getData() {
    return {
      temperature: temperature ? parseFloat(temperature) : undefined,
      symptoms,
      notes: notes.trim(),
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Health Check</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Health screening for <strong>{childName}</strong> before check-in.
        </p>

        {/* Temperature */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Temperature &deg;C (optional)
          </label>
          <input
            type="number"
            step="0.1"
            min="35"
            max="42"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="e.g. 36.5"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          />
        </div>

        {/* Symptoms */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Symptoms
          </label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  symptoms.includes(s)
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional observations..."
            maxLength={500}
            className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            disabled={saving}
            onClick={() => onPass(getData())}
            className="flex-1 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.97]"
          >
            {saving ? "Saving..." : "Pass — Check in"}
          </button>
          <button
            disabled={saving}
            onClick={() => onFail(getData())}
            className="flex-1 inline-flex h-12 items-center justify-center rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 active:scale-[0.97]"
          >
            {saving ? "Saving..." : "Fail"}
          </button>
        </div>

        {symptoms.length > 0 && (
          <p className="mt-3 text-center text-xs text-amber-600">
            Symptoms reported — please verify before passing.
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Bulk Actions Menu ─── */

function BulkActionsMenu({
  stats,
  markingAll,
  onMarkAllPresent,
  onMarkAllAbsent,
  onBulkCheckOut,
}: {
  stats: { unknown: number; checkedIn: number };
  markingAll: boolean;
  onMarkAllPresent: () => void;
  onMarkAllAbsent: () => void;
  onBulkCheckOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (stats.unknown === 0 && stats.checkedIn === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        title="Bulk actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {stats.unknown > 0 && (
              <>
                <button
                  onClick={() => { onMarkAllPresent(); setOpen(false); }}
                  disabled={markingAll}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                  Mark all present ({stats.unknown})
                </button>
                <button
                  onClick={() => { onMarkAllAbsent(); setOpen(false); }}
                  disabled={markingAll}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  Mark all absent ({stats.unknown})
                </button>
              </>
            )}
            {stats.checkedIn > 0 && (
              <button
                onClick={() => { onBulkCheckOut(); setOpen(false); }}
                disabled={markingAll}
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-violet-700 hover:bg-violet-50 disabled:opacity-50"
              >
                End-of-day checkout ({stats.checkedIn})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Action Buttons ─── */

function ActionButtons({
  status,
  busy,
  onCheckIn,
  onCheckOut,
  onMarkPresent,
  onMarkAbsent,
  mobile,
}: {
  status: string;
  busy: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onMarkPresent: () => void;
  onMarkAbsent: () => void;
  mobile?: boolean;
}) {
  const base = mobile
    ? "inline-flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50"
    : "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium disabled:opacity-50";

  switch (status) {
    case "UNKNOWN":
      return (
        <>
          <button disabled={busy} onClick={onCheckIn} className={`${base} border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100`}>Check in</button>
          <button disabled={busy} onClick={onMarkAbsent} className={`${base} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}>Absent</button>
        </>
      );
    case "PRESENT":
      return (
        <>
          <button disabled={busy} onClick={onCheckOut} className={`${base} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>Check out</button>
          <button disabled={busy} onClick={onMarkAbsent} className={`${base} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}>Absent</button>
        </>
      );
    case "CHECKED_IN":
      return (
        <button disabled={busy} onClick={onCheckOut} className={`${base} border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100`}>Check out</button>
      );
    case "CHECKED_OUT":
      return mobile
        ? <span className="flex h-11 flex-1 items-center justify-center text-sm text-slate-400">Done for today</span>
        : <span className="inline-flex h-9 items-center px-3 text-sm text-slate-400">Done for today</span>;
    case "ABSENT":
      return (
        <button disabled={busy} onClick={onMarkPresent} className={`${base} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>Mark present</button>
      );
    default:
      return null;
  }
}

/* ─── Main Page ─── */

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
  const [statusFilter, setStatusFilter] = useState("");

  // Health check modal
  const [healthCheckChild, setHealthCheckChild] = useState<Child | null>(null);
  const [healthCheckSaving, setHealthCheckSaving] = useState(false);

  // Nap tracking
  const [activeNaps, setActiveNaps] = useState<Record<string, { id: string; startAt: string }>>({});
  const [completedNaps, setCompletedNaps] = useState<Record<string, { id: string; startAt: string; endAt: string; duration: number }[]>>({});
  const [napBusy, setNapBusy] = useState("");
  const [napTick, setNapTick] = useState(0);

  // Live timer for active naps
  useEffect(() => {
    if (Object.keys(activeNaps).length === 0) return;
    const timer = setInterval(() => setNapTick((t) => t + 1), 30000); // update every 30s
    return () => clearInterval(timer);
  }, [activeNaps]);

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

      // Load nap logs for today
      try {
        const napRes = await apiFetch(`/nap-logs?date=${date}`);
        if (napRes.ok) {
          const napData = await napRes.json();
          const active: Record<string, { id: string; startAt: string }> = {};
          const completed: Record<string, { id: string; startAt: string; endAt: string; duration: number }[]> = {};
          for (const nap of (Array.isArray(napData) ? napData : [])) {
            if (!nap.endAt) {
              active[nap.childId] = { id: nap.id, startAt: nap.startAt };
            } else {
              if (!completed[nap.childId]) completed[nap.childId] = [];
              completed[nap.childId].push({ id: nap.id, startAt: nap.startAt, endAt: nap.endAt, duration: nap.duration || 0 });
            }
          }
          setActiveNaps(active);
          setCompletedNaps(completed);
        }
      } catch { /* non-critical */ }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load attendance."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [date]);

  async function startNap(childId: string) {
    setNapBusy(childId);
    try {
      const res = await apiFetch("/nap-logs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.message || "Failed"); }
      const data = await res.json();
      setActiveNaps((prev) => ({ ...prev, [childId]: { id: data.id, startAt: data.startAt } }));
      setOk("Nap started");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to start nap."));
    } finally {
      setNapBusy("");
    }
  }

  async function endNap(childId: string) {
    const nap = activeNaps[childId];
    if (!nap) return;
    setNapBusy(childId);
    try {
      const res = await apiFetch(`/nap-logs/${nap.id}/end`, { method: "PATCH" });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.message || "Failed"); }
      const data = await res.json();
      // Remove from active
      setActiveNaps((prev) => { const copy = { ...prev }; delete copy[childId]; return copy; });
      // Add to completed
      const mins = data.duration || 0;
      setCompletedNaps((prev) => ({
        ...prev,
        [childId]: [...(prev[childId] || []), { id: nap.id, startAt: nap.startAt, endAt: data.endAt, duration: mins }],
      }));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      setOk(`Nap ended (${h > 0 ? `${h}h ` : ""}${m}min)`);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to end nap."));
    } finally {
      setNapBusy("");
    }
  }

  function fmtNapDuration(startAt: string) {
    void napTick; // force re-render from timer
    const mins = Math.floor((Date.now() - new Date(startAt).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

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
    if (statusFilter) {
      result = result.filter(({ attendance }) => {
        const s = (attendance?.status || "UNKNOWN").toUpperCase();
        if (statusFilter === "UNMARKED") return s === "UNKNOWN";
        if (statusFilter === "PRESENT") return s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT";
        if (statusFilter === "ABSENT") return s === "ABSENT";
        if (statusFilter === "CHECKED_IN") return s === "CHECKED_IN";
        return true;
      });
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;
    return result.filter(({ child, roomName, attendance }) =>
      [child.id, child.fullName, child.preferredName, roomName, attendance?.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query, roomFilter, filterChildId, statusFilter]);

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
        body: JSON.stringify({ entries: [{ childId, date, status }] }),
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

  // Open health check modal instead of direct check-in
  function initiateCheckIn(child: Child) {
    setHealthCheckChild(child);
  }

  async function completeCheckInWithHealthCheck(
    passed: boolean,
    data: { temperature?: number; symptoms: string[]; notes: string },
  ) {
    if (!healthCheckChild) return;
    const childId = healthCheckChild.id;

    try {
      setHealthCheckSaving(true);
      setError("");
      setOk("");

      // 1. Record health check
      const hcRes = await apiFetch("/health-checks", {
        method: "POST",
        body: JSON.stringify({
          childId,
          date,
          temperature: data.temperature,
          symptoms: data.symptoms.length > 0 ? data.symptoms : undefined,
          passedScreening: passed,
          notes: data.notes || undefined,
        }),
      });

      // Ignore 409 (already checked today) — just proceed
      if (!hcRes.ok && hcRes.status !== 409) {
        const hcData = await hcRes.json();
        throw new Error(hcData?.message || `Health check failed: ${hcRes.status}`);
      }

      if (!passed) {
        // Failed screening — don't check in
        setError(`${healthCheckChild.fullName || "Child"} failed health screening. Parent should be contacted.`);
        setHealthCheckChild(null);
        return;
      }

      // 2. Check in
      const res = await apiFetch("/attendance/checkin", {
        method: "POST",
        body: JSON.stringify({ childId, date }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData?.message || `Check-in failed: ${res.status}`);

      setOk(`${healthCheckChild.fullName || "Child"} checked in (health check passed).`);
      setHealthCheckChild(null);
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to complete check-in."));
    } finally {
      setHealthCheckSaving(false);
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
      if (failed > 0) setError(`${failed} check-out(s) failed.`);
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

      const entries = unmarked.map((r) => ({ childId: r.child.id, date, status }));
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
        {/* Health check modal */}
        {healthCheckChild && (
          <HealthCheckModal
            childName={healthCheckChild.fullName || healthCheckChild.id}
            saving={healthCheckSaving}
            onPass={(data) => completeCheckInWithHealthCheck(true, data)}
            onFail={(data) => completeCheckInWithHealthCheck(false, data)}
            onCancel={() => setHealthCheckChild(null)}
          />
        )}

        {/* Header — compact on mobile */}
        <div className="hidden md:block">
          <PageIntro
            title="Attendance"
            description="Daily attendance records for BC licensing compliance. Track check-in/out times and manage absences."
          />
        </div>
        <div className="mb-3 md:hidden">
          <h1 className="text-lg font-bold text-slate-900">Attendance</h1>
        </div>

        {/* Alerts */}
        {ok && (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-700">
            {ok}
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* ─── Stats: compact inline on mobile, cards on desktop ─── */}
        <div className="mb-3 flex items-center gap-3 text-xs text-slate-500 md:hidden">
          <span><strong className="text-slate-900">{stats.total}</strong> total</span>
          <span className="text-slate-300">|</span>
          <span><strong className="text-emerald-600">{stats.present}</strong> present</span>
          <span className="text-slate-300">|</span>
          <span><strong className="text-rose-600">{stats.absent}</strong> absent</span>
          <span className="text-slate-300">|</span>
          <span><strong className="text-amber-600">{stats.unknown}</strong> unmarked</span>
        </div>

        <div className="mb-6 hidden md:grid md:grid-cols-5 gap-4">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.total}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Present</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.present}</div>
              {stats.total > 0 && <div className="mt-1 text-xs text-emerald-600">{Math.round((stats.present / stats.total) * 100)}% attendance</div>}
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
              {stats.unknown > 0 && <div className="mt-1 text-xs text-amber-600">Needs attention</div>}
            </CardContent>
          </Card>
        </div>

        {/* ─── Search + filters row ─── */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 md:h-11 md:pl-10 md:pr-4"
            />
          </div>

          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="hidden h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none md:block md:h-11"
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
            className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none md:h-11 md:px-3"
          />

          <BulkActionsMenu
            stats={stats}
            markingAll={markingAll}
            onMarkAllPresent={() => markAll("PRESENT")}
            onMarkAllAbsent={() => markAll("ABSENT")}
            onBulkCheckOut={bulkCheckOut}
          />
        </div>

        {/* ─── Status filter chips ─── */}
        <div className="mb-3 flex flex-wrap gap-1.5 md:gap-2 md:mb-4">
          {([
            { value: "", label: "All", count: rows.length },
            { value: "UNMARKED", label: "Unmarked", count: stats.unknown },
            { value: "PRESENT", label: "Present", count: stats.present },
            { value: "ABSENT", label: "Absent", count: stats.absent },
            { value: "CHECKED_IN", label: "Checked in", count: stats.checkedIn },
          ] as const).map((chip) => (
            <button
              key={chip.value}
              onClick={() => setStatusFilter(chip.value)}
              className={[
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors md:gap-1.5 md:px-3 md:py-1.5",
                statusFilter === chip.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {chip.label}
              <span className={statusFilter === chip.value ? "text-white/70" : "text-slate-400"}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>

        {/* ─── Desktop: bulk action buttons (only on md+) ─── */}
        {(stats.unknown > 0 || stats.checkedIn > 0) && (
          <div className="mb-4 hidden md:flex flex-wrap gap-3">
            {stats.unknown > 0 && (
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
            )}
            {stats.checkedIn > 0 && (
              <button
                onClick={bulkCheckOut}
                disabled={markingAll}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
              >
                {markingAll ? "Processing..." : `End-of-day checkout (${stats.checkedIn})`}
              </button>
            )}
          </div>
        )}

        {/* ─── Child list ─── */}
        {loading ? (
          <div className="hidden md:block"><Card className="rounded-2xl border-0 shadow-sm"><CardContent className="pt-6"><TableSkeleton rows={6} cols={5} /></CardContent></Card></div>
        ) : filteredRows.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="pt-6">
              <FilteredEmptyState totalCount={children.length} filterLabel="search or filter" />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ─── Mobile card view ─── */}
            <div className="space-y-2 md:hidden">
              {filteredRows.map(({ child, roomName, attendance: att }) => {
                const status = (att?.status || "UNKNOWN").toUpperCase();
                const busy = savingId === child.id;
                return (
                  <div
                    key={child.id}
                    className={[
                      "rounded-xl border bg-white p-3",
                      busy ? "border-sky-200 bg-sky-50/30" : "border-slate-200",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {child.fullName || child.id}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{roomName}</span>
                          {att?.checkinAt && <span>In: {fmt(att.checkinAt)}</span>}
                          {att?.checkoutAt && <span>Out: {fmt(att.checkoutAt)}</span>}
                        </div>
                      </div>
                      <span className={["ml-2 inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", badgeClass(status)].join(" ")}>
                        {status}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <ActionButtons
                        status={status}
                        busy={busy}
                        onCheckIn={() => initiateCheckIn(child)}
                        onCheckOut={() => checkOut(child.id)}
                        onMarkPresent={() => mark(child.id, "PRESENT")}
                        onMarkAbsent={() => mark(child.id, "ABSENT")}
                        mobile
                      />
                    </div>
                    {/* Nap tracking for checked-in children */}
                    {(status === "CHECKED_IN" || status === "PRESENT") && (
                      <div className="mt-2 border-t border-slate-100 pt-2 space-y-1.5">
                        {/* Completed naps */}
                        {(completedNaps[child.id] || []).map((n) => {
                          const h = Math.floor(n.duration / 60);
                          const m = n.duration % 60;
                          return (
                            <div key={n.id} className="flex items-center gap-2 text-xs text-slate-500 px-1">
                              <span>✅</span>
                              <span>{fmt(n.startAt)} – {fmt(n.endAt)}</span>
                              <span className="font-medium text-slate-600">({h > 0 ? `${h}h ` : ""}{m}min)</span>
                            </div>
                          );
                        })}
                        {/* Active nap or Start button */}
                        {activeNaps[child.id] ? (
                          <button
                            disabled={napBusy === child.id}
                            onClick={() => endNap(child.id)}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            🌙 End Nap ({fmtNapDuration(activeNaps[child.id].startAt)})
                          </button>
                        ) : (
                          <button
                            disabled={napBusy === child.id}
                            onClick={() => startNap(child.id)}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                          >
                            {(completedNaps[child.id] || []).length > 0 ? "🌙 + Add another nap" : "🌙 Start Nap"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Desktop table view ─── */}
            <Card className="hidden md:block rounded-2xl border-0 shadow-sm">
              <CardHeader><CardTitle>Daily roster</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                      {filteredRows.map(({ child, roomName, attendance: att }) => {
                        const status = (att?.status || "UNKNOWN").toUpperCase();
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
                            <td className="px-4 py-3">{fmt(att?.checkinAt || att?.recordedAt)}</td>
                            <td className="px-4 py-3">{fmt(att?.checkoutAt)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <ActionButtons
                                  status={status}
                                  busy={busy}
                                  onCheckIn={() => initiateCheckIn(child)}
                                  onCheckOut={() => checkOut(child.id)}
                                  onMarkPresent={() => mark(child.id, "PRESENT")}
                                  onMarkAbsent={() => mark(child.id, "ABSENT")}
                                />
                                {(status === "CHECKED_IN" || status === "PRESENT") && (
                                  activeNaps[child.id] ? (
                                    <button disabled={napBusy === child.id} onClick={() => endNap(child.id)}
                                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                                      🌙 End Nap ({fmtNapDuration(activeNaps[child.id].startAt)})
                                    </button>
                                  ) : (
                                    <button disabled={napBusy === child.id} onClick={() => startNap(child.id)}
                                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                                      {(completedNaps[child.id] || []).length > 0 ? "🌙 + Nap" : "🌙 Nap"}
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
