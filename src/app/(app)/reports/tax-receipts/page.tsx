"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Download,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Search,
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

type Child = {
  id: string;
  fullName: string;
};

type TaxReceipt = {
  id: string;
  childId: string;
  guardianId: string;
  year: number;
  totalAmount: string;
  receiptNumber: string;
  issuedAt: string;
  notes?: string | null;
  createdAt: string;
  childName?: string;
};

/* ─── component ─── */

export default function TaxReceiptsPage() {
  const [receipts, setReceipts] = useState<TaxReceipt[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

  const [formData, setFormData] = useState({
    childId: "",
    guardianId: "",
    year: new Date().getFullYear(),
    totalAmount: "",
    receiptNumber: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [yearFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [receiptsRes, childrenRes] = await Promise.all([
        apiFetch(`/tax-receipts?year=${yearFilter}`),
        apiFetch("/children"),
      ]);

      if (receiptsRes.ok) {
        const data = await receiptsRes.json();
        setReceipts(data);
      }

      if (childrenRes.ok) {
        const data = await childrenRes.json();
        setChildren(data);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.childId || !formData.guardianId || !formData.totalAmount || !formData.receiptNumber) {
      setError("Child, guardian, amount, and receipt number are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await apiFetch("/tax-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: formData.childId,
          guardianId: formData.guardianId,
          year: formData.year,
          totalAmount: parseFloat(formData.totalAmount),
          receiptNumber: formData.receiptNumber,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({
          childId: "",
          guardianId: "",
          year: new Date().getFullYear(),
          totalAmount: "",
          receiptNumber: "",
          notes: "",
        });
        loadData();
      } else {
        const err = await res.json();
        setError(err.message || "Failed to create tax receipt.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tax receipt? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/tax-receipts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const availableYears = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <PageIntro
        title="Tax Receipts"
        description="Generate and manage Canada Child Benefit tax receipts for parents"
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Filter by year:</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(parseInt(e.target.value, 10))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New Receipt"}
          </button>
        </div>

        {showForm && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Generate Tax Receipt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Child
                </label>
                <select
                  value={formData.childId}
                  onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  <option value="">Select child...</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Guardian User ID
                </label>
                <input
                  type="text"
                  value={formData.guardianId}
                  onChange={(e) => setFormData({ ...formData, guardianId: e.target.value })}
                  placeholder="Enter guardian user ID"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Tax Year
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total Amount (CAD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    placeholder="0.00"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                  placeholder="e.g., TR-2025-001"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                />
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
                onClick={handleCreate}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4" />
                )}
                {saving ? "Generating..." : "Generate Receipt"}
              </button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <CardListSkeleton count={3} />
        ) : receipts.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-600">No tax receipts for {yearFilter}</p>
              <p className="text-xs text-slate-400">Click "New Receipt" to generate one</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => {
              const child = children.find((c) => c.id === receipt.childId);
              return (
                <Card key={receipt.id} className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Receipt className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {child?.fullName || receipt.childId}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <span className="font-medium">{receipt.receiptNumber}</span>
                          <span>•</span>
                          <span>Tax Year {receipt.year}</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600">
                            ${parseFloat(receipt.totalAmount).toFixed(2)} CAD
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Issued {formatDate(receipt.issuedAt)}
                        </p>
                        {receipt.notes && (
                          <p className="text-xs text-slate-500">{receipt.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(receipt.id)}
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
