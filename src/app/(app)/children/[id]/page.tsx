"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Check, ChevronLeft, Clock, FileText, Heart, Pencil, Plus, Save, Shield, Syringe, Star, X } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toDateInput } from "@/lib/api-helpers";
import { getErrorMessage } from "@/lib/error";

type Child = {
  id: string;
  fullName: string;
  preferredName?: string | null;
  dob?: string | null;
  gender?: string | null;
  startDate?: string | null;
  status?: string | null;
  roomId?: string | null;
  className?: string | null;
  allergies?: string | null;
  medicalNotes?: string | null;
  emergencyNotes?: string | null;
  pickupNotes?: string | null;
  napNotes?: string | null;
  mealNotes?: string | null;
  languageNotes?: string | null;
  specialConsiderations?: string | null;
};

type Room = {
  id: string;
  name?: string | null;
};

type GuardianLink = {
  id: string;
  guardianUserId: string;
  guardianName?: string;
  guardianPhone?: string | null;
  relation?: string | null;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  isPickupAuthorized?: boolean;
  hasPortalAccess?: boolean;
};

type AttendanceRow = { id: string; childId: string; status?: string | null; date?: string | null; checkinAt?: string | null; checkoutAt?: string | null };
type IncidentRow = { id: string; childId: string; severity: string; type: string; occurredAt: string; description: string };
type DailyReportRow = { id: string; childId?: string | null; date?: string | null; mood?: string | null };

type ProfileForm = {
  fullName: string;
  preferredName: string;
  dob: string;
  gender: string;
  startDate: string;
  status: string;
  roomId: string;
  allergies: string;
  medicalNotes: string;
  emergencyNotes: string;
  pickupNotes: string;
  napNotes: string;
  mealNotes: string;
  languageNotes: string;
  specialConsiderations: string;
};

