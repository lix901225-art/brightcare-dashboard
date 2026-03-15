"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Clock, Send } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { invoiceStatusBadgeOverdue as statusBadgeClass } from "@/lib/badge-styles";

type InvoiceDetail = {
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
  notes?: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    method?: string | null;
    reference?: string | null;
    notes?: string | null;
  }>;
};

function statusLabel(status: string, isOverdue: boolean) {
  if (isOverdue) return "OVERDUE";
  return status.toUpperCase();
}

export default function BillingDetailPage() {
  const params = useParams();
  const id = String(params.id || "");

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  // Partial payment form
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");

  async function loadDetail() {
    try {
      setLoading(true);
      setError("");
      const res = await apiFetch(`/billing/invoices/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Invoice failed: ${res.status}`);
      setInvoice(data);
    } catch (e: any) {
      setError(e?.message || "Unable to load invoice.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  const isOverdue = useMemo(() => {
    if (!invoice) return false;
    if (invoice.status.toUpperCase() === "PAID" || invoice.status.toUpperCase() === "VOID") return false;
    if (!invoice.dueDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    return invoice.dueDate.slice(0, 10) < today && invoice.balanceAmount > 0;
  }, [invoice]);

  const isVoid = invoice?.status.toUpperCase() === "VOID";
  const isPaid = invoice?.status.toUpperCase() === "PAID";
  const isDraft = invoice?.status.toUpperCase() === "DRAFT";

  const daysOverdueCount = useMemo(() => {
    if (!isOverdue || !invoice?.dueDate) return 0;
    const due = new Date(invoice.dueDate);
    const now = new Date(new Date().toDateString());
    return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86_400_000));
  }, [isOverdue, invoice?.dueDate]);

  async function markPaid() {
    try {
      setBusy(true);
      setError("");
      setOk("");
      const res = await apiFetch(`/billing/invoices/${encodeURIComponent(id)}/mark-paid`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Mark paid failed: ${res.status}`);
      setOk("Invoice marked as paid.");
      await loadDetail();
    } catch (e: any) {
      setError(e?.message || "Unable to mark paid.");
    } finally {
      setBusy(false);
    }
  }

  async function markUnpaid() {
    try {
      setBusy(true);
      setError("");
      setOk("");
      const res = await apiFetch(`/billing/invoices/${encodeURIComponent(id)}/mark-unpaid`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Mark unpaid failed: ${res.status}`);
      setOk("Invoice marked as unpaid. All payments removed.");
      await loadDetail();
    } catch (e: any) {
      setError(e?.message || "Unable to mark unpaid.");
    } finally {
      setBusy(false);
    }
  }

  async function voidInvoice() {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    try {
      setBusy(true);
      setError("");
      setOk("");
      const res = await apiFetch(`/billing/invoices/${encodeURIComponent(id)}/void`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Void failed: ${res.status}`);
      setOk("Invoice voided.");
      await loadDetail();
    } catch (e: any) {
      setError(e?.message || "Unable to void invoice.");
    } finally {
      setBusy(false);
    }
  }

  async function issueInvoice() {
    try {
      setBusy(true);
      setError("");
      setOk("");
      const res = await apiFetch(`/billing/invoices/${encodeURIComponent(id)}/issue`, {
        method: "PATCH",
        body: JSON.stringify({ issueDate: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Issue failed");
      setOk("Invoice issued successfully.");
      await loadDetail();
    } catch (e: any) {
      setError(e?.message || "Unable to issue invoice.");
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment() {
    try {
      setBusy(true);
      setError("");
      setOk("");
      const amount = Number(payAmount || 0);
      if (amount <= 0) throw new Error("Payment amount must be greater than 0.");

      const res = await apiFetch(`/billing/invoices/${encodeURIComponent(id)}/mark-paid`, {
        method: "PATCH",
        body: JSON.stringify({
          amount,
          method: payMethod || undefined,
          reference: payReference || undefined,
          notes: payNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Payment failed: ${res.status}`);

      setOk(`Payment of $${amount.toFixed(2)} recorded.`);
      setShowPayment(false);
      setPayAmount("");
      setPayMethod("");
      setPayReference("");
      setPayNotes("");
      await loadDetail();
    } catch (e: any) {
      setError(e?.message || "Unable to record payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <PageIntro
          title={invoice?.childName || "Invoice"}
          description={
            invoice
              ? `Invoice ${invoice.id.slice(0, 8)}... · Issued ${invoice.issueDate?.slice(0, 10) || "—"}${invoice.dueDate ? ` · Due ${invoice.dueDate.slice(0, 10)}` : ""} · ${invoice.currency}`
              : "Invoice detail, items, and payment history."
          }
        />

        <div className="mb-4">
          <Link
            href="/billing"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            &larr; Back to billing
          </Link>
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

        {loading || !invoice ? (
          <div className="text-sm text-slate-500">Loading invoice...</div>
        ) : (
          <>
            {/* DRAFT banner */}
            {isDraft ? (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 p-3">
                <div className="text-sm font-medium text-slate-600">
                  This invoice is a draft and has not been issued to the family yet.
                </div>
                <button
                  onClick={issueInvoice}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  Issue now
                </button>
              </div>
            ) : null}

            {/* Overdue banner */}
            {isOverdue ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <div className="text-sm font-medium text-rose-700">
                    This invoice is overdue. Due date was {invoice.dueDate?.slice(0, 10)}.
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-rose-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysOverdueCount} day{daysOverdueCount !== 1 ? "s" : ""} overdue
                    </span>
                    <span>Balance: ${invoice.balanceAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Void banner */}
            {isVoid ? (
              <div className="mb-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-500">
                This invoice has been voided and is no longer active.
              </div>
            ) : null}

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Status</CardTitle></CardHeader>
                <CardContent>
                  <span className={["inline-flex rounded-full border px-3 py-1 text-sm font-medium", statusBadgeClass(invoice.status, isOverdue)].join(" ")}>
                    {statusLabel(invoice.status, isOverdue)}
                  </span>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-semibold">${invoice.totalAmount.toFixed(2)}</div></CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Paid</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-semibold text-emerald-700">${invoice.paidAmount.toFixed(2)}</div></CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Balance</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-2xl font-semibold ${invoice.balanceAmount > 0 ? "text-rose-600" : "text-slate-900"}`}>
                    ${invoice.balanceAmount.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {invoice.notes ? (
              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-medium text-slate-500">Notes & fee reduction info:</span> {invoice.notes}
              </div>
            ) : null}

            {invoice.items.some((i) => i.description.toLowerCase().includes("accb") || i.amount < 0) && (
              <div className="mb-6 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-700">
                <span className="font-semibold">BC Fee Reduction:</span>
                This invoice includes an Affordable Child Care Benefit (ACCB) offset. Actual parent fees may vary based on family eligibility and income level. CCFRI provider funding is applied at the centre level.
              </div>
            )}

            {/* Actions */}
            {!isVoid ? (
              <div className="mb-6 flex flex-wrap gap-3">
                {isDraft ? (
                  <button
                    onClick={issueInvoice}
                    disabled={busy}
                    className="inline-flex h-11 items-center gap-2 justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Issue invoice
                  </button>
                ) : null}
                {!isPaid && !isDraft && invoice.balanceAmount > 0 ? (
                  <>
                    <button
                      onClick={markPaid}
                      disabled={busy}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Mark fully paid
                    </button>
                    <button
                      onClick={() => {
                        setShowPayment((v) => !v);
                        setPayAmount(String(invoice.balanceAmount.toFixed(2)));
                      }}
                      disabled={busy}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Record payment
                    </button>
                  </>
                ) : null}
                {isPaid ? (
                  <button
                    onClick={markUnpaid}
                    disabled={busy}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Mark unpaid
                  </button>
                ) : null}
                <button
                  onClick={voidInvoice}
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  Void invoice
                </button>
              </div>
            ) : null}

            {/* Partial payment form */}
            {showPayment && !isVoid ? (
              <Card className="mb-6 rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Record payment</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Amount</div>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Payment method</div>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      >
                        <option value="">Select method</option>
                        <option value="CASH">Cash</option>
                        <option value="CHECK">Check</option>
                        <option value="E_TRANSFER">E-Transfer</option>
                        <option value="CREDIT_CARD">Credit Card</option>
                        <option value="DEBIT">Debit</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Reference / confirmation #</div>
                      <input
                        value={payReference}
                        onChange={(e) => setPayReference(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
                      <input
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={recordPayment}
                      disabled={busy}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {busy ? "Recording..." : `Record $${Number(payAmount || 0).toFixed(2)} payment`}
                    </button>
                    <button
                      onClick={() => setShowPayment(false)}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="mb-6 rounded-2xl border-0 shadow-sm">
              <CardHeader><CardTitle>Invoice items</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium">Qty</th>
                        <th className="px-4 py-3 font-medium">Unit price</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item) => {
                        const isAccbOffset = item.description.toLowerCase().includes("accb") || item.amount < 0;
                        return (
                          <tr key={item.id} className={`border-t border-slate-200 ${isAccbOffset ? "bg-blue-50/50" : ""}`}>
                            <td className="px-4 py-3">
                              {item.description}
                              {isAccbOffset && (
                                <span className="ml-2 inline-flex rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                  ACCB
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">{item.quantity}</td>
                            <td className="px-4 py-3">${item.unitPrice.toFixed(2)}</td>
                            <td className={`px-4 py-3 font-medium ${isAccbOffset ? "text-blue-700" : ""}`}>
                              {item.amount < 0 ? `–$${Math.abs(item.amount).toFixed(2)}` : `$${item.amount.toFixed(2)}`}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-slate-300 bg-slate-50">
                        <td colSpan={3} className="px-4 py-3 font-semibold text-slate-900">Total</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">${invoice.totalAmount.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader><CardTitle>Payment history</CardTitle></CardHeader>
              <CardContent>
                {invoice.payments.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                    No payments recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Amount</th>
                          <th className="px-4 py-3 font-medium">Method</th>
                          <th className="px-4 py-3 font-medium">Reference</th>
                          <th className="px-4 py-3 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.payments.map((payment) => (
                          <tr key={payment.id} className="border-t border-slate-200">
                            <td className="px-4 py-3">{new Date(payment.paidAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-medium text-emerald-700">${payment.amount.toFixed(2)}</td>
                            <td className="px-4 py-3">{payment.method || "—"}</td>
                            <td className="px-4 py-3">{payment.reference || "—"}</td>
                            <td className="px-4 py-3 text-slate-500">{payment.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleGate>
  );
}
