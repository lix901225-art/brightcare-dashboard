"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Download, FileText, ShieldCheck } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDate as fmtDate } from "@/lib/api-helpers";
import { invoiceStatusBadge as statusBadge } from "@/lib/badge-styles";
import { MetricCardsSkeleton, CardListSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

type SummaryChild = {
  childId: string;
  childName: string;
  totalAmount: number;
  subsidyAmount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  invoiceCount: number;
};

type InvoiceRow = {
  id: string;
  childId: string;
  childName?: string | null;
  status: string;
  month?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  totalAmount: number;
  subsidyAmount: number;
  ccfriAmount?: number;
  accbAmount?: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  isGstExempt: boolean;
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
  subsidyAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  isGstExempt: boolean;
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
  const [summaryChildren, setSummaryChildren] = useState<SummaryChild[]>([]);
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

      // Handle new summary format { totals, children }
      if (summaryData && summaryData.children) {
        setSummaryChildren(Array.isArray(summaryData.children) ? summaryData.children : []);
      } else {
        setSummaryChildren(Array.isArray(summaryData) ? summaryData : []);
      }
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
    const totalBilled = summaryChildren.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const totalSubsidy = summaryChildren.reduce((sum, s) => sum + Number(s.subsidyAmount || 0), 0);
    const totalCcfri = summaryChildren.reduce((sum, s) => sum + Number((s as any).ccfriAmount || 0), 0);
    const totalAccb = summaryChildren.reduce((sum, s) => sum + Number((s as any).accbAmount || 0), 0);
    const totalNet = summaryChildren.reduce((sum, s) => sum + Number(s.netAmount || s.totalAmount - (s.subsidyAmount || 0) || 0), 0);
    const totalPaid = summaryChildren.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);
    const totalBalance = summaryChildren.reduce((sum, s) => sum + Number(s.balance || 0), 0);
    return { totalBilled, totalSubsidy, totalCcfri, totalAccb, totalNet, totalPaid, totalBalance };
  }, [summaryChildren]);

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
            {/* Fee waterfall breakdown */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader><CardTitle>Fee summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Total childcare fees</span>
                    <span className="font-semibold text-slate-900">{fmtCurrency(totals.totalBilled)}</span>
                  </div>
                  {(totals.totalCcfri > 0 || totals.totalSubsidy > 0) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-600">Less: CCFRI (Child Care Fee Reduction)</span>
                      <span className="font-medium text-blue-700">-{fmtCurrency(totals.totalCcfri || totals.totalSubsidy)}</span>
                    </div>
                  )}
                  {totals.totalAccb > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-600">Less: ACCB (Affordable Child Care Benefit)</span>
                      <span className="font-medium text-blue-700">-{fmtCurrency(totals.totalAccb)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-900">Parent portion</span>
                    <span className="font-semibold text-slate-900">{fmtCurrency(totals.totalNet || totals.totalBilled - totals.totalSubsidy)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-600">Paid to date</span>
                    <span className="font-medium text-emerald-700">{fmtCurrency(totals.totalPaid)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                    <span className={["text-sm font-bold", totals.totalBalance > 0 ? "text-rose-700" : "text-emerald-700"].join(" ")}>
                      {totals.totalBalance > 0 ? "Amount owing" : "Balance"}
                    </span>
                    <span className={["text-2xl font-bold", totals.totalBalance > 0 ? "text-rose-700" : "text-emerald-700"].join(" ")}>
                      {fmtCurrency(totals.totalBalance)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Licensed childcare in BC is GST-exempt under the Excise Tax Act.
                </div>
              </CardContent>
            </Card>

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
            {summaryChildren.length > 0 ? (
              <Card className="mt-6 rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Balance by child</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summaryChildren.map((s) => (
                      <div key={s.childId} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-medium text-slate-900">{s.childName}</div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="text-slate-500">Fees: {fmtCurrency(s.totalAmount)}</span>
                          {s.subsidyAmount > 0 && <span className="text-blue-600">Subsidy: {fmtCurrency(s.subsidyAmount)}</span>}
                          <span className="text-emerald-600">Paid: {fmtCurrency(s.paidAmount)}</span>
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
                                {inv.subsidyAmount > 0 && (
                                  <div className="text-xs text-blue-600">Subsidy: {fmtCurrency(inv.subsidyAmount)}</div>
                                )}
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

                                  {/* GST-exempt badge */}
                                  {detail.isGstExempt && (
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      Licensed childcare in BC — GST-exempt
                                    </div>
                                  )}

                                  {/* Subsidy breakdown */}
                                  {detail.subsidyAmount > 0 && (
                                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Total fees</span>
                                        <span className="font-medium">{fmtCurrency(detail.totalAmount)}</span>
                                      </div>
                                      {((detail as any).ccfriAmount > 0 || (detail as any).accbAmount > 0) ? (
                                        <>
                                          {(detail as any).ccfriAmount > 0 && (
                                            <div className="mt-1 flex items-center justify-between text-sm">
                                              <span className="text-blue-600">CCFRI (Fee Reduction)</span>
                                              <span className="font-medium text-blue-700">-{fmtCurrency((detail as any).ccfriAmount)}</span>
                                            </div>
                                          )}
                                          {(detail as any).accbAmount > 0 && (
                                            <div className="mt-1 flex items-center justify-between text-sm">
                                              <span className="text-blue-600">ACCB (Affordable Child Care)</span>
                                              <span className="font-medium text-blue-700">-{fmtCurrency((detail as any).accbAmount)}</span>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="mt-1 flex items-center justify-between text-sm">
                                          <span className="text-blue-600">Subsidy (CCFRI / ACCB)</span>
                                          <span className="font-medium text-blue-700">-{fmtCurrency(detail.subsidyAmount)}</span>
                                        </div>
                                      )}
                                      <div className="mt-1 border-t border-blue-200 pt-1 flex items-center justify-between text-sm">
                                        <span className="font-semibold text-slate-900">Parent portion</span>
                                        <span className="font-semibold text-slate-900">
                                          {fmtCurrency(detail.netAmount > 0 ? detail.netAmount : detail.totalAmount - detail.subsidyAmount)}
                                        </span>
                                      </div>
                                    </div>
                                  )}

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

            {/* Tax receipt section */}
            {(() => {
              const currentYear = new Date().getFullYear();
              const paidThisYear = invoices.filter(
                (inv) =>
                  inv.status.toUpperCase() === "PAID" &&
                  inv.issueDate?.slice(0, 4) === String(currentYear)
              );
              const yearlyTotal = paidThisYear.reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);
              const yearlySubsidy = paidThisYear.reduce((s, inv) => s + Number(inv.subsidyAmount || 0), 0);
              const yearlyPaid = paidThisYear.reduce((s, inv) => s + Number(inv.paidAmount || 0), 0);

              return (
                <Card className="mt-6 rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Year-end tax summary — {currentYear}</CardTitle>
                      <div className="flex gap-2">
                        <Link
                          href="/billing/tax-receipts"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View receipts
                        </Link>
                        <Link
                          href="/billing/tax-receipts"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {paidThisYear.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                        No paid invoices for {currentYear} yet.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                          CRA Line 21400 — Child Care Expenses
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Total childcare fees</span>
                            <span className="font-medium">{fmtCurrency(yearlyTotal)}</span>
                          </div>
                          {yearlySubsidy > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-blue-600">Less: government subsidies</span>
                              <span className="font-medium text-blue-700">-{fmtCurrency(yearlySubsidy)}</span>
                            </div>
                          )}
                          <div className="border-t border-emerald-200 pt-1.5 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">Eligible amount paid</span>
                            <span className="text-lg font-bold text-emerald-700">{fmtCurrency(yearlyPaid)}</span>
                          </div>
                        </div>
                        <div className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs text-slate-600">
                          <strong>{paidThisYear.length}</strong> paid invoice{paidThisYear.length !== 1 ? "s" : ""} in {currentYear}.
                          Report this amount on your CRA tax return under <strong>Line 21400 — Child Care Expenses</strong>.
                          Keep receipts for at least 6 years.
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </>
        )}
      </div>
    </RoleGate>
  );
}
