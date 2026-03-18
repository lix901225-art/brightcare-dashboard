"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Globe, RefreshCw, Save, Lock } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { patchSession, readSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/error";
import { getLocale, setLocale, LOCALE_LABELS, type Locale } from "@/lib/i18n";

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
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  capacity?: number | null;
  licenceNumber?: string | null;
  healthAuthority?: string | null;
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

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [savingNotifs, setSavingNotifs] = useState(false);

  const isOwner = readSession()?.role === "OWNER";
  const isParent = readSession()?.role === "PARENT";

  const [me, setMe] = useState<MeResponse | null>(null);
  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [locale, setLocaleState] = useState<Locale>("en");

  const [displayName, setDisplayName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantAddress, setTenantAddress] = useState("");
  const [tenantCity, setTenantCity] = useState("");
  const [tenantProvince, setTenantProvince] = useState("BC");
  const [tenantPostalCode, setTenantPostalCode] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantOpenTime, setTenantOpenTime] = useState("07:30");
  const [tenantCloseTime, setTenantCloseTime] = useState("17:30");
  const [tenantCapacity, setTenantCapacity] = useState("");
  const [tenantLicenceNumber, setTenantLicenceNumber] = useState("");
  const [tenantHealthAuthority, setTenantHealthAuthority] = useState("");
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState("");
  const [defaultCcfriAmount, setDefaultCcfriAmount] = useState("");
  const [defaultAccbAmount, setDefaultAccbAmount] = useState("");

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
      setTenantAddress(tenantData?.address || "");
      setTenantCity(tenantData?.city || "");
      setTenantProvince(tenantData?.province || "BC");
      setTenantPostalCode(tenantData?.postalCode || "");
      setTenantPhone(tenantData?.phone || "");
      setTenantEmail(tenantData?.email || "");
      setTenantOpenTime(tenantData?.openTime || "07:30");
      setTenantCloseTime(tenantData?.closeTime || "17:30");
      setTenantCapacity(tenantData?.capacity != null ? String(tenantData.capacity) : "");
      setTenantLicenceNumber(tenantData?.licenceNumber || "");
      setTenantHealthAuthority(tenantData?.healthAuthority || "");
      setDefaultMonthlyFee(tenantData?.defaultMonthlyFee != null ? String(tenantData.defaultMonthlyFee) : "");
      setDefaultCcfriAmount(tenantData?.defaultCcfriAmount != null ? String(tenantData.defaultCcfriAmount) : "");
      setDefaultAccbAmount(tenantData?.defaultAccbAmount != null ? String(tenantData.defaultAccbAmount) : "");

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
    setLocaleState(getLocale());
    // Load notification preferences
    apiFetch("/me/notification-preferences").then(async (res) => {
      if (res.ok) setNotifPrefs(await res.json());
    }).catch(() => {});
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
        body: JSON.stringify({
          name: trimmed,
          address: tenantAddress.trim() || undefined,
          city: tenantCity.trim() || undefined,
          province: tenantProvince.trim() || undefined,
          postalCode: tenantPostalCode.trim() || undefined,
          phone: tenantPhone.trim() || undefined,
          email: tenantEmail.trim() || undefined,
          openTime: tenantOpenTime.trim() || undefined,
          closeTime: tenantCloseTime.trim() || undefined,
          capacity: tenantCapacity ? Number(tenantCapacity) : undefined,
          licenceNumber: tenantLicenceNumber.trim() || undefined,
          healthAuthority: tenantHealthAuthority || undefined,
          defaultMonthlyFee: defaultMonthlyFee ? Number(defaultMonthlyFee) : undefined,
          defaultCcfriAmount: defaultCcfriAmount ? Number(defaultCcfriAmount) : undefined,
          defaultAccbAmount: defaultAccbAmount ? Number(defaultAccbAmount) : undefined,
        }),
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
      <div>
        <PageIntro
          title="Settings"
          description="Manage your profile and account settings."
        />

        {ok ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div> : null}
        {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

        {isOwner ? (
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
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {isOwner ? (<>
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</span>
                      <input value={tenantAddress} onChange={(e) => setTenantAddress(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="123 Main St" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">City</span>
                      <input value={tenantCity} onChange={(e) => setTenantCity(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="Vancouver" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Province</span>
                      <input value={tenantProvince} onChange={(e) => setTenantProvince(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="BC" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Postal code</span>
                      <input value={tenantPostalCode} onChange={(e) => setTenantPostalCode(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="V6B 1A1" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</span>
                      <input value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="604-555-0100" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</span>
                      <input type="email" value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="info@centre.ca" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Opening time</span>
                      <input type="time" value={tenantOpenTime} onChange={(e) => setTenantOpenTime(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Closing time</span>
                      <input type="time" value={tenantCloseTime} onChange={(e) => setTenantCloseTime(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Licensed capacity</span>
                      <input type="number" min="0" value={tenantCapacity} onChange={(e) => setTenantCapacity(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="25" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">BC licence number</span>
                      <input value={tenantLicenceNumber} onChange={(e) => setTenantLicenceNumber(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="LIC-12345" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Health authority</span>
                      <select value={tenantHealthAuthority} onChange={(e) => setTenantHealthAuthority(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                        <option value="">Select health authority</option>
                        <option value="Vancouver Coastal Health">Vancouver Coastal Health</option>
                        <option value="Fraser Health">Fraser Health</option>
                        <option value="Interior Health">Interior Health</option>
                        <option value="Island Health">Island Health</option>
                        <option value="Northern Health">Northern Health</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Billing defaults</div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="grid gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Monthly fee ($)</span>
                        <input type="number" min="0" step="0.01" value={defaultMonthlyFee} onChange={(e) => setDefaultMonthlyFee(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. 1100.00" />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">CCFRI amount ($)</span>
                        <input type="number" min="0" step="0.01" value={defaultCcfriAmount} onChange={(e) => setDefaultCcfriAmount(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. 350.00" />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">ACCB amount ($)</span>
                        <input type="number" min="0" step="0.01" value={defaultAccbAmount} onChange={(e) => setDefaultAccbAmount(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. 200.00" />
                      </label>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      These defaults are used when auto-generating monthly invoices. Individual invoices can override these values.
                    </div>
                  </div>

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
          </>) : null}
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

          {/* Language preference */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Language preference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 text-xs text-slate-500">
                Set your preferred language for parent-facing content. Reflects Greater Vancouver&apos;s multilingual communities.
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setLocale(key);
                      setLocaleState(key);
                      setOk(`Language set to ${label}.`);
                    }}
                    className={[
                      "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                      locale === key
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notification preferences */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>Notification preferences</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(isParent ? [
                  { key: "attendance", label: "Check-in / check-out notifications" },
                  { key: "reports", label: "Daily report notifications" },
                  { key: "messages", label: "New message notifications" },
                  { key: "billing", label: "Invoice notifications" },
                ] : [
                  { key: "attendance", label: "Attendance updates" },
                  { key: "messages", label: "New messages" },
                  { key: "incidents", label: "Incident reports" },
                  { key: "eceCerts", label: "ECE certification expiry" },
                  { key: "firstAid", label: "First aid certification expiry" },
                  { key: "billing", label: "Billing updates" },
                ]).map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <span className="text-sm text-slate-700">{label}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs[key] !== false}
                      onChange={(e) => {
                        const next = { ...notifPrefs, [key]: e.target.checked };
                        setNotifPrefs(next);
                        apiFetch("/me/notification-preferences", {
                          method: "PATCH",
                          body: JSON.stringify(next),
                        }).catch(() => {});
                      }}
                      className="h-5 w-5 rounded border-slate-300"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-2 text-xs text-slate-400">Changes save automatically.</div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
