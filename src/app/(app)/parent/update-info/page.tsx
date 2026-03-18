"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Edit2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type Child = {
  id: string;
  fullName?: string | null;
  allergies?: string | null;
  medicalNotes?: string | null;
  emergencyNotes?: string | null;
  pickupNotes?: string | null;
  mealNotes?: string | null;
  languageNotes?: string | null;
};

type Request = {
  id: string;
  childId: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  status: string;
  createdAt: string;
};

const EDITABLE_FIELDS = [
  { key: "allergies", label: "Allergies" },
  { key: "medicalNotes", label: "Medical notes" },
  { key: "emergencyNotes", label: "Emergency notes" },
  { key: "pickupNotes", label: "Pickup notes" },
  { key: "mealNotes", label: "Meal preferences / restrictions" },
  { key: "languageNotes", label: "Language notes" },
];

export default function ParentUpdateInfoPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Edit state
  const [editingChild, setEditingChild] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/children").then((r) => r.ok ? r.json() : []),
      apiFetch("/update-requests/my").then((r) => r.ok ? r.json() : []),
    ]).then(([childData, reqData]) => {
      const c = Array.isArray(childData) ? childData : (childData?.children || []);
      setChildren(c);
      setRequests(Array.isArray(reqData) ? reqData : []);
    }).finally(() => setLoading(false));
  }, []);

  function startEdit(childId: string, field: string, currentValue: string) {
    setEditingChild(childId);
    setEditingField(field);
    setEditValue(currentValue);
  }

  function cancelEdit() {
    setEditingChild(null);
    setEditingField(null);
    setEditValue("");
  }

  async function submitRequest() {
    if (!editingChild || !editingField) return;
    try {
      setSubmitting(true);
      setError("");
      const res = await apiFetch("/update-requests", {
        method: "POST",
        body: JSON.stringify({
          childId: editingChild,
          field: editingField,
          newValue: editValue.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to submit.");
      }
      const newReq = await res.json();
      setRequests((prev) => [newReq, ...prev]);
      setOk("Update request submitted. Staff will review it shortly.");
      cancelEdit();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to submit request."));
    } finally {
      setSubmitting(false);
    }
  }

  const pendingFor = (childId: string, field: string) =>
    requests.find((r) => r.childId === childId && r.field === field && r.status === "PENDING");

  if (loading) return <div className="p-6 text-center text-sm text-slate-400">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl p-4 lg:p-6">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Update child info</h1>
      <p className="mb-6 text-sm text-slate-500">
        Request changes to your child&apos;s medical or emergency information. Changes require staff approval.
      </p>

      {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {children.map((child) => (
        <Card key={child.id} className="mb-4 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{child.fullName || "Child"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {EDITABLE_FIELDS.map(({ key, label }) => {
              const current = (child as any)[key] || "";
              const pending = pendingFor(child.id, key);
              const isEditing = editingChild === child.id && editingField === key;

              return (
                <div key={key} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
                    {pending ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <Clock className="h-3 w-3" /> Pending review
                      </span>
                    ) : (
                      <button
                        onClick={() => startEdit(child.id, key, current)}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-600"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-violet-300 bg-white p-2 text-sm outline-none focus:border-violet-400"
                        autoFocus
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={submitRequest}
                          disabled={submitting}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" /> {submitting ? "Submitting..." : "Submit request"}
                        </button>
                        <button onClick={cancelEdit} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50">
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-700">{current || <span className="text-slate-400">Not set</span>}</div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Request history */}
      {requests.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Request history</h2>
          <div className="space-y-2">
            {requests.slice(0, 20).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">
                    {EDITABLE_FIELDS.find((f) => f.key === r.field)?.label || r.field}
                  </div>
                  <div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("en-CA")}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                  r.status === "REJECTED" ? "bg-rose-100 text-rose-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {r.status === "APPROVED" ? "Approved" : r.status === "REJECTED" ? "Rejected" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
