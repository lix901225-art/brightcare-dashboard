import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "BrightCare OS privacy policy. Learn how we handle child data, parent information, and centre records. Data stays in Canada — no third-party sharing, no ads.",
  openGraph: {
    title: "Privacy Policy",
    description: "How BrightCare OS protects your data. Canadian data residency, no third-party sharing.",
    type: "website",
    url: "/privacy",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy",
    description: "How BrightCare OS protects your data. Canadian data residency, no third-party sharing.",
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Last updated: March 15, 2026
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-slate-700">
          {/* Overview */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
            <p className="mt-3">
              BrightCare OS (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) provides childcare management
              software for licensed daycare centres and preschools in British
              Columbia. We take the privacy of children, families, and childcare
              operators seriously. This policy explains what data we collect, how
              we use it, and how we protect it.
            </p>
          </section>

          {/* What we collect */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              What data we collect
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Child records:</strong> Name, date of birth, room
                assignment, enrollment status, attendance records, daily reports
                (meals, naps, mood, activities), and incident reports.
              </li>
              <li>
                <strong>Guardian information:</strong> Parent/guardian names,
                phone numbers, email addresses, and relationship to enrolled
                children.
              </li>
              <li>
                <strong>Billing records:</strong> Invoice line items, payment
                records, account balances, and ACCB offset amounts.
              </li>
              <li>
                <strong>Centre information:</strong> Centre name, address,
                licensed room configurations, capacity limits, and staff
                records.
              </li>
              <li>
                <strong>Usage data:</strong> Login timestamps, feature usage
                patterns, and browser type for improving the product.
              </li>
            </ul>
          </section>

          {/* How we use data */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              How we use your data
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                To provide the BrightCare OS service: attendance tracking,
                billing, daily reports, messaging, and enrollment management.
              </li>
              <li>
                To display relevant information to authorized users (staff see
                operational data; parents see their own children&rsquo;s data
                only).
              </li>
              <li>
                To generate audit logs for licensing compliance and
                accountability.
              </li>
              <li>To improve the product based on anonymized usage patterns.</li>
            </ul>
          </section>

          {/* Data storage */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Data storage &amp; security
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Canadian data residency:</strong> All data is stored on
                servers located in Canada.
              </li>
              <li>
                <strong>Encryption:</strong> Data is encrypted in transit
                (TLS/HTTPS) and at rest.
              </li>
              <li>
                <strong>Access control:</strong> Role-based access ensures staff
                see operational data, parents see only their children&rsquo;s
                information, and owners have full centre visibility.
              </li>
              <li>
                <strong>Audit logging:</strong> All data access and modifications
                are logged with timestamps and actor identity.
              </li>
            </ul>
          </section>

          {/* What we don't do */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              What we do not do
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>We do not sell, rent, or share your data with third parties.</li>
              <li>We do not display advertising of any kind.</li>
              <li>
                We do not use child data for marketing, profiling, or any
                purpose beyond providing the BrightCare OS service.
              </li>
              <li>
                We do not share data with government agencies unless required by
                law or with your explicit consent.
              </li>
            </ul>
          </section>

          {/* Data requests */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Your rights &amp; data requests
            </h2>
            <p className="mt-3">
              You have the right to request access to, correction of, or
              deletion of your personal data and your children&rsquo;s data at
              any time. Centre operators can export all data associated with
              their centre.
            </p>
            <p className="mt-3">
              To make a data request, contact us at{" "}
              <a
                href="mailto:privacy@brightcareos.com"
                className="font-medium text-emerald-700 hover:text-emerald-800"
              >
                privacy@brightcareos.com
              </a>
              .
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
            <p className="mt-3">
              If you have questions about this privacy policy or how we handle
              your data, please contact us:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Email:{" "}
                <a
                  href="mailto:privacy@brightcareos.com"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  privacy@brightcareos.com
                </a>
              </li>
              <li>
                Or visit our{" "}
                <Link
                  href="/contact"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  contact page
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
