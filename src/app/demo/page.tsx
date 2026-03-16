"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { writeSession } from "@/lib/session";

const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_ENABLED === "true";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

export default function DemoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "disabled" | "error">(
    DEMO_ENABLED ? "loading" : "disabled",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const retriesRef = useRef(0);
  const cancelledRef = useRef(false);

  const attemptLogin = useCallback(async () => {
    if (!DEMO_ENABLED) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch("/api/proxy/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "demo", password: "demo" }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (cancelledRef.current) return;

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Demo login failed.");
      }

      writeSession({
        userId: data.userId || data.id,
        tenantId: data.tenantId,
        role: data.role,
        displayName: data.name || data.displayName || "Demo User",
        tenantName: data.tenantName || "Demo Centre",
      });

      router.replace("/dashboard");
    } catch (err) {
      if (cancelledRef.current) return;

      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        if (!cancelledRef.current) {
          await attemptLogin();
        }
        return;
      }

      setStatus("error");
      setErrorMsg(
        err instanceof DOMException && err.name === "AbortError"
          ? "Connection timed out. The demo server may be starting up."
          : err instanceof Error
            ? err.message
            : "Unable to connect. Please try again in a moment.",
      );
    }
  }, [router]);

  useEffect(() => {
    if (!DEMO_ENABLED) return;

    cancelledRef.current = false;
    retriesRef.current = 0;
    void attemptLogin();

    return () => {
      cancelledRef.current = true;
    };
  }, [attemptLogin]);

  const handleRetry = () => {
    retriesRef.current = 0;
    setStatus("loading");
    setErrorMsg("");
    void attemptLogin();
  };

  if (status === "disabled") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            Demo not available
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            The demo environment is not enabled. Please sign in with your
            account.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Sign in
            </Link>
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              &larr; Back to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
                aria-hidden="true"
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
                onClick={handleRetry}
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
