"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, Info, Plus, Search, Send, Users, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { invoiceStatusBadge as statusBadge } from "@/lib/badge-styles";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";

type SummaryRow = {
  childId: string;
  childName: string;
  total: number;
  paid: number;
  balance: number;
};

type InvoiceRow = {
  id: string;
  childId: string;
  childName: string;
  status: string;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  itemsCount: number;
  paymentsCount: number;
};

type Child = {
  id: string;
  fullName?: string | null;
};

type DraftItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export default function BillingPage() {
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [filterChild, setFilterChild] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkSelectedChildren, setBulkSelectedChildren] = useState<string[]>([]);
  const [bulkTemplate, setBulkTemplate] = useState("monthly");
  const [bulkIssueDate, setBulkIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const [childId, setChildId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { description: "Child care fees", quantity: "1", unitPrice: "" },
  ]);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [summaryRes, invoicesRes, childrenRes] = await Promise.all([
        apiFetch("/billing/summary"),
        apiFetch("/billing/invoices"),
        apiFetch("/children"),
      ]);

      const summaryData = await summaryRes.json();
      const invoicesData = await invoicesRes.json();
      const childrenData = await childrenRes.json();

      if (!summaryRes.ok) throw new Error(summaryData?.message || `Summary failed: ${summaryRes.status}`);
      if (!invoicesRes.ok) throw new Error(invoicesData?.message || `Invoices failed: ${invoicesRes.status}`);
      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);

      const childRows = Array.isArray(childrenData) ? childrenData : [];

      setSummary(Array.isArray(summaryData) ? summaryData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setChildren(childRows);

      if (!childId && childRows.length > 0) {
        setChildId(childRows[0].id);
      }
    } catch (e: any) {
      setError(e?.message || "Unable to load billing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const totals = useMemo(() => {
    return {
      total: invoices.reduce((s, x) => s + Number(x.totalAmount || 0), 0),
      paid: invoices.reduce((s, x) => s + Number(x.paidAmount || 0), 0),
      balance: invoices.reduce((s, x) => s + Number(x.balanceAmount || 0), 0),
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let result = invoices;
    if (filterChild) {
      result = result.filter((inv) => inv.childId === filterChild);
    }
    if (filterStatus) {
      result = result.filter((inv) => inv.status.toUpperCase() === filterStatus.toUpperCase());
    }
    const q = query.trim().toLowerCase();
    if (!q) return result;
    return result.filter((inv) =>
      [inv.childName, inv.status, inv.id, inv.issueDate, inv.dueDate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [invoices, query, filterChild, filterStatus]);

  const invoiceStatuses = useMemo(() => {
    const set = new Set(invoices.map((inv) => inv.status.toUpperCase()));
    return Array.from(set).sort();
  }, [invoices]);

  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return invoices.filter(
      (inv) => inv.balanceAmount > 0 && inv.dueDate && inv.dueDate.slice(0, 10) < today
    ).length;
  }, [invoices]);

  const agingBuckets = useMemo(() => {
    const today = new Date();
    const buckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90plus: 0 };
    for (const inv of invoices) {
      if (inv.balanceAmount <= 0) continue;
      if (inv.status.toUpperCase() === "VOID" || inv.status.toUpperCase() === "PAID") continue;
      if (!inv.dueDate) {
        buckets.current += Number(inv.balanceAmount);
        continue;
      }
      const due = new Date(inv.dueDate);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        buckets.current += Number(inv.balanceAmount);
      } else if (diffDays <= 30) {
        buckets.days1_30 += Number(inv.balanceAmount);
      } else if (diffDays <= 60) {
        buckets.days31_60 += Number(inv.balanceAmount);
      } else if (diffDays <= 90) {
        buckets.days61_90 += Number(inv.balanceAmount);
      } else {
        buckets.days90plus += Number(inv.balanceAmount);
      }
    }
    return buckets;
  }, [invoices]);

  const draftTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const q = Number(item.quantity || 0);
      const p = Number(item.unitPrice || 0);
      return sum + q * p;
    }, 0);
  }, [items]);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addItem() {
    setItems((current) => [...current, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(index: number) {
    setItems((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  const TUITION_TEMPLATES: { label: string; items: DraftItem[]; dueDays: number }[] = [
    {
      label: "Monthly parent fees",
      items: [{ description: "Monthly child care fees (before ACCB)", quantity: "1", unitPrice: "1100" }],
      dueDays: 30,
    },
    {
      label: "Fees after ACCB",
      items: [
        { description: "Monthly child care fees", quantity: "1", unitPrice: "1100" },
        { description: "Affordable Child Care Benefit (ACCB) offset", quantity: "1", unitPrice: "-350" },
      ],
      dueDays: 30,
    },
    {
      label: "Fees + meals",
      items: [
        { description: "Monthly child care fees (before ACCB)", quantity: "1", unitPrice: "1100" },
        { description: "Meal & snack program", quantity: "1", unitPrice: "180" },
      ],
      dueDays: 30,
    },
    {
      label: "Registration / waitlist",
      items: [{ description: "Non-refundable registration & waitlist deposit", quantity: "1", unitPrice: "200" }],
      dueDays: 14,
    },
  ];

  function applyTemplate(tpl: typeof TUITION_TEMPLATES[number]) {
    setItems(tpl.items);
    if (!dueDate) {
      const due = new Date();
      due.setDate(due.getDate() + tpl.dueDays);
      setDueDate(due.toISOString().slice(0, 10));
    }
  }

  async function createInvoice(asDraft = false) {
    try {
      setSaving(true);
      setError("");
      setOk("");

      const payloadItems = items
        .map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
        }))
        .filter((item) => item.description && item.quantity > 0);

      if (!childId) throw new Error("Select a child.");
      if (!issueDate) throw new Error("Issue date is required.");
      if (payloadItems.length === 0) throw new Error("Add at least one valid item.");

      const res = await apiFetch("/billing/invoices", {
        method: "POST",
        body: JSON.stringify({
          childId,
          issueDate,
          dueDate: dueDate || undefined,
          currency,
          notes: notes || undefined,
          status: asDraft ? "DRAFT" : undefined,
          items: payloadItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create invoice failed: ${res.status}`);

      setOk(asDraft ? "Draft saved." : "Invoice issued.");
      setShowCreate(false);
      setNotes("");
      setDueDate("");
      setItems([{ description: "Tuition", quantity: "1", unitPrice: "" }]);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to create invoice.");
    } finally {
      setSaving(false);
    }
  }

  const activeChildren = useMemo(() => {
    return children.filter((c: any) => !c.status || (c.status || "").toUpperCase() === "ACTIVE");
  }, [children]);

  const BULK_TEMPLATES: Record<string, { label: string; items: { description: string; quantity: number; unitPrice: number }[]; dueDays: number }> = {
    monthly: { label: "Monthly parent fees", items: [{ description: "Monthly child care fees (before ACCB)", quantity: 1, unitPrice: 1100 }], dueDays: 30 },
    accb_offset: { label: "Fees after ACCB", items: [{ description: "Monthly child care fees", quantity: 1, unitPrice: 1100 }, { description: "Affordable Child Care Benefit (ACCB) offset", quantity: 1, unitPrice: -350 }], dueDays: 30 },
    fees_meals: { label: "Fees + meals", items: [{ description: "Monthly child care fees (before ACCB)", quantity: 1, unitPrice: 1100 }, { description: "Meal & snack program", quantity: 1, unitPrice: 180 }], dueDays: 30 },
    registration: { label: "Registration / waitlist", items: [{ description: "Non-refundable registration & waitlist deposit", quantity: 1, unitPrice: 200 }], dueDays: 14 },
  };

  async function bulkGenerate() {
    if (bulkSelectedChildren.length === 0) { setError("Select at least one child."); return; }
    const tpl = BULK_TEMPLATES[bulkTemplate];
    if (!tpl) return;

    setBulkGenerating(true);
    setError("");
    setOk("");
    let created = 0;
    let failed = 0;

    const dueDate = bulkDueDate || (() => {
      const d = new Date(bulkIssueDate);
      d.setDate(d.getDate() + tpl.dueDays);
      return d.toISOString().slice(0, 10);
    })();

    for (const cid of bulkSelectedChildren) {
      setBulkProgress(`Generating ${created + failed + 1} of ${bulkSelectedChildren.length}...`);
      try {
        const res = await apiFetch("/billing/invoices", {
          method: "POST",
          body: JSON.stringify({
            childId: cid,
            issueDate: bulkIssueDate,
            dueDate,
            currency: "CAD",
            items: tpl.items,
          }),
        });
        if (res.ok) created++; else failed++;
      } catch {
        failed++;
      }
    }

    setBulkGenerating(false);
    setBulkProgress("");
    setOk(`${created} invoice${created !== 1 ? "s" : ""} generated${failed > 0 ? ` (${failed} failed)` : ""}.`);
    setShowBulk(false);
    setBulkSelectedChildren([]);
    await loadAll();
  }

  async function issueInvoice(id: string) {
    try {
      setSaving(true);
      setError("");
      setOk("");
      const res = await apiFetch(`/billing/invoices/${id}/issue`, {
        method: "PATCH",
        body: JSON.stringify({ issueDate: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Issue failed");
      setOk("Invoice issued.");
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to issue invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Billing"
            description="Invoices, balances, and fee reduction tracking for enrolled families."
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowBulk((v) => !v); setShowCreate(false); }}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Users className="h-4 w-4" />
              Bulk generate
            </button>
            <button
              onClick={() => { setShowCreate((v) => !v); setShowBulk(false); }}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create invoice
            </button>
          </div>
        </div>

        {ok ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {ok}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* BC Affordable Child Care Benefit (ACCB) Info */}
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div className="text-sm text-blue-800">
            <span className="font-semibold">BC Affordable Child Care Benefit (ACCB)</span>
            <span className="mx-1.5 text-blue-300">|</span>
            Eligible families may receive fee reductions directly applied to invoices. Use the
            {" "}<span className="font-medium">&ldquo;Fees after ACCB&rdquo;</span> template to auto-include the ACCB offset line item.
            Fee reduction amounts vary by family income and child age.
            <span className="mx-1.5 text-blue-300">|</span>
            <span className="text-xs text-blue-600">Provider funding via CCFRI is applied at the centre level, not per-invoice.</span>
          </div>
        </div>

        {showCreate ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Create invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Child</div>
                  <select
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">Select child</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.fullName || child.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Currency</div>
                  <input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Issue date</div>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Due date</div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Notes & fee reduction info</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Family receives ACCB at $350/mo. CCFRI fee reduction applied. Contact CCRR for subsidy questions."
                  className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none placeholder:text-slate-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Record any BC fee reduction details — ACCB amount, CCFRI status, or subsidy notes for this family.
                </p>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Quick templates</div>
                <div className="flex flex-wrap gap-2">
                  {TUITION_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-3 w-3" />
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Invoice items</div>
                  <button
                    onClick={addItem}
                    className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Add item
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid gap-3 md:grid-cols-[1fr_120px_140px_44px]">
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(index, { description: e.target.value })}
                        placeholder="Description"
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                      <input
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: e.target.value })}
                        placeholder="Qty"
                        type="number"
                        min="0"
                        step="1"
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                      <input
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                        placeholder="Unit price"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                      <button
                        onClick={() => removeItem(index)}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        title="Remove item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-right text-sm font-semibold text-slate-900">
                  Draft total: ${draftTotal.toFixed(2)}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => createInvoice(false)}
                  disabled={saving}
                  className="inline-flex h-11 items-center gap-2 justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {saving ? "Saving..." : "Issue invoice"}
                </button>
                <button
                  onClick={() => createInvoice(true)}
                  disabled={saving}
                  className="inline-flex h-11 items-center gap-2 justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  Save as draft
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {showBulk ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bulk invoice generator</CardTitle>
                <span className="text-xs text-slate-500">{bulkSelectedChildren.length} of {activeChildren.length} children selected</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Template</div>
                  <select
                    value={bulkTemplate}
                    onChange={(e) => setBulkTemplate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    {Object.entries(BULK_TEMPLATES).map(([key, tpl]) => (
                      <option key={key} value={key}>{tpl.label} — ${tpl.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Issue date</div>
                  <input
                    type="date"
                    value={bulkIssueDate}
                    onChange={(e) => setBulkIssueDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Due date (auto if blank)</div>
                  <input
                    type="date"
                    value={bulkDueDate}
                    onChange={(e) => setBulkDueDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Select children</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkSelectedChildren(activeChildren.map((c) => c.id))}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkSelectedChildren([])}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid gap-1.5 md:grid-cols-3 lg:grid-cols-4">
                  {activeChildren.map((child) => {
                    const selected = bulkSelectedChildren.includes(child.id);
                    return (
                      <label
                        key={child.id}
                        className={[
                          "flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors",
                          selected ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            if (e.target.checked) setBulkSelectedChildren((prev) => [...prev, child.id]);
                            else setBulkSelectedChildren((prev) => prev.filter((id) => id !== child.id));
                          }}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-slate-700">{child.fullName || child.id}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={bulkGenerate}
                  disabled={bulkGenerating || bulkSelectedChildren.length === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {bulkGenerating ? bulkProgress || "Generating..." : `Generate ${bulkSelectedChildren.length} invoice${bulkSelectedChildren.length !== 1 ? "s" : ""}`}
                </button>
                <button
                  onClick={() => setShowBulk(false)}
                  className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Invoices</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{invoices.length}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total billed</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">${totals.total.toFixed(2)}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Paid</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold text-emerald-700">${totals.paid.toFixed(2)}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Outstanding</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">${totals.balance.toFixed(2)}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Overdue</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-rose-600">{overdueCount}</div>
              {overdueCount > 0 ? <div className="mt-1 text-xs text-rose-600">Action needed</div> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Child balances</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Child</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Paid</th>
                      <th className="px-4 py-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row) => (
                      <tr key={row.childId} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.childName}</td>
                        <td className="px-4 py-3">${row.total.toFixed(2)}</td>
                        <td className="px-4 py-3 text-emerald-700">${row.paid.toFixed(2)}</td>
                        <td className={["px-4 py-3 font-medium", row.balance > 0 ? "text-rose-700" : "text-slate-600"].join(" ")}>${row.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Accounts receivable aging</CardTitle>
              {agingBuckets.days31_60 + agingBuckets.days61_90 + agingBuckets.days90plus > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                  <AlertTriangle className="h-3 w-3" /> Overdue balances
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              {([
                { label: "Current", value: agingBuckets.current, color: "text-slate-900", bg: "bg-emerald-500" },
                { label: "1–30 days", value: agingBuckets.days1_30, color: "text-amber-700", bg: "bg-amber-400" },
                { label: "31–60 days", value: agingBuckets.days31_60, color: "text-orange-700", bg: "bg-orange-400" },
                { label: "61–90 days", value: agingBuckets.days61_90, color: "text-rose-700", bg: "bg-rose-400" },
                { label: "90+ days", value: agingBuckets.days90plus, color: "text-rose-800", bg: "bg-rose-600" },
              ] as const).map((bucket) => (
                <div key={bucket.label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${bucket.bg}`} />
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{bucket.label}</div>
                  </div>
                  <div className={`text-xl font-semibold ${bucket.value > 0 ? bucket.color : "text-slate-400"}`}>
                    ${bucket.value.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            {totals.balance > 0 ? (
              <div className="mt-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
                  {([
                    { value: agingBuckets.current, bg: "bg-emerald-500" },
                    { value: agingBuckets.days1_30, bg: "bg-amber-400" },
                    { value: agingBuckets.days31_60, bg: "bg-orange-400" },
                    { value: agingBuckets.days61_90, bg: "bg-rose-400" },
                    { value: agingBuckets.days90plus, bg: "bg-rose-600" },
                  ] as const).map((seg, i) => {
                    const pct = totals.balance > 0 ? (seg.value / totals.balance) * 100 : 0;
                    return pct > 0 ? (
                      <div key={i} className={`${seg.bg} transition-all`} style={{ width: `${pct}%` }} />
                    ) : null;
                  })}
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>Total outstanding: ${totals.balance.toFixed(2)}</span>
                  <span>
                    Collection rate: {totals.total > 0 ? Math.round((totals.paid / totals.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoices..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterChild}
              onChange={(e) => setFilterChild(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All children</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>{child.fullName || child.id}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All statuses</option>
              {invoiceStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : filteredInvoices.length === 0 ? (
              <FilteredEmptyState
                totalCount={invoices.length}
                filterLabel="search or status filter"
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Child</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Issued</th>
                      <th className="px-4 py-3 font-medium">Due</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Paid</th>
                      <th className="px-4 py-3 font-medium">Balance</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((row) => {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const isOverdue = row.balanceAmount > 0 && row.dueDate && row.dueDate.slice(0, 10) < todayStr && row.status.toUpperCase() !== "VOID" && row.status.toUpperCase() !== "PAID";
                      const displayStatus = isOverdue ? "OVERDUE" : row.status;

                      return (
                        <tr key={row.id} className={`border-t border-slate-200 ${isOverdue ? "bg-rose-50/50" : ""}`}>
                          <td className="px-4 py-3 font-medium text-slate-900">{row.childName}</td>
                          <td className="px-4 py-3">
                            <span className={["inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", statusBadge(displayStatus)].join(" ")}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">{row.issueDate?.slice(0, 10) || "—"}</td>
                          <td className={`px-4 py-3 ${isOverdue ? "font-medium text-rose-600" : ""}`}>{row.dueDate?.slice(0, 10) || "—"}</td>
                          <td className="px-4 py-3">${row.totalAmount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-emerald-700">${row.paidAmount.toFixed(2)}</td>
                          <td className={["px-4 py-3 font-medium", row.balanceAmount > 0 ? "text-rose-700" : "text-slate-600"].join(" ")}>${row.balanceAmount.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {row.status.toUpperCase() === "DRAFT" ? (
                                <button
                                  onClick={() => issueInvoice(row.id)}
                                  disabled={saving}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                                >
                                  <Send className="h-3 w-3" />
                                  Issue
                                </button>
                              ) : null}
                              <Link
                                href={`/billing/${encodeURIComponent(row.id)}`}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Open
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
