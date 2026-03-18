"use client";

import { useEffect, useState } from "react";
import { FileText, MessageCircle, Receipt, X } from "lucide-react";
import { readSession } from "@/lib/session";

const ONBOARDING_KEY = "brightcare.parent-onboarding-done";

const STEPS = [
  {
    icon: FileText,
    title: "Daily reports",
    description: "View your child's daily activities, meals, naps, and mood in the Daily Reports section.",
    href: "/daily-reports",
  },
  {
    icon: MessageCircle,
    title: "Messages",
    description: "Send and receive messages with your child's teachers in the Messages section.",
    href: "/messages",
  },
  {
    icon: Receipt,
    title: "Billing",
    description: "View invoices, make payments, and track your balance in the Billing section.",
    href: "/parent/billing",
  },
];

export function ParentOnboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const session = readSession();

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY)) return;
    // Small delay to not interfere with page load
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  function complete() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
  }

  if (!show) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {step === 0 && (
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white">BC</div>
            <h2 className="text-xl font-bold text-slate-900">
              Welcome to BrightCare!
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Hi {session?.displayName || "there"}, welcome to {session?.tenantName || "your childcare centre"}.
              Let us show you around.
            </p>
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {step + 1}. {current.title}
              </div>
              <div className="mt-1 text-xs text-slate-500">{current.description}</div>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="mt-4 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? "bg-slate-900" : "bg-slate-200"}`} />
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          {step < STEPS.length - 1 ? (
            <>
              <button onClick={complete} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50">
                Skip
              </button>
              <button onClick={() => setStep(step + 1)} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Next
              </button>
            </>
          ) : (
            <button onClick={complete} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
