"use client";

import { useEffect, useState } from "react";
import { CheckSquare, FileText, MessageCircle } from "lucide-react";
import { readSession } from "@/lib/session";

const ONBOARDING_KEY = "brightcare.staff-onboarding-done";

const STEPS = [
  {
    icon: CheckSquare,
    title: "Attendance",
    description: "Mark children as present, check them in and out. The attendance page is your daily starting point.",
  },
  {
    icon: FileText,
    title: "Daily reports",
    description: "Create daily reports for each child — meals, naps, mood, activities, and photos. Parents see these instantly.",
  },
  {
    icon: MessageCircle,
    title: "Parent messaging",
    description: "Send messages to parents about their child. They'll receive push notifications and can reply from their portal.",
  },
];

export function StaffOnboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const session = readSession();

  useEffect(() => {
    if (session?.role !== "STAFF" && session?.role !== "OWNER") return;
    if (localStorage.getItem(ONBOARDING_KEY)) return;
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
  const roleLabel = session?.role === "OWNER" ? "Administrator" : "Staff Member";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {step === 0 && (
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white">BC</div>
            <h2 className="text-xl font-bold text-slate-900">Welcome to BrightCare!</h2>
            <p className="mt-2 text-sm text-slate-500">
              Hi {session?.displayName || "there"}, you're signed in as <strong>{roleLabel}</strong> at {session?.tenantName || "your centre"}.
            </p>
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{step + 1}. {current.title}</div>
              <div className="mt-1 text-xs text-slate-500">{current.description}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? "bg-slate-900" : "bg-slate-200"}`} />
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          {step < STEPS.length - 1 ? (
            <>
              <button onClick={complete} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-500">Skip</button>
              <button onClick={() => setStep(step + 1)} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white">Next</button>
            </>
          ) : (
            <button onClick={complete} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white">Get Started</button>
          )}
        </div>
      </div>
    </div>
  );
}
