import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "BC Childcare Software — Vancouver Daycare Management | BrightCare OS",
  description:
    "Childcare management software built specifically for licensed BC daycare centres and preschools. ACCB fee reduction, CCFRI tracking, licensed capacity compliance, and CCRR referral source tracking.",
  openGraph: {
    title: "BC Childcare Software — Vancouver Daycare Management | BrightCare OS",
    description:
      "Built specifically for licensed BC daycare centres — ACCB, CCFRI, capacity compliance, and more.",
    type: "website",
    url: "/bc-childcare",
  },
  robots: { index: true, follow: true },
};

const BC_FEATURES = [
  {
    title: "ACCB fee reduction on invoices",
    description:
      "Affordable Child Care Benefit reductions appear as dedicated line items on every parent invoice. Families see exactly how their fees are reduced, and operators track ACCB amounts across all enrolled children.",
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
      "Child Care Fee Reduction Initiative funding is tracked at the centre level. Info banners on billing pages keep operators aware of their CCFRI status, and fee caps are reflected in invoice generation.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    ),
  },
  {
    title: "Licensed capacity compliance",
    description:
      "Room-level capacity dashboards show current enrollment vs. licensed capacity with utilization percentages. Over-capacity warnings trigger before you exceed your licensed limits, helping you stay compliant with BC licensing requirements.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  },
  {
    title: "CCRR referral source tracking",
    description:
      "Track how families find your centre — CCRR referrals, BC Child Care Finder listings, community referrals, word of mouth, and direct inquiries. Understand which channels drive enrollment in your area.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    title: "Audit trail for licensing visits",
    description:
      "Every operational action — attendance marks, invoice changes, incident reports, enrollment status updates — is logged with timestamps and actor identity. Pull audit logs during licensing visits with confidence.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    ),
  },
  {
    title: "Canadian data residency",
    description:
      "Child data stays in Canada. No third-party sharing, no advertising, no data monetization. Built with the privacy expectations of Canadian families and BC licensing requirements in mind.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
];

export default function BCChildcarePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-slate-50 px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Built for British Columbia
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            The childcare platform that
            <br />
            <span className="text-emerald-600">speaks BC</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            BrightCare OS isn&rsquo;t generic SaaS adapted for childcare.
            It&rsquo;s built from the ground up for the way licensed BC daycare
            centres and preschools actually operate &mdash; with the provincial
            programs, licensing rules, and family communication workflows you
            already deal with every day.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex h-12 items-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Try the demo &mdash; free
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      {/* BC features grid */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Provincial programs, built in &mdash; not bolted on
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-500">
            Every feature is designed around BC licensing requirements,
            provincial funding programs, and the operational reality of running a
            centre in the Lower Mainland and beyond.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BC_FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <svg
                    className="h-5 w-5 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    {feat.icon}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Who BrightCare OS is for
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              [
                "Licensed group daycare centres",
                "Multi-room centres with 25+ children who need room-level capacity tracking, batch attendance, and organized billing.",
              ],
              [
                "Licensed preschool programs",
                "Half-day and full-day preschool programs that need attendance records, daily reports, and parent communication.",
              ],
              [
                "Multi-site operators",
                "Operators managing multiple licensed locations who need consistent processes and centralized visibility across centres.",
              ],
              [
                "New centres preparing for licensing",
                "Centres in the licensing process who want to start with compliant workflows from day one — capacity tracking, audit trails, and proper record-keeping.",
              ],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {title}
                </div>
                <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service area */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Currently serving the Greater Vancouver area
          </h2>
          <p className="mt-4 text-slate-600">
            Our free pilot program is focused on licensed childcare centres in
            Vancouver, Burnaby, Richmond, Surrey, and the Lower Mainland.
            We&rsquo;re expanding across BC &mdash; get in touch if
            you&rsquo;re outside the Lower Mainland.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex h-12 items-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Try BrightCare free
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
