"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getRoleHome } from "@/lib/workspace";
import { writeSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/error";

type Mode = "login" | "register";

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
              Sign in to manage your childcare center.
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm">
            <button
              onClick={() => setMode("login")}
              className={`rounded-lg px-3 py-2 ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              Login
            </button>
            <button
              onClick={() => setMode("register")}
              className={`rounded-lg px-3 py-2 ${mode === "register" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              Register
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-4">
            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Enter your password"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            {mode === "register" ? (
              <>
                <label className="grid gap-1">
                  <span className="text-sm text-slate-600">Display name</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 px-3 outline-none"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm text-slate-600">Tenant name</span>
                  <input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 px-3 outline-none"
                    placeholder="Optional organization name"
                  />
                </label>
              </>
            ) : null}

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
