"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ClipboardCheck, Plus, Thermometer, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { readSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/error";

type Child = { id: string; fullName?: string | null };
type HealthCheck = {
  id: string;
  childId: string;
  date: string;
  temperature?: number | null;
  symptoms?: string[] | null;
  passedScreening: boolean;
  notes?: string | null;
  checkedBy?: string | null;
  createdAt: string;
};

const SYMPTOMS = [
  { key: "fever", label: "Fever" },
  { key: "cough", label: "Cough" },
  { key: "runny_nose", label: "Runny nose" },
  { key: "rash", label: "Rash" },
  { key: "vomiting", label: "Vomiting" },
  { key: "diarrhea", label: "Diarrhea" },
  { key: "eye_infection", label: "Eye infection" },
  { key: "other", label: "Other" },
];

export default function HealthChecksPage() {
  const router = useRouter();
  const session = readSession();

  // STAFF should use the integrated check-in flow on /attendance
  useEffect(() => {
    if (session?.role === "STAFF") {
      router.replace("/attendance");
    }
  }, [session?.role, router]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [children, setChildren] = useState<Child[]>([]);
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [childId, setChildId] = useState("");
  const [temperature, setTemperature] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [passed, setPassed] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const [childRes, checkRes] = await Promise.all([
        apiFetch("/children"),
        apiFetch(`/health-checks?date=${date}`),
      ]);
      if (childRes.ok) {
        const data = await childRes.json();
        setChildren(Array.isArray(data) ? data : (data.children || []));
      }
      if (checkRes.ok) setChecks(await checkRes.json());
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [date]);

  const checkedIds = new Set(checks.map((c) => c.childId));
  const unchecked = children.filter((c) => !checkedIds.has(c.id));

  function toggleSymptom(key: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  async function submit() {
    try {
      setSaving(true);
      setError("");
      if (!childId) throw new Error("Select a child.");
      const res = await apiFetch("/health-checks", {
        method: "POST",
        body: JSON.stringify({
          childId,
          date,
          temperature: temperature ? parseFloat(temperature) : undefined,
          symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined,
          passedScreening: passed,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to save.");
      }
      setOk("Health check recorded.");
      setShowForm(false);
      setChildId("");
      setTemperature("");
      setSelectedSymptoms([]);
      setPassed(true);
      setNotes("");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to save."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Daily health checks"
            description="BC licensing requires daily health screening before a child enters care."
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            />
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" /> Check-in
            </button>
          </div>
        </div>

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-slate-900">{checks.length}</div>
              <div className="mt-1 text-xs text-slate-500">Checked</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-emerald-600">{checks.filter((c) => c.passedScreening).length}</div>
              <div className="mt-1 text-xs text-slate-500">Passed</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-rose-600">{checks.filter((c) => !c.passedScreening).length}</div>
              <div className="mt-1 text-xs text-slate-500">Failed</div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Record health check</CardTitle>
                <button onClick={() => setShowForm(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Child *</div>
                  <select value={childId} onChange={(e) => setChildId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option value="">Select child</option>
                    {unchecked.map((c) => (
                      <option key={c.id} value={c.id}>{c.fullName || c.id.slice(0, 8)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Temperature</div>
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.5" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
                      <span className="text-sm text-slate-400">°C</span>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Screening result</div>
                    <div className="flex gap-2">
                      <button onClick={() => setPassed(true)} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${passed ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                        Passed
                      </button>
                      <button onClick={() => setPassed(false)} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${!passed ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500"}`}>
                        Failed
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Symptoms (select all that apply)</div>
                  <div className="flex flex-wrap gap-2">
                    {SYMPTOMS.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => toggleSymptom(s.key)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${selectedSymptoms.includes(s.key) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional observations..." rows={2} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
                </div>
                <button onClick={submit} disabled={saving || !childId} className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "Saving..." : "Record check"}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checks list */}
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : checks.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-8 text-center">
              <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <div className="text-sm text-slate-500">
                No health checks for {date}.{" "}
                <button onClick={() => setShowForm(true)} className="font-medium text-slate-700 hover:text-slate-900">
                  Start screening &rarr;
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {checks.map((c) => {
              const child = children.find((ch) => ch.id === c.childId);
              const symptoms = Array.isArray(c.symptoms) ? c.symptoms as string[] : [];
              return (
                <Card key={c.id} className={`rounded-2xl border-0 shadow-sm ${!c.passedScreening ? "ring-2 ring-rose-200" : ""}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${c.passedScreening ? "bg-emerald-100" : "bg-rose-100"}`}>
                          {c.passedScreening ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{child?.fullName || c.childId.slice(0, 8)}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {c.temperature != null && (
                              <span className="flex items-center gap-0.5">
                                <Thermometer className="h-3 w-3" /> {c.temperature}°C
                              </span>
                            )}
                            {symptoms.length > 0 && (
                              <span className="text-rose-500">{symptoms.join(", ")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.passedScreening ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {c.passedScreening ? "Passed" : "Failed"}
                      </span>
                    </div>
                    {c.notes && <div className="mt-2 pl-12 text-sm text-slate-500">{c.notes}</div>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Unchecked children */}
        {unchecked.length > 0 && checks.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Not yet checked ({unchecked.length})</div>
            <div className="flex flex-wrap gap-2">
              {unchecked.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setChildId(c.id); setShowForm(true); }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  {c.fullName || c.id.slice(0, 8)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
