import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with BrightCare OS. Request a demo, ask about our free pilot program, or learn how BrightCare can help your licensed BC childcare centre.",
  openGraph: {
    title: "Contact",
    description: "Get in touch with BrightCare OS for your licensed BC childcare centre.",
    type: "website",
    url: "/contact",
  },
  twitter: {
    card: "summary",
    title: "Contact",
    description: "Get in touch with BrightCare OS for your licensed BC childcare centre.",
  },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Get in touch
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Questions about BrightCare OS? Want to see a personalized demo for
            your centre? We&rsquo;d love to hear from you.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Contact info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Email us
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                For general inquiries, demo requests, or pilot program questions:
              </p>
              <a
                href="mailto:hello@brightcareos.com"
                className="mt-3 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                hello@brightcareos.com
              </a>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Privacy &amp; data requests
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                For data access, correction, or deletion requests:
              </p>
              <a
                href="mailto:privacy@brightcareos.com"
                className="mt-3 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                privacy@brightcareos.com
              </a>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Service area
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Our free pilot program is currently focused on licensed childcare
                centres in the Greater Vancouver area — Vancouver, Burnaby,
                Richmond, Surrey, and the Lower Mainland. Expanding across BC
                soon.
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Try the demo
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                See BrightCare OS in action with sample data. No sign-up, no
                credit card, no commitment.
              </p>
              <Link
                href="/demo"
                className="mt-4 inline-flex h-11 items-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Try the demo &mdash; free
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Free pilot program
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                We&rsquo;re offering BrightCare OS at no cost during our pilot
                phase. If you operate a licensed childcare centre in the Greater
                Vancouver area, email us to join.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-500">
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  No credit card required
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Set up in under 30 minutes
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  No long-term commitment
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Already a user?
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to your existing BrightCare OS account.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
