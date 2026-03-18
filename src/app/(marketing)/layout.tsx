import Link from "next/link";
import type { ReactNode } from "react";

const NAV_LINKS = [
  { href: "/features/attendance", label: "Features" },
  { href: "/bc-childcare", label: "BC Childcare" },
  { href: "/bc-funding-guide", label: "Funding Guide" },
  { href: "/contact", label: "Contact" },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "BrightCare OS",
      url: "https://brightcareos.com",
      description:
        "Childcare management software for licensed BC daycare centres and preschools.",
      areaServed: {
        "@type": "Place",
        name: "British Columbia, Canada",
      },
      sameAs: [],
    },
    {
      "@type": "SoftwareApplication",
      name: "BrightCare OS",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "All-in-one childcare management platform: enrollment, attendance, billing with ACCB/CCFRI, parent messaging, daily reports, and licensing compliance.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CAD",
        description: "Early access programme for licensed BC childcare centres",
      },
    },
  ],
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-semibold tracking-tight text-slate-950">
            BrightCare&nbsp;OS
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="mailto:hello@brightcareos.com?subject=Demo%20Request%20%E2%80%93%20BrightCare%20OS&body=Hi%2C%20I%20operate%20a%20licensed%20childcare%20centre%20in%20BC%20and%20would%20like%20to%20book%20a%20demo."
              className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Book a Demo
            </Link>
          </div>

          {/* Mobile menu — details/summary, no JS */}
          <details className="relative md:hidden">
            <summary className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 list-none [&::-webkit-details-marker]:hidden" aria-label="Toggle navigation menu">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>
            <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign in
              </Link>
              <Link
                href="mailto:hello@brightcareos.com?subject=Demo%20Request%20%E2%80%93%20BrightCare%20OS&body=Hi%2C%20I%20operate%20a%20licensed%20childcare%20centre%20in%20BC%20and%20would%20like%20to%20book%20a%20demo."
                className="mt-1 block rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
              >
                Book a Demo
              </Link>
            </div>
          </details>
        </nav>
      </header>

      {/* ── Content ── */}
      <main className="min-h-[calc(100vh-160px)]">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">BrightCare&nbsp;OS</div>
              <p className="mt-2 text-sm text-slate-500">
                All-in-one childcare management software built for licensed BC daycare centres and preschools.
              </p>
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Product</div>
              <div className="space-y-2 text-sm">
                <Link href="/features/attendance" className="block text-slate-600 hover:text-slate-900">Attendance tracking</Link>
                <Link href="/features/billing" className="block text-slate-600 hover:text-slate-900">Billing &amp; ACCB</Link>
                <Link href="/features/parent-communication" className="block text-slate-600 hover:text-slate-900">Parent messaging</Link>
                <Link href="/bc-childcare" className="block text-slate-600 hover:text-slate-900">BC childcare</Link>
                <Link href="/bc-funding-guide" className="block text-slate-600 hover:text-slate-900">Funding guide (ACCB/CCFRI)</Link>
              </div>
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Company</div>
              <div className="space-y-2 text-sm">
                <Link href="/contact" className="block text-slate-600 hover:text-slate-900">Contact</Link>
                <Link href="/privacy" className="block text-slate-600 hover:text-slate-900">Privacy policy</Link>
                <Link href="/contact" className="block text-slate-600 hover:text-slate-900">Book a demo</Link>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} BrightCare OS. Built for licensed BC childcare centres.
          </div>
        </div>
      </footer>
    </>
  );
}
