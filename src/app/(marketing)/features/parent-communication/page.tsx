import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Parent Messaging & Daily Reports",
  description:
    "Threaded messaging, per-child daily reports, and a parent portal accessible via phone browser — no app download required.",
  openGraph: {
    title: "Parent Messaging & Daily Reports",
    description:
      "Keep parents connected with daily reports and real-time messaging.",
    type: "website",
    url: "/features/parent-communication",
  },
  twitter: {
    card: "summary_large_image",
    title: "Parent Messaging & Daily Reports",
    description:
      "Keep parents connected with daily reports and real-time messaging.",
  },
  robots: { index: true, follow: true },
};

const CAPABILITIES = [
  {
    title: "Per-child daily reports",
    description:
      "Staff log meals, nap count, mood, and activities for each child. Reports are saved and instantly visible in the parent portal.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    ),
  },
  {
    title: "Threaded messaging",
    description:
      "Staff and parents communicate through organized message threads. No more lost texts or Facebook messages — everything stays in one place.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    ),
  },
  {
    title: "Dedicated parent portal",
    description:
      "Parents access attendance history, billing statements, daily reports, and messages through a clean mobile-friendly portal — no app download required.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    ),
  },
  {
    title: "Incident reporting",
    description:
      "Document safety incidents with severity levels, descriptions, and timestamps. Parents are notified through the portal with full incident details.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    ),
  },
];

const STEPS = [
  {
    step: "1",
    title: "Staff log the day",
    description:
      "At the end of each session, staff fill in a quick daily report for each child — meals, naps, mood, and activities.",
  },
  {
    step: "2",
    title: "Parents see it instantly",
    description:
      "Reports appear in the parent portal within seconds. Parents open their phone browser and see exactly how their child's day went.",
  },
  {
    step: "3",
    title: "Follow up via messaging",
    description:
      "If parents have questions, they message directly through the portal. Staff respond in organized threads — no personal phone numbers needed.",
  },
];

export default function ParentCommunicationFeaturePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-slate-50 px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Parent communication
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Parents stay connected,
            <br />
            <span className="text-emerald-600">without the app fatigue</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Daily reports, threaded messaging, and a full parent portal — all
            accessible through a phone browser. No app download, no login
            friction.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="mailto:hello@brightcareos.com?subject=Demo%20Request%20%E2%80%93%20BrightCare%20OS&body=Hi%2C%20I%20operate%20a%20licensed%20childcare%20centre%20in%20BC%20and%20would%20like%20to%20book%20a%20demo."
              className="inline-flex h-12 items-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Book a Demo
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
            Everything parents need, in one portal
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-500">
            Replace scattered texts, paper notes, and Facebook messages with a
            single parent portal that works on any phone.
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
            How parent communication works
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
            See the parent experience
          </h2>
          <p className="mt-3 text-slate-500">
            Book a walkthrough and see how daily reports and parent messaging
            work for your centre.
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
