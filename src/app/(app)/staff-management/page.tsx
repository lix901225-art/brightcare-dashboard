"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";

type UserRow = {
  id: string;
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  roles?: Array<{ key: string }>;
  createdAt?: string | null;
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

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const res = await apiFetch("/admin/users");
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || `Users failed: ${res.status}`);

      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Unable to load users.");
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
    } catch (e: any) {
      setError(e?.message || "Unable to create user.");
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
            description="Manage staff accounts, parent logins, and user roles."
          />
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add user
          </button>
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
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{user.displayName || "Unnamed"}</div>
                          {user.phone && <div className="mt-0.5 text-xs text-slate-500">{user.phone}</div>}
                        </div>
                        <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", roleBadge(user.role)].join(" ")}>
                          {user.role || "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table view */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Phone</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-t border-slate-200">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{user.displayName || "Unnamed"}</div>
                            <div className="text-xs text-slate-500">{user.id.slice(0, 8)}...</div>
                          </td>
                          <td className="px-4 py-3">{user.phone || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", roleBadge(user.role)].join(" ")}>
                              {user.role || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
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
