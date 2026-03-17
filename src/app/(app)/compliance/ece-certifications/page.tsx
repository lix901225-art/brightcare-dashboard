"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  Edit2,
  Loader2,
  Plus,
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

type User = {
  id: string;
  displayName: string;
  roles?: string[];
};

type EceCertification = {
  id: string;
  userId: string;
  certNumber?: string | null;
  level?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  issuingBody?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

const ECE_LEVELS = [
  "ECE (Early Childhood Educator)",
  "ECE Assistant",
  "ECE Infant/Toddler",
  "ECE Special Needs",
  "Responsible Adult",
];

const ISSUING_BODIES = [
  "BC ECE Registry",
  "Early Childhood Educators of BC",
  "Other Province",
];

/* ─── helpers ─── */

function getExpiryStatus(expiresAt: string | null | undefined): "valid" | "expiring" | "expired" | "none" {
  if (!expiresAt) return "none";
  const now = new Date();
  const expiry = new Date(expiresAt);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 30) return "expiring";
  return "valid";
}

/* ─── component ─── */

export default function EceCertificationsPage() {
  const [certifications, setCertifications] = useState<EceCertification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    userId: "",
    certNumber: "",
    level: ECE_LEVELS[0],
    issuedAt: "",
    expiresAt: "",
    issuingBody: ISSUING_BODIES[0],
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [certsRes, usersRes] = await Promise.all([
        apiFetch("/compliance/ece-certifications"),
        apiFetch("/admin/users").catch(() => null),
      ]);

      if (certsRes.ok) {
        const data = await certsRes.json();
        setCertifications(data);
      }

      if (usersRes?.ok) {
        const data = await usersRes.json();
        setUsers(data);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      userId: "",
      certNumber: "",
      level: ECE_LEVELS[0],
      issuedAt: "",
      expiresAt: "",
      issuingBody: ISSUING_BODIES[0],
      notes: "",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(cert: EceCertification) {
    setFormData({
      userId: cert.userId,
      certNumber: cert.certNumber || "",
      level: cert.level || ECE_LEVELS[0],
      issuedAt: cert.issuedAt?.slice(0, 10) || "",
      expiresAt: cert.expiresAt?.slice(0, 10) || "",
      issuingBody: cert.issuingBody || ISSUING_BODIES[0],
      notes: cert.notes || "",
    });
    setEditingId(cert.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!formData.userId) {
      setError("User is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        userId: formData.userId,
        certNumber: formData.certNumber || null,
        level: formData.level || null,
        issuedAt: formData.issuedAt || null,
        expiresAt: formData.expiresAt || null,
        issuingBody: formData.issuingBody || null,
        notes: formData.notes || null,
      };

      const res = editingId
        ? await apiFetch(`/compliance/ece-certifications/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await apiFetch("/compliance/ece-certifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (res.ok) {
        resetForm();
        loadData();
      } else {
        const err = await res.json();
        setError(err.message || "Failed to save certification.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ECE certification? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/compliance/ece-certifications/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const expiringCerts = certifications.filter(
    (cert) => getExpiryStatus(cert.expiresAt) === "expiring"
  );
  const expiredCerts = certifications.filter(
    (cert) => getExpiryStatus(cert.expiresAt) === "expired"
  );

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <PageIntro
        title="ECE Certifications"
        description="Track BC Early Childhood Educator certifications and expiry dates"
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Alert cards */}
        {(expiringCerts.length > 0 || expiredCerts.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {expiredCerts.length > 0 && (
              <Card className="rounded-2xl border-0 bg-gradient-to-br from-red-50 to-red-100 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {expiredCerts.length} Expired
                    </h3>
                    <p className="text-xs text-slate-600">
                      Certifications require renewal
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {expiringCerts.length > 0 && (
              <Card className="rounded-2xl border-0 bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {expiringCerts.length} Expiring Soon
                    </h3>
                    <p className="text-xs text-slate-600">Within 30 days</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All Certifications</h2>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New Certification"}
          </button>
        </div>

        {showForm && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle>
                {editingId ? "Edit Certification" : "Add Certification"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Staff Member
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  disabled={!!editingId}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-50"
                >
                  <option value="">Select staff member...</option>
                  {users
                    .filter((u) => u.roles?.includes("STAFF") || u.roles?.includes("OWNER"))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Cert Number
                  </label>
                  <input
                    type="text"
                    value={formData.certNumber}
                    onChange={(e) => setFormData({ ...formData, certNumber: e.target.value })}
                    placeholder="e.g., ECE12345"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Level
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    {ECE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Issued Date
                  </label>
                  <input
                    type="date"
                    value={formData.issuedAt}
                    onChange={(e) => setFormData({ ...formData, issuedAt: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Issuing Body
                </label>
                <select
                  value={formData.issuingBody}
                  onChange={(e) => setFormData({ ...formData, issuingBody: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  {ISSUING_BODIES.map((body) => (
                    <option key={body} value={body}>
                      {body}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Award className="h-4 w-4" />
                )}
                {saving ? "Saving..." : editingId ? "Update Certification" : "Add Certification"}
              </button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <CardListSkeleton count={3} />
        ) : certifications.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Award className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-600">No ECE certifications yet</p>
              <p className="text-xs text-slate-400">Click "New Certification" to add one</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {certifications.map((cert) => {
              const status = getExpiryStatus(cert.expiresAt);
              const user = users.find((u) => u.id === cert.userId);

              return (
                <Card
                  key={cert.id}
                  className={`rounded-2xl border-0 shadow-sm ${
                    status === "expired"
                      ? "bg-red-50"
                      : status === "expiring"
                      ? "bg-amber-50"
                      : ""
                  }`}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          status === "expired"
                            ? "bg-red-100 text-red-600"
                            : status === "expiring"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {user?.displayName || cert.userId}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-600">
                          <span>{cert.level || "No level set"}</span>
                          {cert.certNumber && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-xs">#{cert.certNumber}</span>
                            </>
                          )}
                        </div>
                        {cert.expiresAt && (
                          <p className="mt-1 text-xs text-slate-500">
                            Expires: {formatDate(cert.expiresAt)}
                          </p>
                        )}
                        {cert.notes && (
                          <p className="mt-1 text-xs text-slate-500">{cert.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status === "valid" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <Check className="h-3 w-3" />
                          Valid
                        </span>
                      )}
                      {status === "expiring" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          <Calendar className="h-3 w-3" />
                          Expiring
                        </span>
                      )}
                      {status === "expired" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          Expired
                        </span>
                      )}
                      <button
                        onClick={() => handleEdit(cert)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cert.id)}
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
