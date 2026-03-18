"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardList, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type UpdateRequest = {
  id: string;
  childId: string;
  requestedBy: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  status: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

const FIELD_LABELS: Record<string, string> = {
  allergies: "Allergies",
  medicalNotes: "Medical Notes",
  emergencyNotes: "Emergency Notes",
  pickupNotes: "Pickup Notes",
  mealNotes: "Meal Notes",
  languageNotes: "Language Notes",
};

export default function UpdateRequestsPage() {
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/update-requests/pending");
      if (res.ok) setRequests(await res.json());
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    try {
      setError("");
      const res = await apiFetch(`/update-requests/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error("Approve failed.");
      setOk("Request approved — child record updated.");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to approve."));
    }
  }

  async function reject(id: string) {
    try {
      setError("");
      const res = await apiFetch(`/update-requests/${id}/reject`, { method: "PATCH" });
      if (!res.ok) throw new Error("Reject failed.");
      setOk("Request rejected.");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to reject."));
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <PageIntro
          title="Update requests"
          description="Parents can request changes to their child's information. Review and approve or reject below."
        />

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : requests.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-8 text-center">
              <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <div className="text-sm text-slate-500">No pending requests. All caught up!</div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-3">
            {requests.map((r) => (
              <Card key={r.id} className="rounded-2xl border-0 shadow-sm">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {FIELD_LABELS[r.field] || r.field}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Child: {r.childId.slice(0, 8)} | Requested {new Date(r.createdAt).toLocaleDateString("en-CA")}
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">Current value</div>
                          <div className="text-sm text-slate-700">{r.oldValue || "—"}</div>
                        </div>
                        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-violet-400">Requested change</div>
                          <div className="text-sm text-violet-900">{r.newValue || "—"}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(r.id)}
                        title="Approve"
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => reject(r.id)}
                        title="Reject"
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
