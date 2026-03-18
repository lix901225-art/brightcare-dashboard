import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — Childcare Software Plans for BC Centres",
  description: "BrightCare OS pricing plans for BC childcare centres. Free Starter, Professional at $149/mo, and Enterprise options with ACCB, CCFRI, and compliance built in.",
  alternates: { canonical: "https://brightcareos.com/pricing" },
  openGraph: {
    title: "BrightCare OS Pricing — Plans for BC Childcare Centres",
    description: "Free Starter plan, Professional at $149/mo, Enterprise custom pricing. All plans include parent portal, attendance, and daily reports.",
    type: "website",
    url: "/pricing",
  },
};

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for trying BrightCare with a single centre.",
    features: [
      "1 centre",
      "Up to 30 children",
      "Core modules (attendance, messaging, daily reports)",
      "Parent portal",
      "Mobile app access",
    ],
    cta: "Start Free",
    href: "https://app.brightcareos.com/login",
    highlight: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "Full-featured for licensed BC childcare centres.",
    features: [
      "Unlimited children",
      "All modules (billing, compliance, analytics, records)",
      "BC funding reports (CCFRI, ACCB, $10/Day)",
      "VCH incident PDF export",
      "Staff scheduling",
      "Learning Stories & milestones",
      "Automated monthly billing",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "https://app.brightcareos.com/login",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Multi-location with dedicated support.",
    features: [
      "Multiple centres",
      "Custom integrations",
      "Dedicated account manager",
      "On-site training",
      "SLA guarantee",
      "Custom reporting",
    ],
    cta: "Contact Us",
    href: "/contact",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Built for BC licensed childcare centres. Currently in <strong>free pilot</strong> — all features included.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={[
                "rounded-2xl border p-8",
                plan.highlight
                  ? "border-slate-900 bg-slate-950 text-white shadow-xl ring-1 ring-slate-900"
                  : "border-slate-200 bg-white",
              ].join(" ")}
            >
              <h3 className={["text-lg font-semibold", plan.highlight ? "text-white" : "text-slate-900"].join(" ")}>
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className={["text-4xl font-bold", plan.highlight ? "text-white" : "text-slate-900"].join(" ")}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className={plan.highlight ? "text-slate-400" : "text-slate-500"}>{plan.period}</span>
                )}
              </div>
              <p className={["mt-3 text-sm", plan.highlight ? "text-slate-300" : "text-slate-600"].join(" ")}>
                {plan.description}
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className={plan.highlight ? "text-emerald-400" : "text-emerald-600"}>✓</span>
                    <span className={plan.highlight ? "text-slate-300" : "text-slate-700"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={[
                  "mt-8 flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition",
                  plan.highlight
                    ? "bg-white text-slate-900 hover:bg-slate-100"
                    : "bg-slate-900 text-white hover:bg-slate-800",
                ].join(" ")}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <h3 className="text-lg font-semibold text-emerald-900">Currently in free pilot</h3>
          <p className="mt-2 text-sm text-emerald-700">
            All BrightCare features are available at no cost during our pilot programme.
            Sign up now and get full access to Professional features.
          </p>
          <Link
            href="https://app.brightcareos.com/login"
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Start free pilot
          </Link>
        </div>
      </div>
    </div>
  );
}
