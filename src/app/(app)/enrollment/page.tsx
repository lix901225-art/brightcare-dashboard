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
import { calcAge, formatDate } from "@/lib/api-helpers";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

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
  specialConsiderations?: string | null;
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

function fmtDate(value?: string | null) {
  return formatDate(value);
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
  const [formSource, setFormSource] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Inline transition
  const [transitioning, setTransitioning] = useState<string | null>(null);

  // Enrollment readiness modal
  const [enrollTarget, setEnrollTarget] = useState<Child | null>(null);

  // Registration fee on enrollment
  const [regFeeEnabled, setRegFeeEnabled] = useState(true);
  const [regFeeAmount, setRegFeeAmount] = useState("150.00");
  const [regFeeLabel, setRegFeeLabel] = useState("Registration Fee");

  // Withdrawal reason modal
  const [withdrawTarget, setWithdrawTarget] = useState<Child | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawNotes, setWithdrawNotes] = useState("");

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
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load enrollment data."));
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
      { label: "Date of birth", ok: !!child.dob, required: true },
      { label: "Room assigned", ok: !!child.roomId, required: true },
      { label: "Guardian linked", ok: guardians.length > 0, required: true },
      { label: "Emergency contact", ok: guardians.some((g) => g.isEmergencyContact), required: false },
      { label: "Primary contact", ok: guardians.some((g) => g.isPrimaryContact), required: false },
      { label: "Allergies / medical documented", ok: child.allergies != null || child.medicalNotes != null, required: false },
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
    setFormSource("");
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
      // Combine inquiry source and notes into specialConsiderations
      const parts: string[] = [];
      if (formSource) parts.push(`[Source: ${formSource}]`);
      if (formNotes.trim()) parts.push(formNotes.trim());
      if (parts.length > 0) body.specialConsiderations = parts.join(" ");

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
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to add to waitlist."));
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
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to enroll."));
    } finally {
      setTransitioning(null);
    }
  }

  function handleWithdrawClick(child: Child) {
    setWithdrawTarget(child);
    setWithdrawReason("");
    setWithdrawNotes("");
  }

  async function confirmWithdraw() {
    if (!withdrawTarget) return;
    const childId = withdrawTarget.id;
    const name = withdrawTarget.fullName || "Child";
    setWithdrawTarget(null);

    try {
      setTransitioning(childId);
      setError("");
      setOk("");

      // Append withdrawal reason to specialConsiderations
      const existing = children.find((c) => c.id === childId)?.specialConsiderations || "";
      const parts: string[] = [existing];
      if (withdrawReason) parts.push(`[Withdrawal: ${withdrawReason}]`);
      if (withdrawNotes.trim()) parts.push(`[Withdrawal note: ${withdrawNotes.trim()}]`);
      const sc = parts.filter(Boolean).join(" ");

      const body: Record<string, unknown> = { status: "WITHDRAWN" };
      if (sc !== existing) body.specialConsiderations = sc;

      const res = await apiFetch(`/children/${childId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Failed: ${res.status}`);

      setOk(`${name} withdrawn.${withdrawReason ? ` Reason: ${withdrawReason}.` : ""}`);
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to withdraw."));
    } finally {
      setTransitioning(null);
    }
  }

  async function transitionStatus(childId: string, newStatus: "WAITLIST", childName: string) {
    if (!confirm(`Move ${childName} to waitlist?`)) return;

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

      setOk(`${childName} moved to waitlist.`);
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update status."));
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
            description="Manage your centre&rsquo;s enrollment pipeline — waitlist, admissions, and licensed capacity."
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
          const requiredPassed = checks.filter((c) => c.required).every((c) => c.ok);
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
                        check.ok ? "bg-emerald-50 text-emerald-700" : check.required ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {check.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                      )}
                      {check.label}
                      {check.required && !check.ok ? <span className="ml-auto text-xs font-medium">Required</span> : null}
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

                {!requiredPassed ? (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      Required items must be completed before enrollment.
                      Please update the child&apos;s profile first.
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-3">
                  <button
                    onClick={confirmEnroll}
                    disabled={!requiredPassed || transitioning === enrollTarget.id}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                    {allPassed ? "Enroll now" : "Enroll (with warnings)"}
                  </button>
                  {!requiredPassed ? (
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

        {/* Withdrawal reason modal */}
        {withdrawTarget ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm ring-1 ring-rose-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Withdraw: {withdrawTarget.fullName || "Child"}</CardTitle>
                <button
                  onClick={() => setWithdrawTarget(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Reason for withdrawal</div>
                  <select
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">Select reason</option>
                    <option value="Family relocated">Family relocated</option>
                    <option value="Switched centres">Switched centres</option>
                    <option value="Aged out of program">Aged out of program</option>
                    <option value="Financial reasons">Financial reasons</option>
                    <option value="Schedule no longer fits">Schedule no longer fits</option>
                    <option value="Child starting school">Child starting school (K entry)</option>
                    <option value="Family decision">Family decision</option>
                    <option value="Centre-initiated">Centre-initiated</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Notes (optional)</div>
                  <input
                    value={withdrawNotes}
                    onChange={(e) => setWithdrawNotes(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Additional context..."
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={confirmWithdraw}
                  disabled={transitioning === withdrawTarget.id}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <UserMinus className="h-4 w-4" />
                  Confirm withdrawal
                </button>
                <button
                  onClick={() => setWithdrawTarget(null)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

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
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Inquiry source</div>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">Select source</option>
                    <option value="CCRR Referral">CCRR Referral</option>
                    <option value="Community Referral">Community Referral</option>
                    <option value="BC Child Care Finder">BC Child Care Finder</option>
                    <option value="Website">Centre Website</option>
                    <option value="Phone Inquiry">Phone Inquiry</option>
                    <option value="Walk-in">Walk-in / Tour</option>
                    <option value="Current Family Referral">Current Family Referral</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
                  <input
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Siblings at centre, allergies, special needs, subsidy info…"
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

        {/* Waitlist action panel — surfaces families needing follow-up */}
        {stats.waitlist > 0 ? (() => {
          const today = new Date();
          const todayStr = today.toISOString().slice(0, 10);

          // Families with desired start date in next 14 days or past
          const approachingStart = waitlistOrdered.filter((c) => {
            if (!c.startDate) return false;
            const sd = c.startDate.slice(0, 10);
            const diff = Math.floor((new Date(sd).getTime() - today.getTime()) / 86400000);
            return diff <= 14;
          });

          // Families waiting 30+ days
          const longWait = waitlistOrdered.filter((c) => {
            const dw = daysWaiting(c.createdAt);
            return dw !== null && dw >= 30;
          });

          // Families with incomplete readiness
          const notReady = waitlistOrdered.filter((c) => {
            const checks = readinessChecks(c);
            return checks.some((ch) => !ch.ok);
          });

          // Families missing guardian/emergency contact
          const missingGuardian = waitlistOrdered.filter((c) => {
            const gs = guardiansByChild[c.id] || [];
            return gs.length === 0 || !gs.some((g) => g.isEmergencyContact);
          });

          const hasActions = approachingStart.length > 0 || longWait.length > 0 || notReady.length > 0;
          if (!hasActions) return null;

          return (
            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/30 p-4">
              <div className="mb-3 text-sm font-semibold text-amber-900">Waitlist follow-up needed</div>
              <div className="grid gap-3 md:grid-cols-3">
                {approachingStart.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-white p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Start date approaching</div>
                    <div className="mt-1.5 space-y-1">
                      {approachingStart.slice(0, 3).map((c) => {
                        const sd = c.startDate!.slice(0, 10);
                        const past = sd < todayStr;
                        return (
                          <Link key={c.id} href={`/children/${encodeURIComponent(c.id)}`} className="flex items-center justify-between text-sm hover:text-slate-600">
                            <span className="font-medium text-slate-900 truncate">{c.fullName}</span>
                            <span className={["text-xs shrink-0 ml-2", past ? "font-semibold text-rose-600" : "text-amber-600"].join(" ")}>
                              {past ? "Overdue" : fmtDate(c.startDate)}
                            </span>
                          </Link>
                        );
                      })}
                      {approachingStart.length > 3 ? (
                        <div className="text-xs text-amber-600">+{approachingStart.length - 3} more</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {longWait.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-white p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Waiting 30+ days</div>
                    <div className="mt-1.5 space-y-1">
                      {longWait.slice(0, 3).map((c) => {
                        const dw = daysWaiting(c.createdAt) || 0;
                        return (
                          <Link key={c.id} href={`/children/${encodeURIComponent(c.id)}`} className="flex items-center justify-between text-sm hover:text-slate-600">
                            <span className="font-medium text-slate-900 truncate">{c.fullName}</span>
                            <span className={["text-xs shrink-0 ml-2 font-medium", dw > 60 ? "text-rose-600" : "text-amber-600"].join(" ")}>
                              {dw}d
                            </span>
                          </Link>
                        );
                      })}
                      {longWait.length > 3 ? (
                        <div className="text-xs text-amber-600">+{longWait.length - 3} more</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {missingGuardian.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-white p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Missing guardian/emergency</div>
                    <div className="mt-1.5 space-y-1">
                      {missingGuardian.slice(0, 3).map((c) => {
                        const gs = guardiansByChild[c.id] || [];
                        const hasGuardian = gs.length > 0;
                        const hasEmergency = gs.some((g) => g.isEmergencyContact);
                        return (
                          <Link key={c.id} href={`/children/${encodeURIComponent(c.id)}`} className="flex items-center justify-between text-sm hover:text-slate-600">
                            <span className="font-medium text-slate-900 truncate">{c.fullName}</span>
                            <span className="text-xs text-rose-600 shrink-0 ml-2">
                              {!hasGuardian ? "No guardian" : "No emergency"}
                            </span>
                          </Link>
                        );
                      })}
                      {missingGuardian.length > 3 ? (
                        <div className="text-xs text-amber-600">+{missingGuardian.length - 3} more</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })() : null}

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
              <TableSkeleton rows={6} cols={5} />
            ) : filtered.length === 0 ? (
              <FilteredEmptyState
                totalCount={children.length}
                filterLabel="filter"
                onClear={query || view !== "ALL" ? () => { setQuery(""); setView("ALL"); } : undefined}
              />
            ) : (
              <>
                {/* ── Mobile card view ── */}
                <div className="space-y-3 md:hidden">
                  {filtered.map((child) => {
                    const s = (child.status || "").toUpperCase();
                    const isTransitioning = transitioning === child.id;
                    const name = child.fullName || "Unnamed";
                    const checks = readinessChecks(child);
                    const passed = checks.filter((c) => c.ok).length;
                    const total = checks.length;
                    const wPos = waitlistPositionById[child.id];
                    const dw = daysWaiting(child.createdAt);
                    const sc = child.specialConsiderations || "";
                    const sourceMatch = sc.match(/\[Source:\s*(.+?)\]/);

                    return (
                      <div key={child.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        {/* Row 1: name + status */}
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/children/${encodeURIComponent(child.id)}`} className="group min-w-0">
                            <div className="font-medium text-slate-900 group-hover:text-slate-600 truncate">{name}</div>
                            {child.preferredName ? <div className="text-xs text-slate-500 truncate">{child.preferredName}</div> : null}
                          </Link>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusColor(s)].join(" ")}>
                              {s || "UNKNOWN"}
                            </span>
                            {s === "WAITLIST" && wPos ? (
                              <span className="text-xs font-medium text-amber-600">#{wPos}</span>
                            ) : null}
                          </div>
                        </div>

                        {/* Row 2: metadata pills */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          {calcAge(child.dob) ? <span>{calcAge(child.dob)} old</span> : null}
                          {child.roomId ? <span>{roomNameById[child.roomId] || "—"}</span> : null}
                          {passed === total ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {passed}/{total}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              {passed}/{total}
                            </span>
                          )}
                          {sourceMatch ? <span className="text-slate-400">{sourceMatch[1]}</span> : null}
                        </div>

                        {/* Row 3: date info */}
                        {(s === "WAITLIST" && (child.startDate || dw !== null)) || (s !== "WAITLIST" && child.startDate) ? (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {s === "WAITLIST" && child.startDate ? (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                Want {fmtDate(child.startDate)}
                              </span>
                            ) : child.startDate ? (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {fmtDate(child.startDate)}
                              </span>
                            ) : null}
                            {s === "WAITLIST" && dw !== null ? (
                              <span className={`font-medium ${dw > 30 ? "text-rose-600" : dw > 14 ? "text-amber-600" : "text-slate-500"}`}>
                                {dw}d waiting
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Row 4: actions */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
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
                              onClick={() => handleWithdrawClick(child)}
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
                      </div>
                    );
                  })}
                </div>

                {/* ── Desktop table ── */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Child</th>
                        <th className="px-4 py-3 font-medium">Age</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Readiness</th>
                        <th className="px-4 py-3 font-medium">Start / Wait</th>
                        <th className="px-4 py-3 font-medium">Room</th>
                        <th className="px-4 py-3 font-medium">Source</th>
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
                            <td className="px-4 py-3 text-slate-600">{calcAge(child.dob) || "—"}</td>
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
                              {(() => {
                                const sc = child.specialConsiderations || "";
                                const match = sc.match(/\[Source:\s*(.+?)\]/);
                                return match ? (
                                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                                    {match[1]}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                );
                              })()}
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
                                    onClick={() => handleWithdrawClick(child)}
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
