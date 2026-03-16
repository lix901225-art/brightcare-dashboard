import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BC Childcare Funding Guide — ACCB, CCFRI & $10-a-Day",
  description:
    "Complete guide to BC childcare subsidies for parents and daycare operators. ACCB eligibility, CCFRI fee reductions, $10-a-day program status, and how to apply.",
  openGraph: {
    title: "BC Childcare Funding Guide — ACCB, CCFRI & $10-a-Day",
    description:
      "Everything BC families and daycare operators need to know about childcare subsidies, fee reductions, and government funding programs.",
    type: "website",
    url: "/bc-funding-guide",
  },
  twitter: {
    card: "summary_large_image",
    title: "BC Childcare Funding Guide",
    description:
      "ACCB, CCFRI, and $10-a-day — complete guide for BC families and childcare providers.",
  },
  robots: { index: true, follow: true },
};

const ACCB_RATES = [
  { age: "Under 19 months", group: "$1,250", family: "$1,000" },
  { age: "19–36 months", group: "$1,060", family: "$1,000" },
  { age: "3 years to kindergarten", group: "$550", family: "$550" },
  { age: "School age (K–12)", group: "$415", family: "$415" },
  { age: "Licensed preschool (29mo+)", group: "$225", family: "—" },
];

const CCFRI_RATES = [
  { category: "Infant/Toddler (under 36 mo)", group: "$900", family: "$600" },
  { category: "3 years to kindergarten", group: "$545", family: "$500" },
  { category: "Kindergarten", group: "$320", family: "$320" },
  { category: "Grade 1 to age 12", group: "$115", family: "$145" },
  { category: "Preschool", group: "$95", family: "—" },
];

