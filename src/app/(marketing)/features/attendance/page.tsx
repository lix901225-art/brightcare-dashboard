import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Childcare Attendance Tracking Software — BrightCare OS",
  description:
    "Check-in/out tracking for licensed BC daycare centres. Room-based rosters, batch marking, capacity monitoring, and parent-visible history.",
  openGraph: {
    title: "Childcare Attendance Tracking Software — BrightCare OS",
    description:
      "Real-time attendance tracking built for licensed BC childcare centres.",
    type: "website",
    url: "/features/attendance",
  },
  twitter: {
    card: "summary_large_image",
    title: "Childcare Attendance Tracking — BrightCare OS",
    description:
      "Real-time attendance tracking built for licensed BC childcare centres.",
  },
  robots: { index: true, follow: true },
};

const CAPABILITIES = [
  {
    title: "Daily roster with batch marking",
    description:
      "Mark entire rooms present, absent, or not-yet-arrived in one click. Staff save minutes every morning during drop-off rush.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
  },
  {
    title: "Real-time check-in & check-out",
    description:
      "Timestamped check-in and check-out with automatic status transitions. Parents see live attendance status in their portal.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: "Room-based capacity views",
    description:
      "See attendance organized by licensed room. Each room shows current headcount vs. licensed capacity with utilization percentage.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  },
  {
    title: "Parent attendance history",
    description:
      "Parents view a weekly attendance grid for each child with check-in/out times, present/absent indicators, and week-by-week navigation.",
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
    title: "Open the daily roster",
    description:
      "Select the date and room. BrightCare shows every enrolled child with their current attendance status.",
  },
  {
    step: "2",
    title: "Mark attendance",
    description:
      "Use batch marking for the whole room, or tap individual children to record check-in times as families arrive.",
  },
  {
    step: "3",
    title: "Parents see it instantly",
    description:
      "Check-in and check-out times appear in each parent's portal automatically. No separate notification step needed.",
  },
];

export default function AttendanceFeaturePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-slate-50 px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Attendance tracking
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Know who&rsquo;s in every room,
            <br />
            <span className="text-emerald-600">every minute</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Real-time check-in and check-out tracking tied to your licensed room
            capacity. Staff mark attendance in seconds. Parents see status
            instantly.
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
            Built for the way BC centres track attendance
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-500">
            Not a generic sign-in sheet. BrightCare attendance is designed around
            licensed rooms, provincial capacity rules, and the real drop-off/pick-up
            workflow.
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
            How attendance works
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
            See attendance tracking in action
          </h2>
          <p className="mt-3 text-slate-500">
            Try the full attendance workflow in our demo &mdash; no sign-up required.
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
