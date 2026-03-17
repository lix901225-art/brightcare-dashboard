"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Save, Lock } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { patchSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/error";

type MeResponse = {
  id: string;
  userId: string;
  tenantId: string;
  displayName: string | null;
  phone: string | null;
  roles?: string[];
  role?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type TenantResponse = {
  id: string;
  name: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [me, setMe] = useState<MeResponse | null>(null);
  const [tenant, setTenant] = useState<TenantResponse | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [tenantName, setTenantName] = useState("");

  async function loadAll(showRefreshState = false) {
    if (showRefreshState) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [meRes, tenantRes] = await Promise.all([
        apiFetch("/me"),
        apiFetch("/tenant/current"),
      ]);

      const meData = await meRes.json();
      const tenantData = await tenantRes.json();

      if (!meRes.ok) throw new Error(meData?.message || `GET /me failed (${meRes.status})`);
      if (!tenantRes.ok) throw new Error(tenantData?.message || `GET /tenant/current failed (${tenantRes.status})`);

      setMe(meData);
      setTenant(tenantData);
      setDisplayName(meData?.displayName || "");
      setTenantName(tenantData?.name || "");

      patchSession({
        displayName: meData?.displayName || "User",
        tenantName: tenantData?.name || tenantData?.id || "Workspace",
        role: meData?.role || "OWNER",
      });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load settings."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveProfile() {
    try {
      setSavingProfile(true);
      setError("");
      setOk("");

      const trimmed = displayName.trim();
      if (!trimmed) throw new Error("Display name is required.");

      const res = await apiFetch("/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `PATCH /me failed (${res.status})`);

      patchSession({ displayName: data?.displayName || trimmed });

      setOk("Owner profile updated.");
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update owner profile."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveTenant() {
    try {
      setSavingTenant(true);
      setError("");
      setOk("");

      const trimmed = tenantName.trim();
      if (!trimmed) throw new Error("Centre name is required.");

      const res = await apiFetch("/tenant/current", {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `PATCH /tenant/current failed (${res.status})`);

      patchSession({ tenantName: data?.name || trimmed });

      setOk("Centre settings updated.");
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update centre settings."));
    } finally {
      setSavingTenant(false);
    }
  }

  async function changePassword() {
    try {
      setSavingPassword(true);
      setError("");
      setOk("");

      if (!currentPassword.trim()) throw new Error("Current password is required.");
      if (newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");

      const res = await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Password change failed (${res.status})`);

      setOk("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to change password."));
    } finally {
      setSavingPassword(false);
    }
  }

  const canChangePassword =
    currentPassword.trim().length > 0 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    !savingPassword;

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <PageIntro
          title="Settings"
          description="Manage your profile and centre settings."
        />

        {ok ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div> : null}
        {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

        <div className="mb-4 flex justify-end">
          <button
            onClick={() => loadAll(true)}
            disabled={loading || refreshing}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card className={["rounded-2xl shadow-sm", section === "profile" ? "border border-amber-300 bg-amber-50/40" : "border-0"].join(" ")}>
            <CardHeader><CardTitle>Owner profile</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-slate-500">Loading owner profile...</div>
              ) : (
                <div className="space-y-4">
                  <label className="grid gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Display name</span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      placeholder="Owner display name"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</span>
                    <input value={me?.phone || ""} disabled className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none" />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Role</span>
                    <input value={me?.role || ""} disabled className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none" />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">User ID</span>
                    <input value={me?.userId || ""} disabled className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none" />
                  </label>

                  <button
                    onClick={saveProfile}
                    disabled={savingProfile || !displayName.trim()}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={["rounded-2xl shadow-sm", section === "tenant" ? "border border-amber-300 bg-amber-50/40" : "border-0"].join(" ")}>
            <CardHeader><CardTitle>Centre settings</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-slate-500">Loading centre settings...</div>
              ) : (
                <div className="space-y-4">
                  <label className="grid gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Centre ID</span>
                    <input value={tenant?.id || ""} disabled className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none" />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Centre name</span>
                    <input
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      placeholder="e.g. Sunshine Kids Daycare"
                    />
                  </label>

                  <button
                    onClick={saveTenant}
                    disabled={savingTenant || !tenantName.trim()}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingTenant ? "Saving..." : "Save centre settings"}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className={["rounded-2xl shadow-sm", section === "password" ? "border border-amber-300 bg-amber-50/40" : "border-0"].join(" ")}>
            <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Current password</span>
                  <input
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    maxLength={128}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Enter current password"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">New password</span>
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="At least 6 characters"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Confirm new password</span>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Re-enter new password"
                  />
                  {confirmPassword && newPassword !== confirmPassword ? (
                    <span className="text-xs text-rose-500">Passwords do not match</span>
                  ) : null}
                </label>

                <button
                  onClick={changePassword}
                  disabled={!canChangePassword}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  {savingPassword ? "Changing..." : "Change password"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGate>
  );
}