export default function BcFundingGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center">
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Updated March 2026
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          BC Childcare Funding Guide
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Everything BC families and daycare operators need to know about
          subsidies, fee reductions, and government funding programs.
        </p>
      </div>

      {/* Quick nav */}
      <nav className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          On this page
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["#accb", "ACCB (Families)"],
            ["#ccfri", "CCFRI (Providers)"],
            ["#ten-a-day", "$10-a-Day Program"],
            ["#stacking", "How Programs Stack"],
            ["#operators", "For Daycare Operators"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* ACCB Section */}
      <section id="accb" className="mt-16 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-950">
            Affordable Child Care Benefit (ACCB)
          </h2>
        </div>
        <p className="mt-2 text-sm font-medium text-emerald-700">
          For families — income-tested monthly subsidy
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">What is ACCB?</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            The Affordable Child Care Benefit is a monthly subsidy paid directly
            to your child care provider, reducing what you pay out of pocket.
            It is income-tested — the lower your family income, the higher the
            benefit. Families earning up to $111,000 per year may qualify.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Maximum monthly benefit
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            For families with adjusted income up to $45,000/year (licensed care):
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Child age</th>
                  <th className="pb-2 pr-4 font-medium">Group care</th>
                  <th className="pb-2 font-medium">Family care</th>
                </tr>
              </thead>
              <tbody>
                {ACCB_RATES.map((row) => (
                  <tr key={row.age} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4 text-slate-700">{row.age}</td>
                    <td className="py-2.5 pr-4 font-semibold text-slate-900">
                      {row.group}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900">
                      {row.family}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Benefits reduce gradually as income increases above $45,000. Families above $111,000 typically do not qualify.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Who qualifies?
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {[
              "BC resident with a current BC address",
              "Canadian citizen, permanent resident, or protected person",
              "Family adjusted income up to $111,000/year",
              "Qualifying reason: working, self-employed, in school, seeking work, or medical condition",
              "All family members must provide Social Insurance Numbers",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
          <h3 className="text-lg font-semibold text-emerald-900">
            How to apply
          </h3>
          <ol className="mt-3 space-y-3 text-sm text-emerald-800">
            {[
              "Create an account on the My Family Services (MyFS) portal",
              "Complete the ACCB application online (can be saved and resumed within 60 days)",
              "Submit the Child Care Arrangement Form (CF2798), signed by you and your provider",
              "Upload documents: photo ID, proof of citizenship, and proof of need (work schedule, school enrollment, medical form CF2914)",
              "Processing takes approximately 10 business days",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <a
              href="https://www.gov.bc.ca/affordablechildcarebenefit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-xl bg-emerald-700 px-5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Apply on gov.bc.ca &rarr;
            </a>
          </div>
          <p className="mt-3 text-xs text-emerald-700">
            You can also apply by phone: 1-888-338-6622 (Option 1) or visit a
            Service BC location.
          </p>
        </div>
      </section>

      {/* CCFRI Section */}
      <section id="ccfri" className="mt-16 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-950">
            Child Care Fee Reduction Initiative (CCFRI)
          </h2>
        </div>
        <p className="mt-2 text-sm font-medium text-sky-700">
          For providers — automatic fee reductions for all families
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">What is CCFRI?</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            CCFRI pays child care providers directly so they can lower fees for
            all families, regardless of income. Parents do not need to apply —
            the savings are automatic if the centre participates. This is
            separate from (and stackable with) the ACCB benefit.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Monthly fee reductions (full-time)
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Care category</th>
                  <th className="pb-2 pr-4 font-medium">Group care</th>
                  <th className="pb-2 font-medium">Family care</th>
                </tr>
              </thead>
              <tbody>
                {CCFRI_RATES.map((row) => (
                  <tr key={row.category} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4 text-slate-700">
                      {row.category}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-slate-900">
                      {row.group}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900">
                      {row.family}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Part-time reductions are pro-rated at 50% for 4 hours or less daily.
            Minimum parent fee: $200/month full-time, $140/month part-time.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-6">
          <h3 className="text-lg font-semibold text-sky-900">
            For parents
          </h3>
          <p className="mt-2 text-sm text-sky-800">
            You do not need to apply for CCFRI. If your provider participates,
            fees are automatically reduced. You can check if your provider
            participates on the BC government website.
          </p>
          <a
            href="https://www.gov.bc.ca/childcare/optin"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-11 items-center rounded-xl bg-sky-700 px-5 text-sm font-medium text-white hover:bg-sky-800"
          >
            Check provider status &rarr;
          </a>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            For providers — how to enroll
          </h3>
          <ol className="mt-3 space-y-2 text-sm text-slate-600">
            {[
              "You must receive Child Care Operating Funding (CCOF) base funding",
              "Opt in through the My ChildCareBC Services portal during your CCOF application or renewal",
              "Participation is optional and you can opt in at any time during the funding term",
              "Do not reduce fees until you receive written approval from the ministry",
              "2026–27 renewals opened in January 2026",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* $10-a-Day */}
      <section id="ten-a-day" className="mt-16 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-950">
            $10-a-Day ChildCareBC
          </h2>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">What is it?</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Designated child care centres where families pay no more than
            $200/month for full-time care. Low-income families who also receive
            ACCB may pay as low as $0 per month.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-6">
          <h3 className="text-lg font-semibold text-amber-900">
            Budget 2026 update
          </h3>
          <p className="mt-2 text-sm text-amber-800 leading-relaxed">
            BC Budget 2026 includes a temporary pause on enrolling new providers
            into the $10-a-Day program and the New Spaces Fund. Families and
            providers already participating are not affected. The province
            allocated $330 million over three years to stabilize existing
            services.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            How to find a $10-a-day centre
          </h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://maps.gov.bc.ca/ess/hm/ccf/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              BC Child Care Map &rarr;
            </a>
            <a
              href="https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children/childcarebc-programs/10-a-day-childcarebc-centres/10-a-day-centres-list"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Centre list by region &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* Stacking */}
      <section id="stacking" className="mt-16 scroll-mt-24">
        <h2 className="text-2xl font-bold text-slate-950">
          How programs stack together
        </h2>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-sm text-slate-600 leading-relaxed">
            CCFRI and ACCB can be combined. Here is a typical example for a
            toddler (19–36 months) in licensed group care:
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-700">Monthly centre fee</span>
              <span className="text-sm font-semibold text-slate-900">$1,200</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-sky-50 p-4">
              <span className="text-sm text-sky-700">CCFRI reduction (automatic)</span>
              <span className="text-sm font-semibold text-sky-700">- $900</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4">
              <span className="text-sm text-emerald-700">ACCB subsidy (income-tested)</span>
              <span className="text-sm font-semibold text-emerald-700">- up to $1,060</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border-2 border-slate-900 bg-slate-900 p-4">
              <span className="text-sm font-medium text-white">
                Parent pays (minimum)
              </span>
              <span className="text-lg font-bold text-white">$0 – $200</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Actual amount depends on family income and care type. Families at
            $10-a-day centres with ACCB may pay $0. The province reports families
            save an average of $7,200/year per child through ChildCareBC programs.
          </p>
        </div>
      </section>

      {/* For Operators */}
      <section id="operators" className="mt-16 scroll-mt-24">
        <h2 className="text-2xl font-bold text-slate-950">
          For daycare operators
        </h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">
              Child Care Operating Funding (CCOF)
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Base operational funding for licensed providers. Required before
              you can access CCFRI or ECE Wage Enhancement.
            </p>
            <a
              href="https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children/childcarebc-programs/child-care-operating-funding"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Learn more &rarr;
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">
              ECE Wage Enhancement
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Up to $6/hour wage enhancement for ECEs at eligible centres.
              Centres must participate in CCFRI or operate as a $10-a-day centre.
            </p>
            <a
              href="https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children/childcarebc-programs/wage-enhancement"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Learn more &rarr;
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">New Spaces Fund</h3>
            <p className="mt-2 text-sm text-slate-600">
              Capital grants for creating new licensed child care spaces.
              Note: new enrollment is temporarily paused under Budget 2026.
            </p>
            <a
              href="https://www.gov.bc.ca/childcare/newspacesfund"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Learn more &rarr;
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">Start-Up Grants</h3>
            <p className="mt-2 text-sm text-slate-600">
              Incentive funding for home-based providers to become licensed,
              covering costs of obtaining a Group Care, Family, or In-Home
              Multi-Age licence.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16">
        <div className="rounded-2xl bg-slate-950 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Manage ACCB and CCFRI with BrightCare OS
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            BrightCare automatically tracks ACCB offsets on parent invoices,
            monitors licensed capacity for compliance, and keeps billing
            transparent for families receiving subsidies.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/demo"
              className="inline-flex h-12 items-center rounded-xl bg-white px-6 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Try the demo — free
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-xl border border-slate-600 px-6 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      {/* Footer disclaimer */}
      <div className="mt-8 text-center text-xs text-slate-400">
        <p>
          Information sourced from{" "}
          <a
            href="https://www.gov.bc.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            gov.bc.ca
          </a>{" "}
          as of March 2026. Rates and eligibility may change — always verify
          with official sources before making financial decisions.
        </p>
        <p className="mt-1">
          Contact the Child Care Service Centre: 1-888-338-6622
        </p>
      </div>
    </div>
  );
}
