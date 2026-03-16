import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with BrightCare OS. Book a personalized demo to see how BrightCare helps licensed BC childcare centres manage enrollment, attendance, billing, and parent communication.",
  openGraph: {
    title: "Contact",
    description: "Book a demo or get in touch with BrightCare OS for your licensed BC childcare centre.",
    type: "website",
    url: "/contact",
  },
  twitter: {
    card: "summary",
    title: "Contact",
    description: "Book a demo or get in touch with BrightCare OS for your licensed BC childcare centre.",
  },
  robots: { index: true, follow: true },
};

const CHECK_ICON = (
  <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function ContactPage() {
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Book a Demo
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            See how BrightCare OS can simplify operations at your childcare
            centre. We&rsquo;ll walk you through the platform and answer your
            questions &mdash; no commitment required.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Primary CTA — Book a Demo */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Request a demo
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Email us to schedule a personalized walkthrough of BrightCare OS.
                We&rsquo;ll show you how enrollment, attendance, billing, and
                parent messaging work together for your centre.
              </p>
              <a
                href="mailto:hello@brightcareos.com?subject=Demo%20Request%20%E2%80%93%20BrightCare%20OS&body=Hi%2C%20I%20operate%20a%20licensed%20childcare%20centre%20in%20BC%20and%20would%20like%20to%20book%20a%20demo."
                className="mt-4 inline-flex h-11 items-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Book a Demo
              </a>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                What to expect
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  {CHECK_ICON}
                  A 20-minute walkthrough tailored to your centre
                </li>
                <li className="flex items-start gap-2">
                  {CHECK_ICON}
                  See real workflows: enrollment, attendance, billing, reports
                </li>
                <li className="flex items-start gap-2">
                  {CHECK_ICON}
                  Ask about ACCB/CCFRI billing support and compliance features
                </li>
                <li className="flex items-start gap-2">
                  {CHECK_ICON}
                  No commitment &mdash; just a conversation
                </li>
              </ul>
            </div>
          </div>

          {/* Contact info + service area */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                General inquiries
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Questions about BrightCare OS, partnerships, or anything else:
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
                We work directly with licensed childcare centres in the Greater
                Vancouver area &mdash; Vancouver, Burnaby, Richmond, Surrey, and
                the Lower Mainland. Expanding across BC soon.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Already a user?
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to your existing BrightCare OS account.
              </p>
              <a
                href="/login"
                className="mt-4 inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
