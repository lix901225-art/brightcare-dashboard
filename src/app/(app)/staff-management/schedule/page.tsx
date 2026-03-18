"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { TableSkeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/error";

type ScheduleEntry = {
  id: string;
  userId: string;
  staffName?: string | null;
  date: string;
  shiftType: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
};

type StaffUser = {
  id: string;
  displayName?: string | null;
  role?: string | null;
  roles?: string[];
};

const SHIFTS = [
  { value: "MORNING", label: "Morning", time: "07:30–12:30", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "AFTERNOON", label: "Afternoon", time: "12:30–17:30", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "FULL_DAY", label: "Full day", time: "07:30–17:30", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "OFF", label: "Off", time: "", color: "bg-slate-50 text-slate-400 border-slate-200" },
] as const;

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function shiftBadge(shiftType: string) {
  return SHIFTS.find((s) => s.value === shiftType)?.color || "bg-slate-50 text-slate-600 border-slate-200";
}

function shiftLabel(shiftType: string) {
  return SHIFTS.find((s) => s.value === shiftType)?.label || shiftType;
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addShift, setAddShift] = useState("FULL_DAY");

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekStart]);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const ws = weekStart.toISOString().slice(0, 10);
      const [schedRes, staffRes] = await Promise.all([
        apiFetch(`/schedule?weekStart=${ws}`),
        apiFetch("/admin/users"),
      ]);
      if (schedRes.ok) setSchedule(await schedRes.json());
      if (staffRes.ok) {
        const data = await staffRes.json();
        setStaff(
          (Array.isArray(data) ? data : []).filter(
            (u: StaffUser) => (u.role || "").toUpperCase() !== "PARENT"
          )
        );
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load schedule."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [weekStart]);

  async function addEntry() {
    try {
      setSaving(true);
      setError("");
      setOk("");
      if (!addUserId) throw new Error("Select a staff member.");
      if (!addDate) throw new Error("Select a date.");

      const res = await apiFetch("/schedule", {
        method: "POST",
        body: JSON.stringify({
          userId: addUserId,
          date: addDate,
          shiftType: addShift,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Failed: ${res.status}`);

      setOk("Schedule updated.");
      setShowAdd(false);
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to save schedule."));
    } finally {
      setSaving(false);
    }
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }
  function thisWeek() { setWeekStart(getMonday(new Date())); }

  // Build grid: staff x days
  const grid = useMemo(() => {
    return staff.map((s) => {
      const days = weekDates.map((d) => {
        const dateStr = d.toISOString().slice(0, 10);
        const entry = schedule.find(
          (e) => e.userId === s.id && e.date.slice(0, 10) === dateStr
        );
        return { date: d, dateStr, entry };
      });
      return { staff: s, days };
    });
  }, [staff, weekDates, schedule]);

  const dailyStaffCount = useMemo(() => {
    return weekDates.map((d) => {
      const dateStr = d.toISOString().slice(0, 10);
      return schedule.filter(
        (e) => e.date.slice(0, 10) === dateStr && e.shiftType !== "OFF"
      ).length;
    });
  }, [weekDates, schedule]);

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <div className="mb-4">
          <Link href="/staff-management" className="text-sm text-slate-500 hover:text-slate-700">
            &larr; Back to Staff & Users
          </Link>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Staff Schedule"
            description="Weekly shift assignments and BC child-to-staff ratio compliance."
          />
          <button onClick={() => setShowAdd(!showAdd)} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Add shift
          </button>
        </div>

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {showAdd && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>Add / update shift</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Staff member</div>
                  <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                    <option value="">Select staff...</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.displayName || s.id.slice(0, 8)}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Date</div>
                  <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Shift</div>
                  <select value={addShift} onChange={(e) => setAddShift(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                    {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label} {s.time ? `(${s.time})` : ""}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={addEntry} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setShowAdd(false)} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week navigation */}
        <div className="mb-4 flex items-center gap-3">
          <button onClick={prevWeek} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={thisWeek} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</button>
          <button onClick={nextWeek} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-slate-700">
            {weekDates[0]?.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} — {weekDates[6]?.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={8} />
        ) : (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Staff</th>
                    {weekDates.map((d, i) => (
                      <th key={i} className="px-2 py-3 text-center font-medium">
                        <div>{d.toLocaleDateString("en-CA", { weekday: "short" })}</div>
                        <div className="text-xs text-slate-400">{d.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map(({ staff: s, days }) => (
                    <tr key={s.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-900">{s.displayName || "Unnamed"}</td>
                      {days.map(({ dateStr, entry }) => (
                        <td key={dateStr} className="px-2 py-3 text-center">
                          {entry ? (
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${shiftBadge(entry.shiftType)}`}>
                              {shiftLabel(entry.shiftType)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Daily staff count row */}
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700 flex items-center gap-2">
                      <Users className="h-4 w-4" /> On duty
                    </td>
                    {dailyStaffCount.map((count, i) => (
                      <td key={i} className="px-2 py-3 text-center font-semibold text-slate-700">
                        {count}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGate>
  );
}
