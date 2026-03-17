"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Download, FileText, Printer } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type Child = { id: string; fullName?: string | null; status?: string | null };
type InvoiceRow = {
  id: string;
  childId: string;
  childName?: string | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  issueDate?: string | null;
  items?: Array<{ description: string; amount: number }>;
};

type FamilyReceipt = {
  childId: string;
  childName: string;
  totalFees: number;
  totalPaid: number;
  subsidyAmount: number;
  parentPaid: number;
  invoiceCount: number;
};

export default function TaxReceiptsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear() - 1));
  const [showPrint, setShowPrint] = useState(false);
  const [selectedChild, setSelectedChild] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [childrenRes, invoicesRes] = await Promise.all([
          apiFetch("/children"),
          apiFetch("/billing/invoices"),
        ]);
        const childrenData = childrenRes.ok ? await childrenRes.json() : [];
        const invoicesData = invoicesRes.ok ? await invoicesRes.json() : [];
        setChildren(Array.isArray(childrenData) ? childrenData : []);
        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Unable to load billing data."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const receipts = useMemo(() => {
    const yearInvoices = invoices.filter((inv) => {
      const year = inv.issueDate?.slice(0, 4);
      return year === taxYear && inv.status.toUpperCase() === "PAID";
    });

    const byChild: Record<string, FamilyReceipt> = {};
    for (const inv of yearInvoices) {
      if (!byChild[inv.childId]) {
        const child = children.find((c) => c.id === inv.childId);
        byChild[inv.childId] = {
          childId: inv.childId,
          childName: inv.childName || child?.fullName || inv.childId,
          totalFees: 0,
          totalPaid: 0,
          subsidyAmount: 0,
          parentPaid: 0,
          invoiceCount: 0,
        };
      }
      const r = byChild[inv.childId];
      r.totalFees += inv.totalAmount;
      r.totalPaid += inv.paidAmount;
      r.invoiceCount += 1;

      /* estimate subsidy from negative line items */
      const subsidyItems = (inv.items || []).filter((i) => i.amount < 0);
      const subsidy = Math.abs(subsidyItems.reduce((s, i) => s + i.amount, 0));
      r.subsidyAmount += subsidy;
      r.parentPaid += inv.paidAmount;
    }

    return Object.values(byChild).sort((a, b) => a.childName.localeCompare(b.childName));
  }, [invoices, children, taxYear]);

  const grandTotal = useMemo(() => {
    return {
      totalFees: receipts.reduce((s, r) => s + r.totalFees, 0),
      totalPaid: receipts.reduce((s, r) => s + r.totalPaid, 0),
      subsidyAmount: receipts.reduce((s, r) => s + r.subsidyAmount, 0),
    };
  }, [receipts]);

  function printReceipt(childId: string) {
    setSelectedChild(childId);
    setShowPrint(true);
    setTimeout(() => window.print(), 300);
  }

  function printAll() {
    setSelectedChild("");
    setShowPrint(true);
    setTimeout(() => window.print(), 300);
  }

  const selectedReceipt = receipts.find((r) => r.childId === selectedChild);

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <div className="mb-4 print:hidden">
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to billing
          </Link>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
          <PageIntro
            title="Annual Tax Receipts"
            description="Generate childcare tax receipts for CRA Line 21400 (Child Care Expenses). Required for Canada Child Benefit documentation."
          />
          <div className="flex items-center gap-3">
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              {[0, 1, 2, 3].map((offset) => {
                const y = String(new Date().getFullYear() - offset);
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
            <button
              onClick={printAll}
              disabled={receipts.length === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print all receipts
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 print:hidden">
            {error}
          </div>
        ) : null}

        {/* Print-only receipt section */}
        {showPrint ? (
          <div className="hidden print:block">
            {(selectedChild ? [selectedReceipt].filter(Boolean) : receipts).map((receipt) =>
              receipt ? (
                <div key={receipt.childId} className="mb-8 break-inside-avoid rounded-xl border border-slate-200 p-6">
                  <div className="mb-4 border-b border-slate-200 pb-3">
                    <div className="text-xl font-bold text-slate-900">Official Childcare Tax Receipt</div>
                    <div className="mt-1 text-sm text-slate-600">
                      For Canada Revenue Agency (CRA) — Child Care Expenses (Line 21400)
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Childcare Provider
                      </div>
                      <div className="mt-1 font-medium">BrightCare Centre</div>
                      <div className="text-slate-600">Licensed Group Child Care</div>
                      <div className="text-slate-600">British Columbia, Canada</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Tax Year
                      </div>
                      <div className="mt-1 font-medium">{taxYear}</div>
                      <div className="text-slate-600">
                        Date issued: {new Date().toISOString().slice(0, 10)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Child&apos;s Name
                    </div>
                    <div className="mt-1 text-lg font-semibold">{receipt.childName}</div>
                  </div>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex justify-between text-sm">
                      <span>Total childcare fees ({taxYear})</span>
                      <span className="font-semibold">${receipt.totalFees.toFixed(2)}</span>
                    </div>
                    {receipt.subsidyAmount > 0 ? (
                      <div className="mt-1 flex justify-between text-sm">
                        <span>Less: government subsidies (ACCB/CCFRI)</span>
                        <span className="text-blue-700">-${receipt.subsidyAmount.toFixed(2)}</span>
                      </div>
                    ) : null}
                    <div className="mt-2 border-t border-slate-200 pt-2 flex justify-between text-sm">
                      <span className="font-semibold">Total amount paid by parent</span>
                      <span className="font-semibold">${receipt.parentPaid.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>Based on {receipt.invoiceCount} paid invoice{receipt.invoiceCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-slate-500">
                    <p>This receipt is for income tax purposes under the Income Tax Act (Canada).</p>
                    <p className="mt-1">Licensed childcare in British Columbia is GST-exempt under the Excise Tax Act.</p>
                    <p className="mt-1">Retain this receipt for your records. You may claim eligible childcare expenses on Line 21400 of your T1 return.</p>
                  </div>
                </div>
              ) : null
            )}
          </div>
        ) : null}

        {/* Summary stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-3 print:hidden">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Total fees ({taxYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">${grandTotal.totalFees.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Subsidy deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-blue-700">
                ${grandTotal.subsidyAmount.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Families</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{receipts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Receipt list */}
        <Card className="rounded-2xl border-0 shadow-sm print:hidden">
          <CardHeader>
            <CardTitle>Tax receipts — {taxYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : receipts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No paid invoices found for {taxYear}. Tax receipts are generated from paid invoices.
              </div>
            ) : (
              <div className="space-y-2">
                {receipts.map((r) => (
                  <div
                    key={r.childId}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{r.childName}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {r.invoiceCount} invoice{r.invoiceCount !== 1 ? "s" : ""} · Total: $
                        {r.totalFees.toFixed(2)}
                        {r.subsidyAmount > 0
                          ? ` · Subsidy: -$${r.subsidyAmount.toFixed(2)}`
                          : ""}
                        {" "}· Parent paid: ${r.parentPaid.toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={() => printReceipt(r.childId)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Print receipt
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance note */}
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700 print:hidden">
          <strong>Canada Revenue Agency:</strong> Parents may claim childcare expenses on Line 21400 of their T1 return.
          Licensed childcare in BC is GST-exempt. These receipts document fees paid for the selected tax year.
          ACCB/CCFRI subsidy deductions are shown separately per CRA requirements.
        </div>
      </div>
    </RoleGate>
  );
}