function Flag({ on, label }: { on?: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        on
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-500",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function makeForm(child: Child): ProfileForm {
  return {
    fullName: child.fullName || "",
    preferredName: child.preferredName || "",
    dob: toDateInput(child.dob),
    gender: child.gender || "",
    startDate: toDateInput(child.startDate),
    status: child.status || "ACTIVE",
    roomId: child.roomId || "",
    allergies: child.allergies || "",
    medicalNotes: child.medicalNotes || "",
    emergencyNotes: child.emergencyNotes || "",
    pickupNotes: child.pickupNotes || "",
    napNotes: child.napNotes || "",
    mealNotes: child.mealNotes || "",
    languageNotes: child.languageNotes || "",
    specialConsiderations: child.specialConsiderations || "",
  };
}

export default function ChildDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [guardians, setGuardians] = useState<GuardianLink[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRow[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<IncidentRow[]>([]);
  const [recentReports, setRecentReports] = useState<DailyReportRow[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        setOk("");

        // Fetch child directly by ID + supporting data in parallel
        // Attendance & incidents use child-filtered endpoints when available,
        // with fallback to fetching all and filtering client-side
        const [childRes, guardiansRes, roomsRes, attendanceRes, incidentsRes, reportsRes] = await Promise.all([
          apiFetch(`/children/${id}`).catch(() => apiFetch("/children")),
          apiFetch(`/children/${id}/guardians`),
          apiFetch("/rooms"),
          apiFetch(`/attendance?childId=${id}`).catch(() => apiFetch("/attendance")),
          apiFetch(`/incidents?childId=${id}`).catch(() => apiFetch("/incidents")),
          apiFetch(`/daily-reports?childId=${id}`),
        ]);

        const childData = await childRes.json();
        const guardiansData = await guardiansRes.json();
        const roomsData = await roomsRes.json();

        if (!childRes.ok && !Array.isArray(childData)) throw new Error(childData?.message || `Child load failed: ${childRes.status}`);
        if (!guardiansRes.ok) throw new Error(guardiansData?.message || `Guardians load failed: ${guardiansRes.status}`);
        if (!roomsRes.ok) throw new Error(roomsData?.message || `Rooms load failed: ${roomsRes.status}`);

        // Handle both direct child response and array-of-all-children fallback
        const found = Array.isArray(childData)
          ? childData.find((x: Child) => x.id === id) || null
          : (childData?.id ? childData as Child : null);

        const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
        const incidentsData = incidentsRes.ok ? await incidentsRes.json() : [];
        const reportsData = reportsRes.ok ? await reportsRes.json() : [];

        if (alive) {
          setChild(found);
          setForm(found ? makeForm(found) : null);
          setGuardians(Array.isArray(guardiansData) ? guardiansData : []);
          setRooms(Array.isArray(roomsData) ? roomsData : []);

          // Attendance for this child, latest 5 (may already be filtered by API)
          const allAttendance = Array.isArray(attendanceData) ? attendanceData : [];
          const childAttendance = allAttendance
            .filter((a: AttendanceRow) => a.childId === id)
            .sort((a: AttendanceRow, b: AttendanceRow) => (b.date || "").localeCompare(a.date || ""))
            .slice(0, 5);
          setRecentAttendance(childAttendance);

          // Incidents for this child, latest 3 (may already be filtered by API)
          const allIncidents = Array.isArray(incidentsData) ? incidentsData : [];
          const childIncidents = allIncidents
            .filter((i: IncidentRow) => i.childId === id)
            .sort((a: IncidentRow, b: IncidentRow) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, 3);
          setRecentIncidents(childIncidents);

          // Daily reports for this child, latest 3
          const childReports = (Array.isArray(reportsData) ? reportsData : [])
            .sort((a: DailyReportRow, b: DailyReportRow) => (b.date || "").localeCompare(a.date || ""))
            .slice(0, 3);
          setRecentReports(childReports);
        }
      } catch (e: unknown) {
        if (alive) setError(getErrorMessage(e, "Unable to load child details."));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const roomNameById = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, r.name || r.id])),
    [rooms]
  );

  if (loading) {
    return <div className="text-sm text-slate-500">Loading child profile...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!child || !form) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Child not found.
      </div>
    );
  }

  const roomLabel = child.className || (child.roomId && roomNameById[child.roomId]) || child.roomId || "—";

  async function saveProfile() {
    if (!form) return;
    try {
      setSaving(true);
      setError("");
      setOk("");

      const payload = {
        fullName: form.fullName.trim(),
        preferredName: form.preferredName.trim() || undefined,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        startDate: form.startDate || undefined,
        status: form.status || undefined,
        roomId: form.roomId || undefined,
        allergies: form.allergies || undefined,
        medicalNotes: form.medicalNotes || undefined,
        emergencyNotes: form.emergencyNotes || undefined,
        pickupNotes: form.pickupNotes || undefined,
        napNotes: form.napNotes || undefined,
        mealNotes: form.mealNotes || undefined,
        languageNotes: form.languageNotes || undefined,
        specialConsiderations: form.specialConsiderations || undefined,
      };

      const res = await apiFetch(`/children/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Save failed: ${res.status}`);

      setChild(data);
      setForm(makeForm(data));
      setEditing(false);
      setOk("Child profile saved.");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to save child profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
    <div>
      <div className="mb-4">
        <Link href="/children" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" />
          Back to children
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageIntro
          title={child.fullName}
          description={`Preferred: ${child.preferredName || "—"} · Room: ${roomLabel}`}
        />
        <div className="flex gap-2">
          {!editing ? (
            <button
              onClick={() => {
                setEditing(true);
                setOk("");
                setError("");
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit profile
            </button>
          ) : (
            <>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setForm(makeForm(child));
                  setOk("");
                  setError("");
                }}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {ok ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div> : null}
      {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Status</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{child.status || "—"}</div></CardContent></Card>
        <Card className="rounded-2xl border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">DOB</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{child.dob ? String(child.dob).split("T")[0] : "—"}</div></CardContent></Card>
        <Card className="rounded-2xl border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Start date</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{child.startDate ? String(child.startDate).split("T")[0] : "—"}</div></CardContent></Card>
        <Card className="rounded-2xl border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Room</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{roomLabel}</div></CardContent></Card>
      </div>

      {/* Medical / Safety alerts */}
      {(child.allergies || child.medicalNotes || child.emergencyNotes) ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {child.allergies ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-600">Allergies</div>
                <div className="mt-1 text-sm font-medium text-rose-800">{child.allergies}</div>
              </div>
            </div>
          ) : null}
          {child.medicalNotes ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Heart className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Medical</div>
                <div className="mt-1 text-sm text-amber-800">{child.medicalNotes}</div>
              </div>
            </div>
          ) : null}
          {child.emergencyNotes ? (
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-sky-600">Emergency</div>
                <div className="mt-1 text-sm text-sky-800">{child.emergencyNotes}</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/guardians?childId=${encodeURIComponent(id)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Guardians</Link>
        <Link href={`/attendance?childId=${encodeURIComponent(id)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Attendance</Link>
        <Link href={`/daily-reports?childId=${encodeURIComponent(id)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Daily Reports</Link>
        <Link href={`/messages?childId=${encodeURIComponent(id)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Messages</Link>
        <Link href={`/documents?childId=${encodeURIComponent(id)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Documents</Link>
        <Link href={`/billing?childId=${encodeURIComponent(id)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Billing</Link>
      </div>

      {/* Enrollment readiness checklist — BC licensing inspection prep */}
      {(() => {
        const checks = [
          { label: "Room assigned", ok: !!child.roomId, fix: "Assign a room in the profile editor", editField: true },
          { label: "DOB on file", ok: !!child.dob, fix: "Add date of birth", editField: true },
          { label: "Primary guardian", ok: guardians.some((g) => g.isPrimaryContact), fix: "Link a primary contact guardian", link: `/guardians?childId=${encodeURIComponent(id)}` },
          { label: "Emergency contact", ok: guardians.some((g) => g.isEmergencyContact), fix: "Designate an emergency contact", link: `/guardians?childId=${encodeURIComponent(id)}` },
          { label: "Pickup authorization", ok: guardians.some((g) => g.isPickupAuthorized), fix: "Authorize at least one pickup person", link: `/guardians?childId=${encodeURIComponent(id)}` },
          { label: "Allergies documented", ok: !!child.allergies, fix: "Document allergies or mark 'None known'", editField: true },
          { label: "Medical notes", ok: !!child.medicalNotes, fix: "Add medical info or mark 'None'", editField: true },
        ];
        const passed = checks.filter((c) => c.ok).length;
        const total = checks.length;
        const allGood = passed === total;
        const pct = Math.round((passed / total) * 100);

        return (
          <Card className={`mt-6 rounded-2xl border-0 shadow-sm ${allGood ? "" : "ring-1 ring-amber-200"}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Enrolment readiness
                </CardTitle>
                <span className={[
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                  allGood ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700",
                ].join(" ")}>
                  {allGood ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {passed}/{total}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${allGood ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-rose-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {checks.map((c) => (
                  <div key={c.label} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${c.ok ? "text-emerald-700" : "text-slate-600"}`}>
                    {c.ok ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    )}
                    <span className={c.ok ? "" : "font-medium"}>{c.label}</span>
                    {!c.ok && c.link ? (
                      <Link href={c.link} className="ml-auto text-xs font-medium text-amber-600 hover:text-amber-700">Fix →</Link>
                    ) : !c.ok && c.editField ? (
                      <button onClick={() => { setEditing(true); setOk(""); setError(""); }} className="ml-auto text-xs font-medium text-amber-600 hover:text-amber-700">Edit →</button>
                    ) : null}
                  </div>
                ))}
              </div>
              {allGood ? (
                <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  This child&apos;s file is complete and inspection-ready per BC Community Care licensing requirements.
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {total - passed} item{total - passed > 1 ? "s" : ""} missing — complete before next licensing inspection.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Child profile</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            {!editing ? (
              <>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Preferred name</div><div>{child.preferredName || "—"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Gender</div><div>{child.gender || "—"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Allergies</div><div>{child.allergies || "—"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Medical notes</div><div>{child.medicalNotes || "—"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Emergency notes</div><div>{child.emergencyNotes || "—"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Pickup notes</div><div>{child.pickupNotes || "—"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Nap notes</div><div>{child.napNotes || "—"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Meal notes</div><div>{child.mealNotes || "—"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Language notes</div><div>{child.languageNotes || "—"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Special considerations</div><div>{child.specialConsiderations || "—"}</div></div>
              </>
            ) : (
              <div className="grid gap-4">
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Full name</span>
                  <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 outline-none" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Preferred name</span>
                  <input value={form.preferredName} maxLength={100} onChange={(e) => setForm({ ...form, preferredName: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 outline-none" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-slate-400">DOB</span>
                  <input type="date" value={form.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 outline-none" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Gender</span>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 outline-none">
                    <option value="">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Start date</span>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 outline-none" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Status</span>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 outline-none">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="WAITLIST">WAITLIST</option>
                    <option value="WITHDRAWN">WITHDRAWN</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Room</span>
                  <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 outline-none">
                    <option value="">Unassigned</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>{room.name || room.id}</option>
                    ))}
                  </select>
                </label>
                {([
                  ["allergies", "Allergies"],
                  ["medicalNotes", "Medical notes"],
                  ["emergencyNotes", "Emergency notes"],
                  ["pickupNotes", "Pickup notes"],
                  ["napNotes", "Nap notes"],
                  ["mealNotes", "Meal notes"],
                  ["languageNotes", "Language notes"],
                  ["specialConsiderations", "Special considerations"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
                    <textarea
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      maxLength={2000}
                      className="min-h-24 max-h-48 rounded-xl border border-slate-200 px-3 py-2 outline-none"
                    />
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Guardians</CardTitle>
              <Link
                href={`/guardians?childId=${encodeURIComponent(id)}`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Manage &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {guardians.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No guardians linked.{" "}
                <Link href={`/guardians?childId=${encodeURIComponent(id)}`} className="font-medium text-slate-700 hover:text-slate-900">
                  Add guardian &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {guardians.map((g) => (
                  <div key={g.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{g.guardianName || g.guardianUserId}</div>
                        <div className="mt-1 text-sm text-slate-500">{g.guardianPhone || "No phone"}{g.relation ? ` · ${g.relation}` : ""}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Flag on={g.isPrimaryContact} label="Primary" />
                        <Flag on={g.isEmergencyContact} label="Emergency" />
                        <Flag on={g.isPickupAuthorized} label="Pickup" />
                        <Flag on={g.hasPortalAccess} label="Portal" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent attendance</CardTitle>
              <Link href={`/attendance?childId=${encodeURIComponent(id)}`} className="text-xs font-medium text-slate-500 hover:text-slate-700">View all &rarr;</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <div className="text-xs text-slate-400">No attendance records.</div>
            ) : (
              <div className="space-y-1.5">
                {recentAttendance.map((a) => {
                  const s = (a.status || "").toUpperCase();
                  const isPresent = s === "PRESENT" || s === "CHECKED_IN" || s === "CHECKED_OUT";
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5">
                      <span className="text-xs text-slate-600">{a.date ? String(a.date).slice(0, 10) : "—"}</span>
                      <span className={["text-xs font-medium", isPresent ? "text-emerald-600" : s === "ABSENT" ? "text-rose-600" : "text-slate-400"].join(" ")}>
                        {s || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent daily reports</CardTitle>
              <Link href={`/daily-reports?childId=${encodeURIComponent(id)}`} className="text-xs font-medium text-slate-500 hover:text-slate-700">View all &rarr;</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="text-xs text-slate-400">No reports filed.</div>
            ) : (
              <div className="space-y-1.5">
                {recentReports.map((r) => (
                  <Link
                    key={r.id}
                    href={`/daily-reports/${encodeURIComponent(r.id)}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5 hover:bg-slate-50"
                  >
                    <span className="text-xs text-slate-600">{r.date ? String(r.date).slice(0, 10) : "—"}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <FileText className="h-3 w-3" />
                      {r.mood || "Report"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent incidents</CardTitle>
              <Link href="/incidents" className="text-xs font-medium text-slate-500 hover:text-slate-700">View all &rarr;</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <div className="text-xs text-emerald-500">No incidents recorded.</div>
            ) : (
              <div className="space-y-1.5">
                {recentIncidents.map((inc) => (
                  <div key={inc.id} className="rounded-lg border border-slate-100 px-2.5 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">{inc.type}</span>
                      <span className={[
                        "inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                        inc.severity.toLowerCase() === "critical" || inc.severity.toLowerCase() === "high"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 text-slate-600",
                      ].join(" ")}>
                        {inc.severity}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {new Date(inc.occurredAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Immunization tracking (BC guidelines) ─── */}
      <ImmunizationSection childId={id} />

      {/* ─── Developmental milestones ─── */}
      <MilestonesSection childId={id} childDob={child.dob} />
    </div>
    </RoleGate>
  );
}

/* ─── BC Immunization Record Tracking ─── */

const BC_IMMUNIZATIONS = [
  { name: "DTaP-IPV-Hib", ages: "2mo, 4mo, 6mo, 18mo" },
  { name: "Pneumococcal conjugate", ages: "2mo, 4mo, 12mo" },
  { name: "Rotavirus", ages: "2mo, 4mo" },
  { name: "MMR", ages: "12mo, 4-6yr" },
  { name: "Varicella", ages: "12mo, 4-6yr" },
  { name: "Meningococcal C", ages: "12mo" },
  { name: "Hepatitis B", ages: "Grade 6 (or infant)" },
  { name: "DTaP-IPV (booster)", ages: "4-6yr" },
];

type ImmunizationRecord = {
  id: string;
  childId: string;
  vaccineName: string;
  dateAdministered?: string | null;
  provider?: string | null;
  notes?: string | null;
};

function ImmunizationSection({ childId }: { childId: string }) {
  const [records, setRecords] = useState<ImmunizationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vaccineName, setVaccineName] = useState(BC_IMMUNIZATIONS[0].name);
  const [dateAdministered, setDateAdministered] = useState("");
  const [provider, setProvider] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/children/${childId}/immunizations`);
        if (res.ok) {
          const data = await res.json();
          setRecords(Array.isArray(data) ? data : []);
        }
      } catch {
        /* endpoint may not exist yet */
      } finally {
        setLoading(false);
      }
    })();
  }, [childId]);

  async function addRecord() {
    try {
      setSaving(true);
      const res = await apiFetch(`/children/${childId}/immunizations`, {
        method: "POST",
        body: JSON.stringify({
          vaccineName,
          dateAdministered: dateAdministered || undefined,
          provider: provider.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecords((prev) => [...prev, data]);
        setShowAdd(false);
        setVaccineName(BC_IMMUNIZATIONS[0].name);
        setDateAdministered("");
        setProvider("");
      }
    } catch {
      /* silent — backend may not support yet */
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-6 rounded-2xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="h-4 w-4" />
            Immunization records
          </CardTitle>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
          Per BC Community Care and Assisted Living Act — immunization records must be on file for all enrolled children.
        </div>

        {showAdd ? (
          <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
            <select
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              {BC_IMMUNIZATIONS.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.ages})
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
            <input
              type="date"
              value={dateAdministered}
              onChange={(e) => setDateAdministered(e.target.value)}
              placeholder="Date administered"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            />
            <div className="flex gap-2">
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Provider"
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
              />
              <button
                onClick={addRecord}
                disabled={saving}
                className="inline-flex h-10 items-center rounded-xl bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "..." : "Save"}
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-sm text-slate-500">
            No immunization records on file.{" "}
            <button onClick={() => setShowAdd(true)} className="font-medium text-slate-700 hover:text-slate-900">
              Add the first record &rarr;
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-700">{r.vaccineName}</div>
                  {r.provider ? <div className="text-xs text-slate-400">{r.provider}</div> : null}
                </div>
                <div className="text-xs text-slate-500">
                  {r.dateAdministered ? String(r.dateAdministered).slice(0, 10) : "Date unknown"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BC schedule reference */}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            BC immunization schedule reference
          </summary>
          <div className="mt-2 grid gap-1 text-xs text-slate-500">
            {BC_IMMUNIZATIONS.map((v) => (
              <div key={v.name} className="flex justify-between rounded px-2 py-1 odd:bg-slate-50">
                <span>{v.name}</span>
                <span className="text-slate-400">{v.ages}</span>
              </div>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

/* ─── Developmental Milestones ─── */

const MILESTONE_CATEGORIES = [
  "Physical / Motor",
  "Language / Communication",
  "Cognitive",
  "Social / Emotional",
  "Self-care",
] as const;

type Milestone = {
  id: string;
  childId: string;
  category: string;
  description: string;
  observedAt?: string | null;
  observedBy?: string | null;
  notes?: string | null;
};

function MilestonesSection({ childId, childDob }: { childId: string; childDob?: string | null }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<string>(MILESTONE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [observedAt, setObservedAt] = useState(new Date().toISOString().slice(0, 10));
  const [msNotes, setMsNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/children/${childId}/milestones`);
        if (res.ok) {
          const data = await res.json();
          setMilestones(Array.isArray(data) ? data : []);
        }
      } catch {
        /* endpoint may not exist yet */
      } finally {
        setLoading(false);
      }
    })();
  }, [childId]);

  async function addMilestone() {
    if (!description.trim()) return;
    try {
      setSaving(true);
      const res = await apiFetch(`/children/${childId}/milestones`, {
        method: "POST",
        body: JSON.stringify({
          category,
          description: description.trim(),
          observedAt: observedAt || undefined,
          notes: msNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMilestones((prev) => [...prev, data]);
        setShowAdd(false);
        setDescription("");
        setMsNotes("");
        setObservedAt(new Date().toISOString().slice(0, 10));
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }

  const grouped = useMemo(() => {
    const map: Record<string, Milestone[]> = {};
    for (const m of milestones) {
      (map[m.category] ??= []).push(m);
    }
    return map;
  }, [milestones]);

  return (
    <Card className="mt-6 rounded-2xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4" />
            Developmental milestones
          </CardTitle>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3 w-3" />
            Record
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {showAdd ? (
          <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
              >
                {MILESTONE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="date"
                value={observedAt}
                onChange={(e) => setObservedAt(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
              />
              <button
                onClick={addMilestone}
                disabled={saving || !description.trim()}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "..." : "Save milestone"}
              </button>
            </div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the milestone observed (e.g. 'First steps independently', 'Uses 2-word sentences')"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            />
            <textarea
              value={msNotes}
              onChange={(e) => setMsNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              maxLength={500}
              className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
            />
          </div>
        ) : null}

        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : milestones.length === 0 ? (
          <div className="text-sm text-slate-500">
            No milestones recorded yet.{" "}
            <button onClick={() => setShowAdd(true)} className="font-medium text-slate-700 hover:text-slate-900">
              Record the first milestone &rarr;
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {MILESTONE_CATEGORIES.filter((c) => grouped[c]?.length).map((cat) => (
              <div key={cat}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {cat}
                </div>
                <div className="space-y-1.5">
                  {grouped[cat]!.map((m) => (
                    <div key={m.id} className="flex items-start justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <div>
                        <div className="text-sm text-slate-700">{m.description}</div>
                        {m.notes ? <div className="mt-0.5 text-xs text-slate-400">{m.notes}</div> : null}
                      </div>
                      <div className="text-xs text-slate-400 whitespace-nowrap ml-3">
                        {m.observedAt ? String(m.observedAt).slice(0, 10) : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
