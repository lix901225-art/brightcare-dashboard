"use client";

import { useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getRoleHome } from "@/lib/workspace";
import { writeSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/error";
import { writeToken } from "@/lib/token-store";
import { AUTH0_ENABLED } from "@/lib/auth0-provider";

type Mode = "login" | "register";

/** Extracted component so useAuth0() is always called (Rules of Hooks). */
function Auth0LoginButton() {
  const { loginWithRedirect, isLoading } = useAuth0();

  return (
    <>
      <button
        onClick={() => loginWithRedirect({ appState: { returnTo: "/dashboard" } })}
        disabled={isLoading}
        className="mb-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isLoading ? "Loading..." : "Continue with Auth0"}
      </button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-slate-400">or sign in with phone</span>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (!phone.trim() || !password.trim()) return false;
    if (mode === "register" && !displayName.trim()) return false;
    return true;
  }, [displayName, loading, mode, password, phone]);

  async function submit() {
    try {
      setLoading(true);
      setError("");

      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? {
              phone: phone.trim(),
              password: password.trim(),
            }
          : {
              phone: phone.trim(),
              password: password.trim(),
              displayName: displayName.trim(),
              tenantName: tenantName.trim() || undefined,
            };

      const res = await apiFetch(path, {
        skipAuth: true,
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || `Auth failed: ${res.status}`);
      }

      let resolvedTenantName = tenantName.trim();

      if (!resolvedTenantName) {
        try {
          const tenantRes = await fetch("/api/proxy/tenant/current", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": data.userId,
              "x-tenant-id": data.tenantId,
            },
            cache: "no-store",
          });

          const tenantData = await tenantRes.json();
          if (tenantRes.ok) {
            resolvedTenantName = tenantData?.name || data.tenantId;
          } else {
            resolvedTenantName = data.tenantId;
          }
        } catch {
          resolvedTenantName = data.tenantId;
        }
      }

      // Track B: store JWT from backend login/register response
      if (data.token) writeToken(data.token);

      writeSession({
        userId: data.userId,
        tenantId: data.tenantId,
        role: data.role,
        displayName: data.displayName || "User",
        tenantName: resolvedTenantName || data.tenantId,
      });

      window.location.replace(getRoleHome(data?.role));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to continue."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="text-3xl font-semibold tracking-tight text-slate-950">
              BrightCare OS
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Sign in to manage your childcare centre.
            </div>
          </div>

          {AUTH0_ENABLED ? <Auth0LoginButton /> : null}

          <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm">
            <button
              onClick={() => setMode("login")}
              className={`rounded-lg px-3 py-2 ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("register")}
              className={`rounded-lg px-3 py-2 ${mode === "register" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              Create account
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) submit();
            }}
            className="space-y-4"
          >
            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete={mode === "login" ? "username" : "tel"}
                maxLength={20}
                placeholder="e.g. 6041234567"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                maxLength={128}
                placeholder="Enter your password"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            {mode === "register" ? (
              <>
                <label className="grid gap-1">
                  <span className="text-sm text-slate-600">Your name</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    placeholder="e.g. Sarah Chen"
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm text-slate-600">Centre name</span>
                  <input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    type="text"
                    maxLength={100}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400"
                    placeholder="Optional — your childcare centre"
                  />
                </label>
              </>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
