"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { Card, CardContent } from "@/components/ui/card";
import { AUTH0_ENABLED } from "@/lib/auth0-provider";

function LoginPageInner() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const { loginWithRedirect, isLoading } = useAuth0();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-8">
            {/* Logo */}
            <div className="mb-2 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900">
                <span className="text-xl font-bold text-white">BC</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-950">
              BrightCare OS
            </h1>
            <p className="mt-1 text-center text-sm text-slate-500">
              Childcare management for BC, Canada
            </p>

            {/* Session expired notice */}
            {expired && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-700">
                Your session expired. Please sign in again.
              </div>
            )}

            {/* Auth0 button */}
            <button
              onClick={() =>
                loginWithRedirect({ appState: { returnTo: "/dashboard" } })
              }
              disabled={isLoading || !AUTH0_ENABLED}
              className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Continue with Auth0"}
            </button>

            {!AUTH0_ENABLED && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Auth0 is not configured. Set NEXT_PUBLIC_AUTH0_DOMAIN and
                NEXT_PUBLIC_AUTH0_CLIENT_ID to enable.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; 2026 BrightCare OS. All rights reserved.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
