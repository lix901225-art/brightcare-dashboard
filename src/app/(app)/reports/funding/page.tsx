"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  DollarSign,
  FileText,
  Landmark,
  Loader2,
  Plus,
  Send,
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

type FundingReport = {
  id: string;
  reportType: string;
  reportMonth: string;
  childId?: string | null;
  daysAttended?: number | null;
  subsidyAmount?: string | null;
  status: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  generatedBy?: string | null;
  createdAt: string;
};

const REPORT_TYPES = [
  { value: "CCFRI", label: "CCFRI - Child Care Fee Reduction Initiative" },
  { value: "10DAY", label: "$10/Day ChildCareBC Programme" },
  { value: "ACCB", label: "ACCB - Affordable Child Care Benefit" },
  { value: "CCS", label: "CCS - Child Care Subsidy" },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
};

/* ─── component ─── */

export default function FundingReportsPage() {
  const [reports, setReports] = useState<FundingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    reportType: "CCFRI",
    reportMonth: new Date().toISOString().substring(0, 7),
    notes: "",
  });

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await apiFetch("/funding/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.reportType || !formData.reportMonth) {
      setError("Report type and month are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await apiFetch("/funding/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: formData.reportType,
          reportMonth: `${formData.reportMonth}-01`,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({ reportType: "CCFRI", reportMonth: new Date().toISOString().substring(0, 7), notes: "" });
        loadReports();
      } else {
        const err = await res.json();
        setError(err.message || "Failed to create report.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(id: string) {
    try {
      const res = await apiFetch(`/funding/reports/${id}/submit`, {
        method: "POST",
      });
      if (res.ok) {
        loadReports();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this funding report? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/funding/reports/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadReports();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <PageIntro
        title="BC Funding Reports"
        description="Manage CCFRI, $10/Day, and subsidy reports for BC Ministry submission"
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All Reports</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New Report"}
          </button>
        </div>

        {showForm && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Create Funding Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Report Type
                </label>
                <select
                  value={formData.reportType}
                  onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Report Month
                </label>
                <input
                  type="month"
                  value={formData.reportMonth}
                  onChange={(e) => setFormData({ ...formData, reportMonth: e.target.value })}
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
                  rows={3}
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
                  <FileText className="h-4 w-4" />
                )}
                {saving ? "Creating..." : "Create Report"}
              </button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <CardListSkeleton count={3} />
        ) : reports.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Landmark className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-600">No funding reports yet</p>
              <p className="text-xs text-slate-400">Click "New Report" to create one</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="rounded-2xl border-0 shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        report.reportType === "CCFRI"
                          ? "bg-sky-50 text-sky-600"
                          : report.reportType === "10DAY"
                          ? "bg-teal-50 text-teal-600"
                          : "bg-violet-50 text-violet-600"
                      }`}
                    >
                      <Landmark className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {REPORT_TYPES.find((t) => t.value === report.reportType)?.label || report.reportType}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[report.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {new Date(report.reportMonth).toLocaleDateString("en-CA", {
                          year: "numeric",
                          month: "long",
                        })}
                      </p>
                      {report.notes && <p className="text-xs text-slate-500">{report.notes}</p>}
                      {report.submittedAt && (
                        <p className="text-xs text-slate-500">
                          Submitted {formatDate(report.submittedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.status === "DRAFT" && (
                      <>
                        <button
                          onClick={() => handleSubmit(report.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Send className="h-4 w-4" />
                          Submit
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {report.status === "APPROVED" && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                        <Check className="h-4 w-4" />
                        Approved
                      </div>
                    )}
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
