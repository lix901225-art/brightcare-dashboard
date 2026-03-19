"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getRoleHome } from "@/lib/workspace";
import { writeSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/error";
import { writeToken } from "@/lib/token-store";
import { AUTH0_ENABLED } from "@/lib/auth0-provider";

function LoginPageInner() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const { loginWithRedirect, isLoading: auth0Loading } = useAuth0();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => !loading && phone.trim().length > 0 && password.trim().length > 0,
    [loading, phone, password],
  );

  async function handlePhoneLogin() {
    try {
      setLoading(true);
      setError("");

      const res = await apiFetch("/auth/login", {
        skipAuth: true,
        method: "POST",
        body: JSON.stringify({ phone: phone.trim(), password: password.trim() }),
      });

      const raw = await res.json();
      if (!res.ok) throw new Error(raw?.message || raw?.error?.message || `Login failed (${res.status})`);

      // Unwrap envelope: { success, data: { token, ... }, timestamp }
      const data = (raw && typeof raw === "object" && "success" in raw && "data" in raw) ? raw.data : raw;

      if (data.token) writeToken(data.token);

      let tenantName = "";
      try {
        const tRes = await fetch("/api/proxy/tenant/current", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` },
          cache: "no-store",
        });
        const tRaw = await tRes.json();
        const tData = (tRaw && "data" in tRaw) ? tRaw.data : tRaw;
        if (tRes.ok) tenantName = tData?.name || data.tenantId;
      } catch {
        tenantName = data.tenantId;
      }

      writeSession({
        userId: data.userId,
        tenantId: data.tenantId,
        role: data.role,
        displayName: data.displayName || "User",
        tenantName: tenantName || data.tenantId,
      });

      window.location.replace(getRoleHome(data?.role));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  }

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

            <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-950">
              BrightCare OS
            </h1>
            <p className="mt-1 text-center text-sm text-slate-500">
              Childcare management for BC, Canada
            </p>

            {expired && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-700">
                Your session expired. Please sign in again.
              </div>
            )}

            {/* Auth0 */}
            {AUTH0_ENABLED && (
              <button
                onClick={() => loginWithRedirect({ appState: { returnTo: "/dashboard" } })}
                disabled={auth0Loading}
                className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {auth0Loading ? "Loading..." : "Continue with Auth0"}
              </button>
            )}

            {/* Divider */}
            <div className={`relative ${AUTH0_ENABLED ? "my-5" : "mt-8 mb-5"}`}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              {AUTH0_ENABLED && (
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400">or</span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* Phone login form */}
            <form
              onSubmit={(e) => { e.preventDefault(); if (canSubmit) handlePhoneLogin(); }}
              className="space-y-3"
            >
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="username"
                maxLength={20}
                placeholder="Phone number"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                maxLength={128}
                placeholder="Password"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </CardContent>
        </Card>

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
