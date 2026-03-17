"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ClipboardCheck,
  Edit2,
  Loader2,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/api-helpers";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/error";

/* ─── types ─── */

type Inspection = {
  id: string;
  date: string;
  healthAuthority: string;
  inspectorName?: string | null;
  result: string;
  notes?: string | null;
  followUpRequired: boolean;
  followUpDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

const HEALTH_AUTHORITIES = [
  "Fraser Health",
  "Vancouver Coastal Health",
  "Interior Health",
  "Island Health",
  "Northern Health",
];

const RESULTS = ["Pass", "Pass with Conditions", "Fail", "Follow-up Required"];

/* ─── component ─── */

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    healthAuthority: HEALTH_AUTHORITIES[0],
    inspectorName: "",
    result: RESULTS[0],
    notes: "",
    followUpRequired: false,
    followUpDate: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiFetch("/compliance/inspections");
      if (res.ok) {
        const data = await res.json();
        setInspections(data);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      healthAuthority: HEALTH_AUTHORITIES[0],
      inspectorName: "",
      result: RESULTS[0],
      notes: "",
      followUpRequired: false,
      followUpDate: "",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(inspection: Inspection) {
    setFormData({
      date: inspection.date.slice(0, 10),
      healthAuthority: inspection.healthAuthority,
      inspectorName: inspection.inspectorName || "",
      result: inspection.result,
      notes: inspection.notes || "",
      followUpRequired: inspection.followUpRequired,
      followUpDate: inspection.followUpDate?.slice(0, 10) || "",
    });
    setEditingId(inspection.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!formData.date || !formData.healthAuthority || !formData.result) {
      setError("Date, health authority, and result are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        date: formData.date,
        healthAuthority: formData.healthAuthority,
        inspectorName: formData.inspectorName || null,
        result: formData.result,
        notes: formData.notes || null,
        followUpRequired: formData.followUpRequired,
        followUpDate: formData.followUpDate || null,
      };

      const res = editingId
        ? await apiFetch(`/compliance/inspections/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await apiFetch("/compliance/inspections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (res.ok) {
        resetForm();
        loadData();
      } else {
        const err = await res.json();
        setError(err.message || "Failed to save inspection.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this inspection record? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/compliance/inspections/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const followUpRequired = inspections.filter((i) => i.followUpRequired && i.followUpDate);
  const failedInspections = inspections.filter((i) => i.result === "Fail");

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <PageIntro
        title="Health Authority Inspections"
        description="Track BC health authority inspection records and follow-ups"
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Alert cards */}
        {(followUpRequired.length > 0 || failedInspections.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {failedInspections.length > 0 && (
              <Card className="rounded-2xl border-0 bg-gradient-to-br from-red-50 to-red-100 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {failedInspections.length} Failed
                    </h3>
                    <p className="text-xs text-slate-600">
                      Inspections require attention
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {followUpRequired.length > 0 && (
              <Card className="rounded-2xl border-0 bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {followUpRequired.length} Follow-ups
                    </h3>
                    <p className="text-xs text-slate-600">Scheduled for review</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Inspection Records</h2>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New Inspection"}
          </button>
        </div>

        {showForm && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle>
                {editingId ? "Edit Inspection" : "Record Inspection"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Health Authority
                  </label>
                  <select
                    value={formData.healthAuthority}
                    onChange={(e) => setFormData({ ...formData, healthAuthority: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    {HEALTH_AUTHORITIES.map((ha) => (
                      <option key={ha} value={ha}>
                        {ha}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Inspector Name (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.inspectorName}
                    onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                    placeholder="Inspector name"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Result
                  </label>
                  <select
                    value={formData.result}
                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    {RESULTS.map((result) => (
                      <option key={result} value={result}>
                        {result}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Inspection notes, findings, or recommendations..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="followUpRequired"
                  checked={formData.followUpRequired}
                  onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="followUpRequired" className="text-sm text-slate-700">
                  Follow-up inspection required
                </label>
              </div>

              {formData.followUpRequired && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                {saving ? "Saving..." : editingId ? "Update Inspection" : "Record Inspection"}
              </button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <CardListSkeleton count={3} />
        ) : inspections.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-600">No inspection records yet</p>
              <p className="text-xs text-slate-400">Click "New Inspection" to add one</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {inspections.map((inspection) => {
              const isPassed = inspection.result === "Pass";
              const isFailed = inspection.result === "Fail";

              return (
                <Card
                  key={inspection.id}
                  className={`rounded-2xl border-0 shadow-sm ${
                    isFailed ? "bg-red-50" : ""
                  }`}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          isFailed
                            ? "bg-red-100 text-red-600"
                            : isPassed
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {inspection.healthAuthority}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-600">
                          <span>{formatDate(inspection.date)}</span>
                          {inspection.inspectorName && (
                            <>
                              <span>•</span>
                              <span>Inspector: {inspection.inspectorName}</span>
                            </>
                          )}
                        </div>
                        {inspection.notes && (
                          <p className="mt-1 text-xs text-slate-500">{inspection.notes}</p>
                        )}
                        {inspection.followUpRequired && inspection.followUpDate && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
                            <Calendar className="h-3 w-3" />
                            Follow-up: {formatDate(inspection.followUpDate)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPassed && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <Check className="h-3 w-3" />
                          {inspection.result}
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          {inspection.result}
                        </span>
                      )}
                      {!isPassed && !isFailed && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          {inspection.result}
                        </span>
                      )}
                      <button
                        onClick={() => handleEdit(inspection)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(inspection.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
