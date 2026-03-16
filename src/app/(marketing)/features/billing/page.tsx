import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Daycare Billing & ACCB Fee Reduction",
  description:
    "Invoicing with ACCB offset line items, CCFRI tracking, overdue management, and parent-facing balance views for licensed BC childcare centres.",
  openGraph: {
    title: "Daycare Billing & ACCB Fee Reduction",
    description:
      "Billing built for BC childcare — ACCB offsets, CCFRI tracking, and clear parent invoices.",
    type: "website",
    url: "/features/billing",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daycare Billing & ACCB — BrightCare OS",
    description:
      "Billing built for BC childcare — ACCB offsets, CCFRI tracking, and clear parent invoices.",
  },
  robots: { index: true, follow: true },
};

const CAPABILITIES = [
  {
    title: "ACCB offset line items",
    description:
      "Affordable Child Care Benefit reductions appear as dedicated line items on every invoice, so families see exactly how their fees are reduced.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: "CCFRI provider funding tracking",
    description:
      "Child Care Fee Reduction Initiative funding is tracked at the centre level with info banners on billing pages, keeping operators aware of their provincial funding status.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    ),
  },
  {
    title: "Overdue tracking & partial payments",
    description:
      "Outstanding balances are tracked per family with overdue indicators. Record partial payments and see remaining balances update automatically.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    ),
  },
  {
    title: "Parent-facing balance views",
    description:
      "Parents see their current balance, invoice history, and payment records in their portal. No more emailing PDF statements.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create an invoice",
    description:
      "Select the child, add line items for tuition, meals, or extras, and BrightCare automatically adds the ACCB offset if applicable.",
  },
  {
    step: "2",
    title: "Send to parents",
    description:
      "Invoices appear instantly in the parent portal. Families see the full breakdown including any ACCB or CCFRI reductions.",
  },
  {
    step: "3",
    title: "Track payments",
    description:
      "Record full or partial payments. Balances update in real time for both staff and parents, with overdue flags for follow-up.",
  },
];

export default function BillingFeaturePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-slate-50 px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Billing &amp; invoicing
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Billing that understands
            <br />
            <span className="text-emerald-600">ACCB &amp; CCFRI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Create invoices with automatic ACCB fee reduction line items. Track
            CCFRI provider funding. Give parents clear, transparent billing
            through their portal.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex h-12 items-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Try it in the demo
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Billing built for BC provincial programs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-500">
            Most childcare software ignores ACCB and CCFRI entirely. BrightCare
            puts provincial fee reduction front and centre on every invoice.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <svg
                    className="h-5 w-5 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    {cap.icon}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {cap.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            How billing works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-700">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            See billing in action
          </h2>
          <p className="mt-3 text-slate-500">
            Try invoicing with ACCB offsets in our demo &mdash; no sign-up
            required.
          </p>
          <div className="mt-8">
            <Link
              href="/demo"
              className="inline-flex h-12 items-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Try BrightCare free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
