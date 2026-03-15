"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, X, ArrowRight, UserPlus, UserMinus, Clock,
  AlertTriangle, CheckCircle2, Shield,
} from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

type Child = {
  id: string;
  fullName?: string | null;
  preferredName?: string | null;
  status?: string | null;
  roomId?: string | null;
  dob?: string | null;
  startDate?: string | null;
  gender?: string | null;
  createdAt?: string | null;
  allergies?: string | null;
  medicalNotes?: string | null;
  emergencyNotes?: string | null;
};

type Room = {
  id: string;
  name?: string | null;
  capacity?: number | null;
};

type GuardianLink = {
  id: string;
  guardianName?: string | null;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  isPickupAuthorized?: boolean;
};

function age(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) years--;
  if (years < 1) {
    const months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    return `${Math.max(0, months)}mo`;
  }
  return `${years}y`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function daysWaiting(createdAt?: string | null) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function statusColor(status: string) {
  switch (status) {
    case "ACTIVE": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "WAITLIST": return "border-amber-200 bg-amber-50 text-amber-700";
    case "WITHDRAWN": return "border-rose-200 bg-rose-50 text-rose-700";
    default: return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

type PipelineView = "ALL" | "WAITLIST" | "ACTIVE" | "WITHDRAWN";

export default function EnrollmentPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guardiansByChild, setGuardiansByChild] = useState<Record<string, GuardianLink[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<PipelineView>("ALL");

  // Waitlist add form
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Inline transition
  const [transitioning, setTransitioning] = useState<string | null>(null);

  // Enrollment readiness modal
  const [enrollTarget, setEnrollTarget] = useState<Child | null>(null);

  // Registration fee on enrollment
  const [regFeeEnabled, setRegFeeEnabled] = useState(true);
  const [regFeeAmount, setRegFeeAmount] = useState("150.00");
  const [regFeeLabel, setRegFeeLabel] = useState("Registration Fee");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [childrenRes, roomsRes] = await Promise.all([
        apiFetch("/children"),
        apiFetch("/rooms"),
      ]);
      const childrenData = await childrenRes.json();
      const roomsData = await roomsRes.json();
      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);

      const childRows: Child[] = Array.isArray(childrenData) ? childrenData : [];
      setChildren(childRows);
      setRooms(roomsRes.ok && Array.isArray(roomsData) ? roomsData : []);

      // Load guardians for all children
      const guardianEntries = await Promise.all(
        childRows.map(async (child) => {
          try {
            const res = await apiFetch(`/children/${child.id}/guardians`);
            const data = await res.json();
            return [child.id, res.ok && Array.isArray(data) ? data : []] as const;
          } catch {
            return [child.id, []] as const;
          }
        })
      );
      setGuardiansByChild(Object.fromEntries(guardianEntries));
    } catch (e: any) {
      setError(e?.message || "Unable to load enrollment data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const roomNameById = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, r.name || r.id])),
    [rooms]
  );

  // Count active children per room for capacity tracking
  const activeByRoom = useMemo(() => {
    const map: Record<string, number> = {};
    for (const child of children) {
      if ((child.status || "").toUpperCase() === "ACTIVE" && child.roomId) {
        map[child.roomId] = (map[child.roomId] || 0) + 1;
      }
    }
    return map;
  }, [children]);

  // Waitlist sorted by createdAt for position numbering
  const waitlistOrdered = useMemo(() => {
    return children
      .filter((c) => (c.status || "").toUpperCase() === "WAITLIST")
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aDate - bDate;
      });
  }, [children]);

  const waitlistPositionById = useMemo(() => {
    const map: Record<string, number> = {};
    waitlistOrdered.forEach((child, i) => { map[child.id] = i + 1; });
    return map;
  }, [waitlistOrdered]);

  function readinessChecks(child: Child) {
    const guardians = guardiansByChild[child.id] || [];
    const checks = [
      { label: "Date of birth", ok: !!child.dob },
      { label: "Room assigned", ok: !!child.roomId },
      { label: "Guardian linked", ok: guardians.length > 0 },
      { label: "Emergency contact", ok: guardians.some((g) => g.isEmergencyContact) },
      { label: "Primary contact", ok: guardians.some((g) => g.isPrimaryContact) },
    ];
    return checks;
  }

  const stats = useMemo(() => {
    const active = children.filter((c) => (c.status || "").toUpperCase() === "ACTIVE").length;
    const waitlist = children.filter((c) => (c.status || "").toUpperCase() === "WAITLIST").length;
    const withdrawn = children.filter((c) => (c.status || "").toUpperCase() === "WITHDRAWN").length;
    const totalCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const utilization = totalCapacity > 0 ? Math.round((active / totalCapacity) * 100) : null;
    return { total: children.length, active, waitlist, withdrawn, totalCapacity, utilization };
  }, [children, rooms]);

  const filtered = useMemo(() => {
    let result = children;
    if (view !== "ALL") {
      result = result.filter((c) => (c.status || "").toUpperCase() === view);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((c) =>
        [c.fullName, c.preferredName, c.dob, c.startDate].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const statusOrder: Record<string, number> = { WAITLIST: 0, ACTIVE: 1, WITHDRAWN: 2 };
      const aOrder = statusOrder[(a.status || "").toUpperCase()] ?? 3;
      const bOrder = statusOrder[(b.status || "").toUpperCase()] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    });
  }, [children, view, query]);

  function resetForm() {
    setFormName("");
    setFormDob("");
    setFormGender("");
    setFormStartDate("");
    setFormRoom("");
    setFormNotes("");
  }

  async function addToWaitlist() {
    try {
      setSaving(true);
      setError("");
      setOk("");
      if (!formName.trim()) throw new Error("Child name is required.");

      const body: Record<string, unknown> = {
        fullName: formName.trim(),
        status: "WAITLIST",
      };
      if (formDob) body.dob = formDob;
      if (formGender.trim()) body.gender = formGender.trim();
      if (formStartDate) body.startDate = formStartDate;
      if (formRoom) body.roomId = formRoom;
      if (formNotes.trim()) body.specialConsiderations = formNotes.trim();

      const res = await apiFetch("/children", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Failed: ${res.status}`);

      setOk(`${formName.trim()} added to waitlist.`);
      setShowAdd(false);
      resetForm();
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to add to waitlist.");
    } finally {
      setSaving(false);
    }
  }

  function handleEnrollClick(child: Child) {
    setEnrollTarget(child);
  }

  async function confirmEnroll() {
    if (!enrollTarget) return;
    const childId = enrollTarget.id;
    const name = enrollTarget.fullName || "Child";
    setEnrollTarget(null);

    try {
      setTransitioning(childId);
      setError("");
      setOk("");

      const body: Record<string, unknown> = {
        status: "ACTIVE",
        startDate: new Date().toISOString().slice(0, 10),
      };

      const res = await apiFetch(`/children/${childId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Failed: ${res.status}`);

      // Auto-create registration fee invoice if enabled
      let invoiceMsg = "";
      if (regFeeEnabled && parseFloat(regFeeAmount) > 0) {
        try {
          const feeCents = Math.round(parseFloat(regFeeAmount) * 100);
          const today = new Date().toISOString().split("T")[0];
          const due = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
          const invoiceRes = await apiFetch("/billing/invoices", {
            method: "POST",
            body: JSON.stringify({
              childId,
              issueDate: today,
              dueDate: due,
              items: [
                { description: regFeeLabel || "Registration Fee", amountCents: feeCents },
              ],
            }),
          });
          if (invoiceRes.ok) {
            invoiceMsg = ` Registration fee invoice ($${regFeeAmount}) created.`;
          }
        } catch {
          // Non-blocking — enrollment succeeded even if invoice fails
        }
      }

      setOk(`${name} enrolled successfully.${invoiceMsg}`);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to enroll.");
    } finally {
      setTransitioning(null);
    }
  }

  async function transitionStatus(childId: string, newStatus: "WAITLIST" | "WITHDRAWN", childName: string) {
    const labels: Record<string, string> = {
      WAITLIST: "move to waitlist",
      WITHDRAWN: "withdraw",
    };
    if (!confirm(`${labels[newStatus]?.charAt(0).toUpperCase()}${labels[newStatus]?.slice(1)} ${childName}?`)) return;

    try {
      setTransitioning(childId);
      setError("");
      setOk("");

      const res = await apiFetch(`/children/${childId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Failed: ${res.status}`);

      const actionLabel = newStatus === "WITHDRAWN" ? "withdrawn" : "moved to waitlist";
      setOk(`${childName} ${actionLabel}.`);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to update status.");
    } finally {
      setTransitioning(null);
    }
  }

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Enrollment"
            description="Manage your enrollment pipeline — waitlist, active enrollment, and withdrawals."
          />
          <button
            onClick={() => { resetForm(); setShowAdd(true); }}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add to waitlist
          </button>
        </div>

        {ok ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {/* Enrollment readiness modal */}
        {enrollTarget ? (() => {
          const checks = readinessChecks(enrollTarget);
          const passed = checks.filter((c) => c.ok).length;
          const allPassed = passed === checks.length;
          const roomName = enrollTarget.roomId ? roomNameById[enrollTarget.roomId] || "Unknown" : null;
          const roomObj = rooms.find((r) => r.id === enrollTarget.roomId);
          const roomCount = enrollTarget.roomId ? activeByRoom[enrollTarget.roomId] || 0 : 0;
          const atCapacity = roomObj?.capacity != null && roomCount >= (roomObj.capacity || 0);

          return (
            <Card className="mb-6 rounded-2xl border-0 shadow-sm ring-1 ring-emerald-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Enrollment readiness: {enrollTarget.fullName || "Child"}</CardTitle>
                  <button
                    onClick={() => setEnrollTarget(null)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-2 md:grid-cols-2">
                  {checks.map((check) => (
                    <div
                      key={check.label}
                      className={[
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                        check.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {check.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                      )}
                      {check.label}
                    </div>
                  ))}
                </div>

                {atCapacity && roomName ? (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <span className="font-medium">{roomName}</span> is at capacity ({roomCount}/{roomObj?.capacity}).
                      Enrolling will exceed room capacity.
                    </div>
                  </div>
                ) : null}

                {/* Registration fee option */}
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regFeeEnabled}
                      onChange={(e) => setRegFeeEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">Generate registration fee invoice</span>
                  </label>
                  {regFeeEnabled && (
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Description</div>
                        <input
                          value={regFeeLabel}
                          onChange={(e) => setRegFeeLabel(e.target.value)}
                          className="h-9 w-48 rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Amount ($)</div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={regFeeAmount}
                          onChange={(e) => setRegFeeAmount(e.target.value)}
                          className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none"
                        />
                      </div>
                      <div className="text-xs text-slate-400">Due in 14 days</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={confirmEnroll}
                    disabled={transitioning === enrollTarget.id}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                    {allPassed ? "Enroll now" : "Enroll anyway"}
                  </button>
                  {!allPassed ? (
                    <Link
                      href={`/children/${encodeURIComponent(enrollTarget.id)}`}
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Complete profile first
                    </Link>
                  ) : null}
                  <button
                    onClick={() => setEnrollTarget(null)}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {passed}/{checks.length} readiness checks passed
                </div>
              </CardContent>
            </Card>
          );
        })() : null}

        {/* Add to waitlist form */}
        {showAdd ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add to waitlist</CardTitle>
                <button
                  onClick={() => { setShowAdd(false); resetForm(); }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Child name *</div>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Date of birth</div>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Gender</div>
                  <input
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Desired start date</div>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preferred room</div>
                  <select
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">No preference</option>
                    {rooms.map((r) => {
                      const count = activeByRoom[r.id] || 0;
                      const cap = r.capacity;
                      const label = cap != null ? `${r.name || r.id} (${count}/${cap})` : (r.name || r.id);
                      return <option key={r.id} value={r.id}>{label}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
                  <input
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Siblings, allergies, special needs..."
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={addToWaitlist}
                  disabled={saving}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {saving ? "Adding..." : "Add to waitlist"}
                </button>
                <button
                  onClick={() => { setShowAdd(false); resetForm(); }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Pipeline stat cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total children</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.total}</div>
              {stats.totalCapacity > 0 ? (
                <div className="mt-1 text-xs text-slate-500">{stats.totalCapacity} total capacity</div>
              ) : null}
            </CardContent>
          </Card>
          <Card
            className={["rounded-2xl shadow-sm cursor-pointer transition-colors", view === "WAITLIST" ? "border border-amber-300 bg-amber-50/30" : "border-0"].join(" ")}
            onClick={() => setView(view === "WAITLIST" ? "ALL" : "WAITLIST")}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-600">Waitlist</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-amber-700">{stats.waitlist}</div>
              <div className="mt-1 text-xs text-amber-600">{stats.waitlist > 0 ? "Awaiting enrollment" : "No one waiting"}</div>
            </CardContent>
          </Card>
          <Card
            className={["rounded-2xl shadow-sm cursor-pointer transition-colors", view === "ACTIVE" ? "border border-emerald-300 bg-emerald-50/30" : "border-0"].join(" ")}
            onClick={() => setView(view === "ACTIVE" ? "ALL" : "ACTIVE")}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-600">Active</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-emerald-700">{stats.active}</div>
              <div className="mt-1 text-xs text-emerald-600">Currently enrolled</div>
            </CardContent>
          </Card>
          <Card
            className={["rounded-2xl shadow-sm cursor-pointer transition-colors", view === "WITHDRAWN" ? "border border-rose-300 bg-rose-50/30" : "border-0"].join(" ")}
            onClick={() => setView(view === "WITHDRAWN" ? "ALL" : "WITHDRAWN")}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Withdrawn</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.withdrawn}</div>
              <div className="mt-1 text-xs text-slate-500">No longer enrolled</div>
            </CardContent>
          </Card>
          {stats.utilization !== null ? (
            <Card className={`rounded-2xl border-0 shadow-sm ${stats.utilization >= 90 ? "ring-1 ring-amber-200" : ""}`}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Utilization</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-3xl font-semibold ${stats.utilization >= 100 ? "text-rose-600" : stats.utilization >= 90 ? "text-amber-600" : "text-emerald-600"}`}>
                  {stats.utilization}%
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${stats.utilization >= 100 ? "bg-rose-500" : stats.utilization >= 90 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, stats.utilization)}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-slate-500">{stats.active} / {stats.totalCapacity} spots</div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Search */}
        <div className="mt-6 mb-6 relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Pipeline view label */}
        {view !== "ALL" ? (
          <div className="mb-4 flex items-center gap-2">
            <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-medium", statusColor(view)].join(" ")}>
              {view}
            </span>
            <button onClick={() => setView("ALL")} className="text-xs text-slate-500 hover:text-slate-700">
              Show all &times;
            </button>
          </div>
        ) : null}

        {/* Enrollment table */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Enrollment pipeline</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                {children.length === 0
                  ? "No children yet. Add your first child to the waitlist above."
                  : "No children match this filter."}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Child</th>
                      <th className="px-4 py-3 font-medium">Age</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Readiness</th>
                      <th className="px-4 py-3 font-medium">Start / Wait</th>
                      <th className="px-4 py-3 font-medium">Room</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((child) => {
                      const s = (child.status || "").toUpperCase();
                      const isTransitioning = transitioning === child.id;
                      const name = child.fullName || "Unnamed";
                      const checks = readinessChecks(child);
                      const passed = checks.filter((c) => c.ok).length;
                      const total = checks.length;
                      const wPos = waitlistPositionById[child.id];
                      const dw = daysWaiting(child.createdAt);

                      return (
                        <tr key={child.id} className="border-t border-slate-200 hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <Link href={`/children/${encodeURIComponent(child.id)}`} className="group">
                              <div className="font-medium text-slate-900 group-hover:text-slate-600">{name}</div>
                              {child.preferredName ? <div className="text-xs text-slate-500">{child.preferredName}</div> : null}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{age(child.dob) || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusColor(s)].join(" ")}>
                                {s || "UNKNOWN"}
                              </span>
                              {s === "WAITLIST" && wPos ? (
                                <span className="text-xs font-medium text-amber-600">#{wPos}</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {passed === total ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                {passed}/{total}
                              </span>
                            ) : (
                              <Link
                                href={`/children/${encodeURIComponent(child.id)}`}
                                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                                title={`Missing: ${checks.filter((c) => !c.ok).map((c) => c.label).join(", ")}`}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {passed}/{total}
                              </Link>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {s === "WAITLIST" ? (
                              <div>
                                {child.startDate ? (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    Want {fmtDate(child.startDate)}
                                  </div>
                                ) : null}
                                {dw !== null ? (
                                  <div className={`text-xs font-medium ${dw > 30 ? "text-rose-600" : dw > 14 ? "text-amber-600" : "text-slate-500"}`}>
                                    {dw}d waiting
                                  </div>
                                ) : null}
                              </div>
                            ) : child.startDate ? (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {fmtDate(child.startDate)}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {child.roomId ? roomNameById[child.roomId] || "—" : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {s === "WAITLIST" ? (
                                <button
                                  onClick={() => handleEnrollClick(child)}
                                  disabled={isTransitioning}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  Enroll
                                </button>
                              ) : null}
                              {s === "ACTIVE" ? (
                                <button
                                  onClick={() => transitionStatus(child.id, "WITHDRAWN", name)}
                                  disabled={isTransitioning}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                >
                                  <UserMinus className="h-3 w-3" />
                                  Withdraw
                                </button>
                              ) : null}
                              {s === "WITHDRAWN" ? (
                                <button
                                  onClick={() => transitionStatus(child.id, "WAITLIST", name)}
                                  disabled={isTransitioning}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  <UserPlus className="h-3 w-3" />
                                  Re-waitlist
                                </button>
                              ) : null}
                              <Link
                                href={`/children/${encodeURIComponent(child.id)}`}
                                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Profile
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
