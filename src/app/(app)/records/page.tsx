"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileText, AlertTriangle, Heart, Plus, Search, Download, Clock } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";
import { readSession } from "@/lib/session";

/* ─── Types ─── */

type DailyLogRow = {
  id: string;
  childInitials: string;
  date: string;
  time?: string | null;
  category: string;
  description: string;
  staffName?: string | null;
  followUpRequired: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

type IncidentRow = {
  id: string;
  childId: string;
  childName?: string | null;
  type?: string | null;
  severity: string;
  occurredAt: string;
  description: string;
  actionsTaken?: string | null;
  lockedAt?: string | null;
  witnesses?: string | null;
  bodyLocation?: string | null;
  parentNotifiedAt?: string | null;
  parentNotifiedBy?: string | null;
  followUpRequired?: boolean;
  followUpNotes?: string | null;
  healthAuthorityNotified?: boolean;
};

type Child = { id: string; fullName?: string | null };

type CarePlanRow = {
  id: string;
  childId: string;
  childName?: string | null;
  planType: string;
  triggers?: string | null;
  symptoms?: string | null;
  emergencyTreatment?: string | null;
  medicationName?: string | null;
  reviewDate?: string | null;
};

type MedicationRow = {
  id: string;
  childId: string;
  childName?: string | null;
  medicationName: string;
  dosage?: string | null;
  administrationTime: string;
  givenByStaffName?: string | null;
  reason?: string | null;
};

const LOG_CATEGORIES = [
  "Minor injury",
  "Behaviour",
  "Illness",
  "Parent info",
  "Other",
] as const;

const CARE_PLAN_TYPES = ["Asthma", "Allergy", "Diabetes", "Seizure", "Other"] as const;

const ASTHMA_TRIGGERS = [
  "Change in temperature",
  "Colds / respiratory infections",
  "Dust mites",
  "Emotion / stress",
  "Mould",
  "Physical activity",
  "Pollen",
  "Animals",
  "Foods",
  "Strong smells / fumes",
] as const;

const TABS = ["log", "incidents", "medical"] as const;
type Tab = (typeof TABS)[number];

/* ─── Severity badge ─── */
function severityBadge(sev: string) {
  const s = sev.toUpperCase();
  if (s === "CRITICAL" || s === "HIGH") return "border-rose-200 bg-rose-50 text-rose-700";
  if (s === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

/* ─── Page ─── */

export default function RecordsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") || "log";
  const activeTab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "log";

  /* Daily Log state */
  const [logs, setLogs] = useState<DailyLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logQuery, setLogQuery] = useState("");
  const [logCategory, setLogCategory] = useState("");
  const [showLogForm, setShowLogForm] = useState(false);
  const [logSaving, setLogSaving] = useState(false);

  /* Log form */
  const [logChildInitials, setLogChildInitials] = useState("");
  const [logCat, setLogCat] = useState<string>(LOG_CATEGORIES[0]);
  const [logDesc, setLogDesc] = useState("");
  const [logFollowUp, setLogFollowUp] = useState(false);

  /* Incidents state */
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentQuery, setIncidentQuery] = useState("");
  const [children, setChildren] = useState<Child[]>([]);

  /* Medical state */
  const [carePlans, setCarePlans] = useState<CarePlanRow[]>([]);
  const [medications, setMedications] = useState<MedicationRow[]>([]);
  const [medicalLoading, setMedicalLoading] = useState(true);

  /* Care plan form */
  const [showCarePlanForm, setShowCarePlanForm] = useState(false);
  const [cpSaving, setCpSaving] = useState(false);
  const [cpChildId, setCpChildId] = useState("");
  const [cpType, setCpType] = useState("Asthma");
  const [cpTriggers, setCpTriggers] = useState<string[]>([]);
  const [cpSymptoms, setCpSymptoms] = useState("");
  const [cpEmergency, setCpEmergency] = useState("");
  const [cpMedName, setCpMedName] = useState("");
  const [cpMedStorage, setCpMedStorage] = useState("");
  const [cpReviewDate, setCpReviewDate] = useState("");
  const [cpNotes, setCpNotes] = useState("");

  /* Medication form */
  const [showMedForm, setShowMedForm] = useState(false);
  const [medSaving, setMedSaving] = useState(false);
  const [medChildId, setMedChildId] = useState("");
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medReason, setMedReason] = useState("");

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function setTab(t: Tab) {
    router.replace(`/records?tab=${t}`, { scroll: false });
  }

  /* ─── Load data based on active tab ─── */

  useEffect(() => {
    if (activeTab === "log") loadLogs();
    if (activeTab === "incidents") loadIncidents();
    if (activeTab === "medical") loadMedical();
  }, [activeTab]);

  async function loadLogs() {
    try {
      setLogsLoading(true);
      setError("");
      const res = await apiFetch("/records/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  async function loadIncidents() {
    try {
      setIncidentsLoading(true);
      setError("");
      const [incRes, childRes] = await Promise.all([
        apiFetch("/incidents"),
        apiFetch("/children"),
      ]);
      if (incRes.ok) {
        const data = await incRes.json();
        setIncidents(Array.isArray(data) ? data : []);
      }
      if (childRes.ok) {
        const data = await childRes.json();
        setChildren(Array.isArray(data) ? data : []);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load incidents."));
    } finally {
      setIncidentsLoading(false);
    }
  }

  async function loadMedical() {
    try {
      setMedicalLoading(true);
      setError("");
      const [cpRes, medRes, childRes] = await Promise.all([
        apiFetch("/records/care-plans").catch(() => null),
        apiFetch("/records/medications").catch(() => null),
        apiFetch("/children"),
      ]);
      if (cpRes?.ok) {
        const data = await cpRes.json();
        setCarePlans(Array.isArray(data) ? data : []);
      }
      if (medRes?.ok) {
        const data = await medRes.json();
        setMedications(Array.isArray(data) ? data : []);
      }
      if (childRes.ok) {
        const data = await childRes.json();
        setChildren(Array.isArray(data) ? data : []);
      }
    } catch {
      /* endpoints may not exist yet */
    } finally {
      setMedicalLoading(false);
    }
  }

  /* ─── Daily Log: create ─── */

  async function createLog() {
    try {
      setLogSaving(true);
      setError("");
      setOk("");

      if (!logChildInitials.trim()) throw new Error("Child initials are required.");
      if (!logDesc.trim()) throw new Error("Description is required.");

      const res = await apiFetch("/records/logs", {
        method: "POST",
        body: JSON.stringify({
          childInitials: logChildInitials.trim().toUpperCase(),
          category: logCat,
          description: logDesc.trim(),
          followUpRequired: logFollowUp,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create failed: ${res.status}`);

      setOk("Log entry recorded.");
      setShowLogForm(false);
      setLogChildInitials("");
      setLogDesc("");
      setLogFollowUp(false);
      await loadLogs();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create log entry."));
    } finally {
      setLogSaving(false);
    }
  }

  /* ─── CSV Export for logs ─── */

  function exportLogsCsv() {
    const rows = [
      ["Date", "Time", "Child Initials", "Category", "Description", "Follow-up Required", "Staff", "Last Modified"],
      ...logs.map((l) => [
        l.date?.slice(0, 10) || "",
        l.time || "",
        l.childInitials,
        l.category,
        `"${(l.description || "").replace(/"/g, '""')}"`,
        l.followUpRequired ? "Yes" : "No",
        l.staffName || "",
        l.updatedAt?.slice(0, 16) || "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ─── Create care plan ─── */
  async function createCarePlan() {
    try {
      setCpSaving(true);
      setError("");
      setOk("");
      if (!cpChildId) throw new Error("Select a child.");
      const res = await apiFetch("/records/care-plans", {
        method: "POST",
        body: JSON.stringify({
          childId: cpChildId,
          planType: cpType,
          triggers: cpTriggers.join(", "),
          symptoms: cpSymptoms.trim() || undefined,
          emergencyTreatment: cpEmergency.trim() || undefined,
          medicationName: cpMedName.trim() || undefined,
          storageLocation: cpMedStorage.trim() || undefined,
          reviewDate: cpReviewDate || undefined,
          notes: cpNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create failed: ${res.status}`);
      setOk("Care plan created.");
      setShowCarePlanForm(false);
      setCpTriggers([]);
      setCpSymptoms("");
      setCpEmergency("");
      setCpMedName("");
      setCpMedStorage("");
      setCpReviewDate("");
      setCpNotes("");
      await loadMedical();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create care plan."));
    } finally {
      setCpSaving(false);
    }
  }

  /* ─── Create medication record ─── */
  async function createMedication() {
    try {
      setMedSaving(true);
      setError("");
      setOk("");
      if (!medChildId) throw new Error("Select a child.");
      if (!medName.trim()) throw new Error("Medication name is required.");
      const res = await apiFetch("/records/medications", {
        method: "POST",
        body: JSON.stringify({
          childId: medChildId,
          medicationName: medName.trim(),
          dosage: medDosage.trim() || undefined,
          reason: medReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create failed: ${res.status}`);
      setOk("Medication administered — record saved.");
      setShowMedForm(false);
      setMedName("");
      setMedDosage("");
      setMedReason("");
      await loadMedical();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to record medication."));
    } finally {
      setMedSaving(false);
    }
  }

  /* ─── Filtered lists ─── */

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (logCategory) result = result.filter((l) => l.category === logCategory);
    const q = logQuery.trim().toLowerCase();
    if (q) result = result.filter((l) =>
      [l.childInitials, l.category, l.description].join(" ").toLowerCase().includes(q)
    );
    return result;
  }, [logs, logQuery, logCategory]);

  const filteredIncidents = useMemo(() => {
    const q = incidentQuery.trim().toLowerCase();
    if (!q) return incidents;
    return incidents.filter((i) =>
      [i.childName, i.type, i.description, i.severity].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [incidents, incidentQuery]);

  const childNameById = useMemo(
    () => Object.fromEntries(children.map((c) => [c.id, c.fullName || "Unnamed"])),
    [children]
  );

  /* ─── Render ─── */

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6">
          <PageIntro
            title="Records"
            description="Daily logs, incident reports, and medical records — BC licensing compliance."
          />
        </div>

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {([
            { key: "log" as Tab, label: "Daily Log", icon: FileText },
            { key: "incidents" as Tab, label: "Incidents", icon: AlertTriangle },
            { key: "medical" as Tab, label: "Medical", icon: Heart },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                activeTab === key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ═══ Tab: Daily Log ═══ */}
        {activeTab === "log" && (
          <>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 gap-3">
                <div className="relative flex-1 md:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={logQuery} onChange={(e) => setLogQuery(e.target.value)} placeholder="Search logs..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none" />
                </div>
                <select value={logCategory} onChange={(e) => setLogCategory(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                  <option value="">All categories</option>
                  {LOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={exportLogsCsv} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Download className="h-4 w-4" /> Export CSV
                </button>
                <button onClick={() => setShowLogForm(!showLogForm)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
                  <Plus className="h-4 w-4" /> Add entry
                </button>
              </div>
            </div>

            {showLogForm && (
              <Card className="mb-6 rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>New daily log entry</CardTitle></CardHeader>
                <CardContent>
                  <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-xs text-sky-800">
                    <strong>Section 56f compliance:</strong> Use child initials only (not full names) for privacy per BC Community Care and Assisted Living Act.
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Child initials</div>
                      <input value={logChildInitials} onChange={(e) => setLogChildInitials(e.target.value)} maxLength={5} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none uppercase" placeholder="e.g. JD" />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Category</div>
                      <select value={logCat} onChange={(e) => setLogCat(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                        {LOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={logFollowUp} onChange={(e) => setLogFollowUp(e.target.checked)} className="rounded" />
                        Follow-up required
                      </label>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Description</div>
                    <textarea value={logDesc} onChange={(e) => setLogDesc(e.target.value)} maxLength={2000} className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Describe the event..." />
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button onClick={createLog} disabled={logSaving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                      {logSaving ? "Saving..." : "Save entry"}
                    </button>
                    <button onClick={() => setShowLogForm(false)} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {logsLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : filteredLogs.length === 0 ? (
              <FilteredEmptyState totalCount={logs.length} filterLabel="search or category" />
            ) : (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-0">
                  {/* Mobile cards */}
                  <div className="space-y-2 p-4 md:hidden">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-sm font-medium text-slate-900">{log.childInitials}</span>
                            <span className="ml-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">{log.category}</span>
                          </div>
                          {log.followUpRequired && <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Follow-up</span>}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">{log.description}</div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {log.date?.slice(0, 10)} {log.time || ""}
                          {log.staffName && <span>· {log.staffName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Initials</th>
                          <th className="px-4 py-3 font-medium">Category</th>
                          <th className="px-4 py-3 font-medium">Description</th>
                          <th className="px-4 py-3 font-medium">Follow-up</th>
                          <th className="px-4 py-3 font-medium">Staff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="border-t border-slate-200">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{log.date?.slice(0, 10)}</td>
                            <td className="px-4 py-3 font-medium">{log.childInitials}</td>
                            <td className="px-4 py-3"><span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">{log.category}</span></td>
                            <td className="px-4 py-3 max-w-md truncate">{log.description}</td>
                            <td className="px-4 py-3">{log.followUpRequired ? <span className="text-amber-600 font-medium">Yes</span> : <span className="text-slate-400">No</span>}</td>
                            <td className="px-4 py-3 text-slate-500">{log.staffName || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ═══ Tab: Incidents ═══ */}
        {activeTab === "incidents" && (
          <>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={incidentQuery} onChange={(e) => setIncidentQuery(e.target.value)} placeholder="Search incidents..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none" />
              </div>
              <div className="text-xs text-slate-500">
                Full incident management is available at <a href="/incidents" className="font-medium text-slate-700 hover:text-slate-900">/incidents</a> — use this tab for quick reference.
              </div>
            </div>

            {incidentsLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : filteredIncidents.length === 0 ? (
              <FilteredEmptyState totalCount={incidents.length} filterLabel="search" />
            ) : (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="space-y-2 p-4 md:hidden">
                    {filteredIncidents.map((inc) => (
                      <div key={inc.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between">
                          <div className="text-sm font-medium text-slate-900">{inc.childName || childNameById[inc.childId] || "Child"}</div>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${severityBadge(inc.severity)}`}>{inc.severity}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{inc.type || "General"} · {new Date(inc.occurredAt).toLocaleDateString()}</div>
                        <div className="mt-2 text-sm text-slate-600 line-clamp-2">{inc.description}</div>
                        {inc.lockedAt && <div className="mt-2 text-xs text-slate-400">Locked {new Date(inc.lockedAt).toLocaleDateString()}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Child</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Severity</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Description</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIncidents.map((inc) => (
                          <tr key={inc.id} className="border-t border-slate-200">
                            <td className="px-4 py-3 font-medium">{inc.childName || childNameById[inc.childId] || "—"}</td>
                            <td className="px-4 py-3">{inc.type || "General"}</td>
                            <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${severityBadge(inc.severity)}`}>{inc.severity}</span></td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(inc.occurredAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 max-w-xs truncate">{inc.description}</td>
                            <td className="px-4 py-3">{inc.lockedAt ? <span className="text-xs text-slate-400">Locked</span> : <span className="text-xs text-emerald-600">Open</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ═══ Tab: Medical ═══ */}
        {activeTab === "medical" && (
          <>
            {medicalLoading ? (
              <TableSkeleton rows={4} cols={4} />
            ) : (
              <div className="space-y-6">
                {/* Care Plans */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Care Plans</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{carePlans.length} plan{carePlans.length !== 1 ? "s" : ""}</span>
                        <button onClick={() => setShowCarePlanForm(!showCarePlanForm)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          <Plus className="h-3 w-3" /> Add plan
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showCarePlanForm && (
                      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Child</div>
                            <select value={cpChildId} onChange={(e) => setCpChildId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                              <option value="">Select child...</option>
                              {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                            </select>
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Plan type</div>
                            <select value={cpType} onChange={(e) => setCpType(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                              {CARE_PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        {cpType === "Asthma" && (
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Triggers (VCH template)</div>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {ASTHMA_TRIGGERS.map((trigger) => (
                                <label key={trigger} className="flex items-center gap-2 text-xs text-slate-700">
                                  <input type="checkbox" checked={cpTriggers.includes(trigger)} onChange={(e) => {
                                    if (e.target.checked) setCpTriggers((p) => [...p, trigger]);
                                    else setCpTriggers((p) => p.filter((t) => t !== trigger));
                                  }} className="h-3.5 w-3.5 rounded border-slate-300" />
                                  {trigger}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Symptoms</div>
                          <textarea value={cpSymptoms} onChange={(e) => setCpSymptoms(e.target.value)} className="min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Describe symptoms..." />
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Emergency treatment steps</div>
                          <textarea value={cpEmergency} onChange={(e) => setCpEmergency(e.target.value)} className="min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="1. Give rescue inhaler... 2. Call 911 if..." />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Medication name</div>
                            <input value={cpMedName} onChange={(e) => setCpMedName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. Ventolin" />
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Storage location</div>
                            <input value={cpMedStorage} onChange={(e) => setCpMedStorage(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. Child's cubby" />
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Annual review date</div>
                            <input type="date" value={cpReviewDate} onChange={(e) => setCpReviewDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={createCarePlan} disabled={cpSaving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                            {cpSaving ? "Saving..." : "Create care plan"}
                          </button>
                          <button onClick={() => setShowCarePlanForm(false)} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        </div>
                      </div>
                    )}
                    {carePlans.length === 0 && !showCarePlanForm ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                        No care plans on file. Care plans track asthma, allergy, diabetes, and seizure management for enrolled children.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {carePlans.map((cp) => (
                          <div key={cp.id} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">{cp.childName || childNameById[cp.childId] || "Child"}</div>
                                <div className="mt-0.5 text-xs text-slate-500">{cp.planType} care plan</div>
                              </div>
                              {cp.reviewDate && (
                                <span className={`text-xs ${new Date(cp.reviewDate) < new Date() ? "text-rose-600 font-medium" : "text-slate-400"}`}>
                                  Review: {cp.reviewDate.slice(0, 10)}
                                </span>
                              )}
                            </div>
                            {cp.triggers && <div className="mt-2 text-xs text-slate-600"><strong>Triggers:</strong> {cp.triggers}</div>}
                            {cp.emergencyTreatment && <div className="mt-1 text-xs text-slate-600"><strong>Emergency treatment:</strong> {cp.emergencyTreatment}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Medication Records */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Medication Administration</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{medications.length} record{medications.length !== 1 ? "s" : ""}</span>
                        <button onClick={() => setShowMedForm(!showMedForm)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          <Plus className="h-3 w-3" /> Record
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showMedForm && (
                      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs text-amber-800">
                          <strong>BC licensing requirement:</strong> Parent written authorisation must be obtained before administering any medication.
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Child</div>
                            <select value={medChildId} onChange={(e) => setMedChildId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                              <option value="">Select child...</option>
                              {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                            </select>
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Medication name</div>
                            <input value={medName} onChange={(e) => setMedName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. Children's Tylenol" />
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Dosage</div>
                            <input value={medDosage} onChange={(e) => setMedDosage(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. 5ml" />
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Reason</div>
                            <input value={medReason} onChange={(e) => setMedReason(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. Fever" />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={createMedication} disabled={medSaving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                            {medSaving ? "Recording..." : "Record administration"}
                          </button>
                          <button onClick={() => setShowMedForm(false)} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        </div>
                      </div>
                    )}
                    {medications.length === 0 && !showMedForm ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                        No medication records. All medication administration requires written parent authorisation per BC licensing.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-left text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">Child</th>
                              <th className="px-4 py-3 font-medium">Medication</th>
                              <th className="px-4 py-3 font-medium">Dosage</th>
                              <th className="px-4 py-3 font-medium">Time</th>
                              <th className="px-4 py-3 font-medium">Given by</th>
                            </tr>
                          </thead>
                          <tbody>
                            {medications.map((med) => (
                              <tr key={med.id} className="border-t border-slate-200">
                                <td className="px-4 py-3 font-medium">{med.childName || childNameById[med.childId] || "—"}</td>
                                <td className="px-4 py-3">{med.medicationName}</td>
                                <td className="px-4 py-3 text-slate-500">{med.dosage || "—"}</td>
                                <td className="px-4 py-3 text-slate-500">{new Date(med.administrationTime).toLocaleString()}</td>
                                <td className="px-4 py-3 text-slate-500">{med.givenByStaffName || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </RoleGate>
  );
}
