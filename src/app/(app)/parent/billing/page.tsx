"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDate as fmtDate } from "@/lib/api-helpers";
import { invoiceStatusBadge as statusBadge } from "@/lib/badge-styles";
import { MetricCardsSkeleton, CardListSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

type BillingSummary = {
  childId: string;
  childName: string;
  total: number;
  paid: number;
  balance: number;
};

type InvoiceRow = {
  id: string;
  childId: string;
  childName?: string | null;
  status: string;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  itemsCount: number;
  paymentsCount: number;
};

type InvoiceDetail = {
  id: string;
  childName?: string | null;
  status: string;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string | null;
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
    paidAt?: string | null;
    method?: string | null;
  }>;
};

function fmtCurrency(amount: number, currency?: string | null) {
  return `$${amount.toFixed(2)}`;
}

function isOverdue(inv: InvoiceRow): boolean {
  if (inv.status.toUpperCase() === "PAID" || inv.status.toUpperCase() === "VOID") return false;
  if (!inv.dueDate || inv.balanceAmount <= 0) return false;
  return new Date(inv.dueDate) < new Date(new Date().toDateString());
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date(new Date().toDateString());
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86_400_000));
}

export default function ParentBillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<BillingSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, invoicesRes] = await Promise.all([
        apiFetch("/billing/summary"),
        apiFetch("/billing/invoices"),
      ]);
      const summaryData = await summaryRes.json();
      const invoicesData = await invoicesRes.json();

      if (!summaryRes.ok) throw new Error(summaryData?.message || `Summary failed: ${summaryRes.status}`);
      if (!invoicesRes.ok) throw new Error(invoicesData?.message || `Invoices failed: ${invoicesRes.status}`);

      setSummary(Array.isArray(summaryData) ? summaryData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load billing."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function toggleInvoice(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    try {
      setDetailLoading(true);
      const res = await apiFetch(`/billing/invoices/${id}`);
      const data = await res.json();
      if (res.ok) setDetail(data);
    } catch { /* silent */ } finally {
      setDetailLoading(false);
    }
  }

  const totals = useMemo(() => {
    const totalBilled = summary.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalPaid = summary.reduce((sum, s) => sum + Number(s.paid || 0), 0);
    const totalBalance = summary.reduce((sum, s) => sum + Number(s.balance || 0), 0);
    return { totalBilled, totalPaid, totalBalance };
  }, [summary]);

  const unpaidInvoices = useMemo(() => {
    return invoices.filter((i) => i.status.toUpperCase() !== "PAID" && i.status.toUpperCase() !== "VOID" && i.balanceAmount > 0);
  }, [invoices]);

  const overdueInvoices = useMemo(() => invoices.filter(isOverdue), [invoices]);
  const totalOverdue = useMemo(() => overdueInvoices.reduce((s, i) => s + Number(i.balanceAmount || 0), 0), [overdueInvoices]);

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const aOver = isOverdue(a) ? 0 : 1;
      const bOver = isOverdue(b) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      // Then by due date descending
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [invoices]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <div>
        <div className="mb-4">
          <Link href="/parent" className="text-sm text-slate-500 hover:text-slate-700">
            &larr; Back to parent home
          </Link>
        </div>

        <PageIntro
          title="Billing"
          description="View your invoices, payments, and account balance."
        />

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="space-y-6">
            <MetricCardsSkeleton count={3} />
            <CardListSkeleton count={3} />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total billed</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{fmtCurrency(totals.totalBilled)}</div>
                  <div className="mt-1 text-xs text-slate-500">{invoices.length} invoices</div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-600">Total paid</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-emerald-700">{fmtCurrency(totals.totalPaid)}</div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className={["text-sm", totals.totalBalance > 0 ? "text-rose-600" : "text-slate-500"].join(" ")}>
                    Balance due
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={["text-3xl font-semibold", totals.totalBalance > 0 ? "text-rose-700" : ""].join(" ")}>
                    {fmtCurrency(totals.totalBalance)}
                  </div>
                  {unpaidInvoices.length > 0 ? (
                    <div className="mt-1 text-xs text-rose-600">{unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? "s" : ""}</div>
                  ) : (
                    <div className="mt-1 text-xs text-emerald-600">All paid up</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Overdue urgency banner */}
            {overdueInvoices.length > 0 ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <div className="text-sm font-semibold text-rose-800">
                    {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? "s" : ""} · {fmtCurrency(totalOverdue)} past due
                  </div>
                  <div className="mt-1 text-xs text-rose-600">
                    {overdueInvoices.map((inv) => {
                      const days = inv.dueDate ? daysOverdue(inv.dueDate) : 0;
                      return `${inv.childName || "Invoice"}: ${fmtCurrency(inv.balanceAmount)} (${days}d overdue)`;
                    }).join(" · ")}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Per-child balances */}
            {summary.length > 0 ? (
              <Card className="mt-6 rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Balance by child</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary.map((s) => (
                      <div key={s.childId} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-medium text-slate-900">{s.childName}</div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-500">Billed: {fmtCurrency(s.total)}</span>
                          <span className="text-emerald-600">Paid: {fmtCurrency(s.paid)}</span>
                          <span className={["font-semibold", s.balance > 0 ? "text-rose-700" : "text-emerald-700"].join(" ")}>
                            {s.balance > 0 ? `Due: ${fmtCurrency(s.balance)}` : "Paid"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Invoices list */}
            <Card className="mt-6 rounded-2xl border-0 shadow-sm">
              <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <EmptyState title="No invoices yet" description="Invoices will appear here once they've been issued." />
                ) : (
                  <div className="space-y-3">
                    {sortedInvoices.map((inv) => {
                      const isExpanded = expandedId === inv.id;
                      const overdue = isOverdue(inv);
                      const days = overdue && inv.dueDate ? daysOverdue(inv.dueDate) : 0;
                      const displayStatus = overdue ? "OVERDUE" : inv.status;

                      return (
                        <div key={inv.id} className={["rounded-xl border", overdue ? "border-rose-200 bg-rose-50/30" : "border-slate-200"].join(" ")}>
                          <button
                            onClick={() => toggleInvoice(inv.id)}
                            className="flex w-full items-center justify-between gap-3 p-4 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusBadge(displayStatus)].join(" ")}>
                                {displayStatus}
                              </span>
                              <div>
                                <div className="text-sm font-medium text-slate-900">{inv.childName || "Child"}</div>
                                <div className="text-xs text-slate-500">
                                  Issued {fmtDate(inv.issueDate)}
                                  {inv.dueDate ? ` · Due ${fmtDate(inv.dueDate)}` : ""}
                                </div>
                                {overdue ? (
                                  <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-rose-600">
                                    <Clock className="h-3 w-3" />
                                    {days} day{days !== 1 ? "s" : ""} overdue
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-semibold text-slate-900">{fmtCurrency(inv.totalAmount)}</div>
                                {inv.balanceAmount > 0 ? (
                                  <div className={["text-xs font-medium", overdue ? "text-rose-700" : "text-rose-600"].join(" ")}>
                                    Due: {fmtCurrency(inv.balanceAmount)}
                                  </div>
                                ) : (
                                  <div className="text-xs text-emerald-600">Paid</div>
                                )}
                              </div>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </div>
                          </button>

                          {isExpanded ? (
                            <div className="border-t border-slate-100 p-4">
                              {detailLoading ? (
                                <div className="text-sm text-slate-500">Loading details...</div>
                              ) : detail ? (
                                <div className="space-y-4">
                                  {/* Line items */}
                                  {detail.items.length > 0 ? (
                                    <div>
                                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Items</div>
                                      {/* Mobile items list */}
                                      <div className="space-y-1.5 md:hidden">
                                        {detail.items.map((item) => (
                                          <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                                            <div className="min-w-0">
                                              <div className="text-sm text-slate-700 truncate">{item.description}</div>
                                              <div className="text-xs text-slate-400">{item.quantity} × {fmtCurrency(item.unitPrice)}</div>
                                            </div>
                                            <span className="text-sm font-medium text-slate-900 shrink-0 ml-2">{fmtCurrency(item.amount)}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {/* Desktop items table */}
                                      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-100">
                                        <table className="w-full text-sm">
                                          <thead className="bg-slate-50 text-left text-xs text-slate-500">
                                            <tr>
                                              <th className="px-3 py-2 font-medium">Description</th>
                                              <th className="px-3 py-2 font-medium text-right">Qty</th>
                                              <th className="px-3 py-2 font-medium text-right">Price</th>
                                              <th className="px-3 py-2 font-medium text-right">Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {detail.items.map((item) => (
                                              <tr key={item.id} className="border-t border-slate-100">
                                                <td className="px-3 py-2 text-slate-700">{item.description}</td>
                                                <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right text-slate-600">{fmtCurrency(item.unitPrice)}</td>
                                                <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtCurrency(item.amount)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ) : null}

                                  {/* Payments */}
                                  {detail.payments.length > 0 ? (
                                    <div>
                                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Payments</div>
                                      <div className="space-y-1">
                                        {detail.payments.map((p) => (
                                          <div key={p.id} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                                            <div className="text-emerald-700">
                                              {fmtCurrency(p.amount)}
                                              {p.method ? ` · ${p.method}` : ""}
                                            </div>
                                            <div className="text-xs text-emerald-600">{fmtDate(p.paidAt)}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}

                                  {detail.notes ? (
                                    <div>
                                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
                                      <div className="text-sm text-slate-600">{detail.notes}</div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500">Unable to load details.</div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
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
