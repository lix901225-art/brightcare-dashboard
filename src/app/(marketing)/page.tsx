import type { Metadata } from "next";
import React from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BrightCare OS — Childcare Management Software for BC",
  description:
    "All-in-one management platform for licensed BC daycare centres. Enrollment, attendance, billing with ACCB & CCFRI, parent messaging, and compliance.",
  openGraph: {
    title: "BrightCare OS — Childcare Management Software for BC",
    description:
      "Enrollment, attendance, billing, and parent communication for licensed BC childcare centres.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "BrightCare OS — Childcare Management Software for BC",
    description:
      "Enrollment, attendance, billing, and parent communication for licensed BC childcare centres.",
  },
  robots: { index: true, follow: true },
};

const FEATURES = [
  {
    title: "Enrollment pipeline",
    description:
      "Waitlist management with readiness checks, inquiry source tracking (CCRR, BC Child Care Finder), and one-click enrollment with auto-generated registration invoices.",
    href: "/bc-childcare",
    icon: "clipboard",
  },
  {
    title: "Attendance tracking",
    description:
      "Daily roster with batch marking, real-time check-in and check-out timestamps, and room-based views tied to your licensed capacity.",
    href: "/features/attendance",
    icon: "check",
  },
  {
    title: "Billing & ACCB",
    description:
      "Invoice creation with ACCB offset line items, CCFRI fee reduction banners, overdue tracking, partial payments, and parent-facing balance views.",
    href: "/features/billing",
    icon: "dollar",
  },
  {
    title: "Daily reports",
    description:
      "Per-child daily logs for meals, naps, mood, and activities. Parents see reports instantly in their portal with no app download required.",
    href: "/features/parent-communication",
    icon: "sun",
  },
  {
    title: "Parent portal",
    description:
      "Dedicated parent view with attendance history, billing statements, incident reports, and threaded messaging — all accessible via phone browser.",
    href: "/features/parent-communication",
    icon: "users",
  },
  {
    title: "Licensing compliance",
    description:
      "Room-level licensed capacity tracking, utilization dashboards, over-capacity warnings, and audit logs for every operational action.",
    href: "/bc-childcare",
    icon: "shield",
  },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  clipboard: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  dollar: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  sun: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />,
  users: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  shield: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
};

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-white to-slate-50 px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Built for licensed BC centres
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Childcare management,
            <br />
            <span className="text-emerald-600">simplified for BC</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            BrightCare OS is the all-in-one platform built specifically for licensed BC daycare
            centres and preschools. Track enrollment, attendance, and billing &mdash; with built-in
            support for ACCB fee reduction, CCFRI provider funding, and licensed capacity compliance.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="mailto:hello@brightcareos.com?subject=Demo%20Request%20%E2%80%93%20BrightCare%20OS&body=Hi%2C%20I%20operate%20a%20licensed%20childcare%20centre%20in%20BC%20and%20would%20like%20to%20book%20a%20demo."
              className="inline-flex h-12 items-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Book a Demo
            </Link>
            <Link
              href="/features/attendance"
              className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              See features
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Everything your centre needs, in one place
            </h2>
            <p className="mt-3 text-slate-500">
              Purpose-built for the daily operations of licensed childcare in British Columbia.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat) => (
              <Link
                key={feat.title}
                href={feat.href}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    {ICON_MAP[feat.icon]}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-900 group-hover:text-emerald-700">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feat.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── BC-specific value prop ── */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Designed for licensed BC childcare centres
          </h2>
          <p className="mt-4 text-slate-600">
            BrightCare OS isn&rsquo;t generic SaaS adapted for childcare. It&rsquo;s built from the
            ground up for the way BC centres actually operate &mdash; with the provincial programs,
            licensing rules, and family communication workflows that matter to you.
          </p>
          <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
            {[
              ["ACCB integration", "Affordable Child Care Benefit offset line items appear directly on invoices, so families see their reduced fees clearly."],
              ["CCFRI fee reduction", "Child Care Fee Reduction Initiative provider funding is tracked at the centre level, with info banners on billing pages."],
              ["Licensed capacity tracking", "Room-level capacity dashboards with utilization percentages and over-capacity warnings to stay compliant."],
              ["CCRR referral tracking", "Track inquiry sources including CCRR referrals, BC Child Care Finder, and community referrals in your enrollment pipeline."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/bc-childcare"
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Learn more about BC features
            </Link>
            <Link
              href="/bc-funding-guide"
              className="inline-flex h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              ACCB &amp; CCFRI funding guide
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust signals ── */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            ["Privacy-first", "Child data stays in Canada. No third-party sharing, no ads. Read our privacy policy."],
            ["BC-compliant", "Built around BC licensing requirements, provincial funding programs, and Ministry reporting needs."],
            ["Early access program", "We work directly with licensed BC centres to onboard and customize BrightCare OS. Request a walkthrough to get started."],
          ].map(([title, desc]) => (
            <div key={title} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="bg-slate-900 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to simplify your centre?
          </h2>
          <p className="mt-3 text-slate-400">
            See how BrightCare OS works for your centre. We&rsquo;ll walk you through a live demo.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="mailto:hello@brightcareos.com?subject=Demo%20Request%20%E2%80%93%20BrightCare%20OS&body=Hi%2C%20I%20operate%20a%20licensed%20childcare%20centre%20in%20BC%20and%20would%20like%20to%20book%20a%20demo."
              className="inline-flex h-12 items-center rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Book a Demo
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
