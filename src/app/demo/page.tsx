"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { writeSession } from "@/lib/session";

export default function DemoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function autoLogin() {
      try {
        const res = await fetch("/api/proxy/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: "demo", password: "demo" }),
        });

        if (cancelled) return;

        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setErrorMsg(data?.message || "Demo login failed. Please try again.");
          return;
        }

        writeSession({
          userId: data.userId || data.id,
          tenantId: data.tenantId,
          role: data.role,
          displayName: data.name || data.displayName || "Demo User",
          tenantName: data.tenantName || "Demo Centre",
        });

        router.replace("/dashboard");
      } catch {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg("Unable to connect. Please try again in a moment.");
      }
    }

    autoLogin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        {status === "loading" ? (
          <>
            <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <h1 className="text-lg font-semibold text-slate-900">
              Setting up your demo&hellip;
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Logging you into a sample childcare centre with demo data.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <svg
                className="h-6 w-6 text-rose-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">
              Demo unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-500">{errorMsg}</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  setStatus("loading");
                  setErrorMsg("");
                  window.location.reload();
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Try again
              </button>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Sign in with your account
              </Link>
              <Link
                href="/"
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                &larr; Back to homepage
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
