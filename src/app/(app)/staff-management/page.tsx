"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Check, Edit2, KeyRound, Mail, Plus, Search, UserX, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

type UserRow = {
  id: string;
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
  auth0Linked?: boolean;
  role?: string | null;
  roles?: Array<{ key: string }>;
  createdAt?: string | null;
  deactivated?: boolean;
};

type EceCert = {
  id: string;
  userId: string;
  certNumber?: string | null;
  level?: string | null;
  expiresAt?: string | null;
};

function roleBadge(role?: string | null) {
  switch ((role || "").toUpperCase()) {
    case "OWNER":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "STAFF":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "PARENT":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export default function StaffManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [eceCerts, setEceCerts] = useState<EceCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"STAFF" | "PARENT">("STAFF");

  // Invite by email (Auth0 flow)
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"STAFF" | "PARENT">("PARENT");

  // Reset password
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Edit user (role + email)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<"STAFF" | "PARENT">("STAFF");
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [usersRes, certsRes] = await Promise.all([
        apiFetch("/admin/users"),
        apiFetch("/compliance/ece-certifications").catch(() => null),
      ]);

      const userData = await usersRes.json();
      if (!usersRes.ok) throw new Error(userData?.message || `Users failed: ${usersRes.status}`);

      setUsers(Array.isArray(userData) ? userData : []);

      if (certsRes?.ok) {
        const certData = await certsRes.json();
        setEceCerts(Array.isArray(certData) ? certData : []);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load users."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (roleFilter) {
      result = result.filter((u) => (u.role || "").toUpperCase() === roleFilter);
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((u) =>
      [u.displayName, u.phone, u.email, u.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [users, query, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      owners: users.filter((u) => (u.role || "").toUpperCase() === "OWNER").length,
      staff: users.filter((u) => (u.role || "").toUpperCase() === "STAFF").length,
      parents: users.filter((u) => (u.role || "").toUpperCase() === "PARENT").length,
    };
  }, [users]);

  function resetForm() {
    setPhone("");
    setPassword("");
    setDisplayName("");
    setRole("STAFF");
  }

  async function createUser() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!phone.trim()) throw new Error("Phone number is required.");
      if (!password.trim()) throw new Error("Password is required.");
      if (!displayName.trim()) throw new Error("Display name is required.");

      const res = await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          phone: phone.trim(),
          password: password.trim(),
          displayName: displayName.trim(),
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create user failed: ${res.status}`);

      setOk(`${role} account created for ${displayName.trim()}.`);
      setShowCreate(false);
      resetForm();
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create user."));
    } finally {
      setSaving(false);
    }
  }

  async function inviteUser() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!inviteEmail.trim()) throw new Error("Email is required.");
      if (!inviteName.trim()) throw new Error("Display name is required.");

      const res = await apiFetch("/admin/users/invite", {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          displayName: inviteName.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Invite failed: ${res.status}`);

      setOk(`Invited ${inviteName.trim()} (${inviteEmail.trim()}) as ${inviteRole}. They can now sign in with Auth0 using this email.`);
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("PARENT");
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to invite user."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmResetPassword() {
    if (!resetTarget) return;
    const targetId = resetTarget.id;
    const targetName = resetTarget.displayName || "User";

    try {
      setResetting(true);
      setError("");
      setOk("");

      if (resetPassword.length < 6) throw new Error("Password must be at least 6 characters.");

      const res = await apiFetch(`/admin/users/${targetId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: resetPassword.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Reset failed: ${res.status}`);

      setOk(`Password reset for ${targetName}.`);
      setResetTarget(null);
      setResetPassword("");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to reset password."));
    } finally {
      setResetting(false);
    }
  }

  async function saveUserEdit() {
    if (!editTarget) return;
    try {
      setEditSaving(true);
      setError("");
      setOk("");

      const changes: Record<string, string> = {};
      if (editRole !== (editTarget.role || "").toUpperCase()) changes.role = editRole;
      if (editEmail.trim() && editEmail.trim().toLowerCase() !== (editTarget.email || "").toLowerCase()) {
        changes.email = editEmail.trim();
      }

      if (Object.keys(changes).length === 0) {
        setEditTarget(null);
        return;
      }

      const res = await apiFetch(`/admin/users/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Update failed: ${res.status}`);

      const parts: string[] = [];
      if (changes.role) parts.push(`role changed to ${changes.role}`);
      if (changes.email) parts.push(`email set to ${changes.email}`);
      setOk(`${editTarget.displayName || "User"}: ${parts.join(", ")}.`);
      setEditTarget(null);
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update user."));
    } finally {
      setEditSaving(false);
    }
  }

  async function deactivateUser(user: UserRow) {
    if (!confirm(`Deactivate ${user.displayName || "this user"}? They will no longer be able to sign in.`)) return;
    try {
      setSaving(true);
      setError("");
      setOk("");

      const res = await apiFetch(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ deactivated: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Deactivate failed: ${res.status}`);

      setOk(`${user.displayName || "User"} deactivated.`);
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to deactivate user."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Staff & Users"
            description="Manage staff accounts, parent portal access, and user roles for your centre."
          />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/staff-management/schedule"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Calendar className="h-4 w-4" />
              Schedule
            </Link>
            <button
              onClick={() => { setShowInvite(true); setShowCreate(false); }}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Mail className="h-4 w-4" />
              Invite by email
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowInvite(false); }}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add user
            </button>
          </div>
        </div>

        {ok ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {ok}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {showCreate ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add new user</CardTitle>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Display name</div>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Phone</div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Password</div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Initial password"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Role</div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "STAFF" | "PARENT")}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="PARENT">Parent</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={createUser}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create user"}
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {showInvite ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invite user by email</CardTitle>
                <button onClick={() => setShowInvite(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-sm text-sky-800">
                <strong>How it works:</strong> Enter the user&apos;s email and role. They can then sign in at{" "}
                <span className="font-mono text-xs">app.brightcareos.com</span> using Auth0 with the same email.
                The system will automatically link their account on first login.
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Email</div>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="parent@example.com"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Display name</div>
                  <input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Role</div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "STAFF" | "PARENT")}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="PARENT">Parent</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={inviteUser}
                  disabled={saving}
                  className="inline-flex h-11 items-center gap-2 justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  {saving ? "Inviting..." : "Send invite"}
                </button>
                <button
                  onClick={() => setShowInvite(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {resetTarget ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm ring-1 ring-amber-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reset password: {resetTarget.displayName || "User"}</CardTitle>
                <button
                  onClick={() => { setResetTarget(null); setResetPassword(""); }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-slate-500">
                  Set a new password for {resetTarget.displayName || "this user"} ({resetTarget.phone || resetTarget.id.slice(0, 8)}).
                  They will need to use this password on their next login.
                </div>
                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">New password</span>
                  <input
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="At least 6 characters"
                  />
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={confirmResetPassword}
                    disabled={resetting || resetPassword.length < 6}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <KeyRound className="h-4 w-4" />
                    {resetting ? "Resetting..." : "Reset password"}
                  </button>
                  <button
                    onClick={() => { setResetTarget(null); setResetPassword(""); }}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {editTarget ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm ring-1 ring-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit user: {editTarget.displayName || "User"}</CardTitle>
                <button
                  onClick={() => setEditTarget(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-slate-500">
                  Current role: <span className="font-medium text-slate-900">{editTarget.role || "Unknown"}</span>
                  {editTarget.auth0Linked ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-600"><Check className="inline h-3 w-3" /> Auth0 linked</span>
                  ) : (
                    <span className="ml-2 text-amber-600">Not linked to Auth0</span>
                  )}
                </div>
                {!editTarget.auth0Linked && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-sm text-amber-800">
                    <strong>Auth0 migration:</strong> Set this user&apos;s email below. When they sign in via Auth0 with the same email, their account will be automatically linked.
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Role</span>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as "STAFF" | "PARENT")}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    >
                      <option value="STAFF">Staff</option>
                      <option value="PARENT">Parent</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Email (for Auth0 linking)</span>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      placeholder={editTarget.email || "user@example.com"}
                    />
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={saveUserEdit}
                    disabled={editSaving}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    {editSaving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    onClick={() => setEditTarget(null)}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total users</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.total}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Owners</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.owners}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Staff</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.staff}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Parents</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.parents}</div></CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">All roles</option>
            <option value="OWNER">Owner</option>
            <option value="STAFF">Staff</option>
            <option value="PARENT">Parent</option>
          </select>
        </div>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : filteredUsers.length === 0 ? (
              <FilteredEmptyState
                totalCount={users.length}
                filterLabel="search or role filter"
              />
            ) : (
              <>
                {/* Mobile card view */}
                <div className="space-y-2 md:hidden">
                  {filteredUsers.map((user) => {
                    const userCert = eceCerts.find((c) => c.userId === user.id);
                    const certExpired = userCert?.expiresAt && new Date(userCert.expiresAt) < new Date();
                    const certExpiring = userCert?.expiresAt && !certExpired &&
                      new Date(userCert.expiresAt).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

                    return (
                    <div key={user.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={["font-medium text-sm", user.deactivated ? "text-slate-400 line-through" : "text-slate-900"].join(" ")}>
                            {user.displayName || "Unnamed"}
                          </div>
                          {user.email && <div className="mt-0.5 text-xs text-slate-500">{user.email}</div>}
                          {user.phone && <div className="mt-0.5 text-xs text-slate-500">{user.phone}</div>}
                          {user.auth0Linked ? (
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600"><Check className="h-3 w-3" /> Auth0 linked</div>
                          ) : user.email && !user.phone ? (
                            <div className="mt-0.5 text-[10px] text-amber-600">Invited — awaiting first Auth0 login</div>
                          ) : null}
                          {userCert && (user.role?.toUpperCase() === "STAFF" || user.role?.toUpperCase() === "OWNER") && (
                            <div className="mt-1 text-xs text-slate-500">
                              ECE: {userCert.level || "Not set"}
                              {userCert.certNumber && ` • #${userCert.certNumber}`}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", roleBadge(user.role)].join(" ")}>
                            {user.role || "—"}
                          </span>
                          {user.deactivated && (
                            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                              Deactivated
                            </span>
                          )}
                          {certExpired && (
                            <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                              Cert Expired
                            </span>
                          )}
                          {certExpiring && (
                            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                              Cert Expiring
                            </span>
                          )}
                        </div>
                      </div>
                      {!user.deactivated && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setResetTarget(user)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50"
                            title="Reset password"
                          >
                            <KeyRound className="h-3 w-3" /> Reset
                          </button>
                          {(user.role || "").toUpperCase() !== "OWNER" && (
                            <>
                              <button
                                onClick={() => { setEditTarget(user); setEditRole(((user.role || "STAFF").toUpperCase() === "PARENT" ? "PARENT" : "STAFF")); setEditEmail(user.email || ""); }}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50"
                                title="Edit role"
                              >
                                <Edit2 className="h-3 w-3" /> Role
                              </button>
                              <button
                                onClick={() => deactivateUser(user)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 text-xs text-rose-600 hover:bg-rose-50"
                                title="Deactivate user"
                              >
                                <UserX className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
                {/* Desktop table view */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Contact</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Auth0</th>
                        <th className="px-4 py-3 font-medium">Joined</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className={["border-t border-slate-200", user.deactivated ? "opacity-50" : ""].join(" ")}>
                          <td className="px-4 py-3">
                            <div className={["font-medium", user.deactivated ? "text-slate-400 line-through" : "text-slate-900"].join(" ")}>
                              {user.displayName || "Unnamed"}
                            </div>
                            <div className="text-xs text-slate-500">{user.id.slice(0, 8)}...</div>
                          </td>
                          <td className="px-4 py-3">
                            {user.email && <div className="text-sm text-slate-700">{user.email}</div>}
                            {user.phone && <div className="text-xs text-slate-500">{user.phone}</div>}
                            {!user.email && !user.phone && <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", roleBadge(user.role)].join(" ")}>
                                {user.role || "—"}
                              </span>
                              {user.deactivated && (
                                <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                                  Deactivated
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {user.auth0Linked ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" /> Linked</span>
                            ) : user.email ? (
                              <span className="text-xs text-amber-600">Pending</span>
                            ) : (
                              <span className="text-xs text-slate-400">No email</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {user.deactivated ? (
                              <span className="text-xs text-slate-400">No actions</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setResetTarget(user)}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 hover:bg-slate-50"
                                  title="Reset password"
                                >
                                  <KeyRound className="h-3 w-3" />
                                  Reset
                                </button>
                                {(user.role || "").toUpperCase() !== "OWNER" && (
                                  <>
                                    <button
                                      onClick={() => { setEditTarget(user); setEditRole(((user.role || "STAFF").toUpperCase() === "PARENT" ? "PARENT" : "STAFF")); setEditEmail(user.email || ""); }}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 hover:bg-slate-50"
                                      title="Edit role"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                      Role
                                    </button>
                                    <button
                                      onClick={() => deactivateUser(user)}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-rose-600 hover:bg-rose-50"
                                      title="Deactivate user"
                                    >
                                      <UserX className="h-3 w-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
