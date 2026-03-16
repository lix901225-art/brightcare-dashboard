"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, X, Pencil, Trash2 } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { guardianChipClass as chipClass } from "@/lib/badge-styles";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

type Child = {
  id: string;
  fullName?: string | null;
  preferredName?: string | null;
  className?: string | null;
  roomId?: string | null;
};

type Room = {
  id: string;
  name?: string | null;
};

type UserRow = {
  id: string;
  displayName?: string | null;
  phone?: string | null;
  role?: string | null;
  email?: string | null;
};

type GuardianLink = {
  id: string;
  guardianUserId?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  relation?: string | null;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  isPickupAuthorized?: boolean;
  hasPortalAccess?: boolean;
  notes?: string | null;
};

export default function GuardiansPage() {
  const searchParams = useSearchParams();
  const filterChildId = searchParams.get("childId") || "";

  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [guardiansByChild, setGuardiansByChild] = useState<Record<string, GuardianLink[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [childId, setChildId] = useState("");
  const [guardianUserId, setGuardianUserId] = useState("");
  const [relation, setRelation] = useState("parent");
  const [notes, setNotes] = useState("");
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [isEmergencyContact, setIsEmergencyContact] = useState(false);
  const [isPickupAuthorized, setIsPickupAuthorized] = useState(false);
  const [hasPortalAccess, setHasPortalAccess] = useState(false);

  const [editingChildId, setEditingChildId] = useState("");
  const [editingGuardianId, setEditingGuardianId] = useState("");

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [childrenRes, roomsRes, usersRes] = await Promise.all([
        apiFetch("/children"),
        apiFetch("/rooms"),
        apiFetch("/admin/users"),
      ]);

      const childrenData = await childrenRes.json();
      const roomsData = await roomsRes.json();
      const usersData = await usersRes.json();

      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);
      if (!roomsRes.ok) throw new Error(roomsData?.message || `Rooms failed: ${roomsRes.status}`);
      if (!usersRes.ok) throw new Error(usersData?.message || `Users failed: ${usersRes.status}`);

      const childRows = Array.isArray(childrenData) ? childrenData : [];
      const roomRows = Array.isArray(roomsData) ? roomsData : [];
      const userRows = Array.isArray(usersData) ? usersData : [];

      setChildren(childRows);
      setRooms(roomRows);
      setUsers(userRows);

      if (filterChildId && childRows.some((c: Child) => c.id === filterChildId)) {
        setChildId(filterChildId);
      } else if (!childId && childRows.length > 0) {
        setChildId(childRows[0].id);
      }
      if (!guardianUserId && userRows.length > 0) {
        const parentLike = userRows.find((u) => (u.role || "").toUpperCase() === "PARENT") || userRows[0];
        setGuardianUserId(parentLike.id);
      }

      const guardianEntries = await Promise.all(
        childRows.map(async (child: Child) => {
          try {
            const res = await apiFetch(`/children/${child.id}/guardians`);
            const data = await res.json();
            return [child.id, res.ok && Array.isArray(data) ? data : []] as const;
          } catch {
            return [child.id, []] as const;
          }
        })
      );

      setGuardiansByChild(Object.fromEntries(guardianEntries));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load guardians."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const roomNameById = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, r.name || r.id])),
    [rooms]
  );

  const candidateUsers = useMemo(() => {
    return users
      .filter((u) => u.id)
      .sort((a, b) => String(a.displayName || a.id).localeCompare(String(b.displayName || b.id)));
  }, [users]);

  const rows = useMemo(() => {
    return children.map((child) => {
      const guardians = guardiansByChild[child.id] || [];
      const roomName =
        child.className ||
        (child.roomId ? roomNameById[child.roomId] || child.roomId : "—");

      const hasPrimary = guardians.some((g) => g.isPrimaryContact);
      const hasEmergency = guardians.some((g) => g.isEmergencyContact);
      const hasPickup = guardians.some((g) => g.isPickupAuthorized);

      return {
        ...child,
        roomName,
        guardians,
        missing: [
          !hasPrimary ? "Primary" : null,
          !hasEmergency ? "Emergency" : null,
          !hasPickup ? "Pickup" : null,
        ].filter(Boolean) as string[],
      };
    });
  }, [children, guardiansByChild, roomNameById]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (filterChildId) {
      result = result.filter((row) => row.id === filterChildId);
    }
    if (roomFilter) {
      result = result.filter((row) => row.roomId === roomFilter);
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((row) =>
      [
        row.id,
        row.fullName,
        row.preferredName,
        row.roomName,
        ...row.guardians.flatMap((g) => [
          g.guardianName || "",
          g.guardianPhone || "",
          g.relation || "",
          g.guardianUserId || "",
          g.notes || "",
        ]),
        ...row.missing,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query, roomFilter]);

  const stats = useMemo(() => {
    return {
      totalChildren: rows.length,
      linkedGuardians: rows.reduce((sum, row) => sum + row.guardians.length, 0),
      followUp: rows.filter((row) => row.missing.length > 0).length,
    };
  }, [rows]);

  function resetCreateForm() {
    setRelation("parent");
    setNotes("");
    setIsPrimaryContact(false);
    setIsEmergencyContact(false);
    setIsPickupAuthorized(false);
    setHasPortalAccess(false);
  }

  function loadGuardianIntoEditor(childIdValue: string, guardian: GuardianLink) {
    setEditingChildId(childIdValue);
    setEditingGuardianId(guardian.id);
    setRelation(guardian.relation || "");
    setNotes(guardian.notes || "");
    setIsPrimaryContact(Boolean(guardian.isPrimaryContact));
    setIsEmergencyContact(Boolean(guardian.isEmergencyContact));
    setIsPickupAuthorized(Boolean(guardian.isPickupAuthorized));
    setHasPortalAccess(Boolean(guardian.hasPortalAccess));
    setShowCreate(false);
    setOk("");
    setError("");
  }

  function closeEditor() {
    setEditingChildId("");
    setEditingGuardianId("");
    resetCreateForm();
  }

  async function createGuardian() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!childId) throw new Error("Select a child.");
      if (!guardianUserId) throw new Error("Select a guardian user.");

      const res = await apiFetch(`/children/${childId}/guardians`, {
        method: "POST",
        body: JSON.stringify({
          guardianUserId,
          relation: relation.trim() || undefined,
          isPrimaryContact,
          isEmergencyContact,
          isPickupAuthorized,
          hasPortalAccess,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create guardian failed: ${res.status}`);

      setOk("Guardian linked.");
      setShowCreate(false);
      resetCreateForm();
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to link guardian."));
    } finally {
      setSaving(false);
    }
  }

  async function updateGuardian() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!editingChildId || !editingGuardianId) throw new Error("No guardian selected.");

      const res = await apiFetch(`/children/${editingChildId}/guardians/${editingGuardianId}`, {
        method: "PATCH",
        body: JSON.stringify({
          relation: relation.trim() || undefined,
          isPrimaryContact,
          isEmergencyContact,
          isPickupAuthorized,
          hasPortalAccess,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Update guardian failed: ${res.status}`);

      setOk("Guardian updated.");
      closeEditor();
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update guardian."));
    } finally {
      setSaving(false);
    }
  }

  async function removeGuardian(childIdValue: string, guardianId: string, guardianName: string) {
    if (!confirm(`Remove guardian "${guardianName}" from this child? This cannot be undone.`)) return;

    try {
      setSaving(true);
      setError("");
      setOk("");

      const res = await apiFetch(`/children/${childIdValue}/guardians/${guardianId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || `Remove guardian failed: ${res.status}`);
      }

      setOk("Guardian link removed.");
      closeEditor();
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to remove guardian."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Guardians"
            description="Guardian coverage, emergency contacts, pickup authorization, and parent access."
          />
          <button
            onClick={() => {
              setShowCreate(true);
              closeEditor();
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Link guardian
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
                <CardTitle>Link existing guardian user</CardTitle>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    resetCreateForm();
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
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Child <span className="text-rose-500">*</span></div>
                  <select
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ${!childId ? "border-slate-200" : "border-emerald-300"}`}
                  >
                    <option value="">Select child</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.fullName || child.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Guardian user <span className="text-rose-500">*</span></div>
                  <select
                    value={guardianUserId}
                    onChange={(e) => setGuardianUserId(e.target.value)}
                    className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ${!guardianUserId ? "border-slate-200" : "border-emerald-300"}`}
                  >
                    <option value="">Select user</option>
                    {candidateUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {(u.displayName || u.id)}{u.role ? ` · ${u.role}` : ""}{u.phone ? ` · ${u.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Relation</div>
                  <input
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="parent, grandparent, aunt..."
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isPrimaryContact} onChange={(e) => setIsPrimaryContact(e.target.checked)} />
                  Primary contact
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isEmergencyContact} onChange={(e) => setIsEmergencyContact(e.target.checked)} />
                  Emergency contact
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isPickupAuthorized} onChange={(e) => setIsPickupAuthorized(e.target.checked)} />
                  Pickup authorized
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={hasPortalAccess} onChange={(e) => setHasPortalAccess(e.target.checked)} />
                  Portal access
                </label>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={createGuardian}
                  disabled={saving || !childId || !guardianUserId}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Link guardian"}
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    resetCreateForm();
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {editingGuardianId ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit guardian link</CardTitle>
                <button
                  onClick={closeEditor}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Relation</div>
                  <input
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="parent, grandparent, aunt..."
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isPrimaryContact} onChange={(e) => setIsPrimaryContact(e.target.checked)} />
                  Primary contact
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isEmergencyContact} onChange={(e) => setIsEmergencyContact(e.target.checked)} />
                  Emergency contact
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isPickupAuthorized} onChange={(e) => setIsPickupAuthorized(e.target.checked)} />
                  Pickup authorized
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={hasPortalAccess} onChange={(e) => setHasPortalAccess(e.target.checked)} />
                  Portal access
                </label>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={updateGuardian}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  onClick={closeEditor}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Children</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.totalChildren}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Linked guardians</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.linkedGuardians}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Needs follow-up</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.followUp}</div>
              {stats.followUp > 0 ? (
                <div className="mt-1 text-xs text-amber-600">Missing coverage</div>
              ) : (
                <div className="mt-1 text-xs text-emerald-600">All complete</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search child, guardian, phone..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>{room.name || room.id}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {loading ? (
            <CardListSkeleton count={4} />
          ) : filteredRows.length === 0 ? (
            <FilteredEmptyState
              totalCount={children.length}
              filterLabel="search or filter"
            />
          ) : (
            filteredRows.map((row) => (
              <Card key={row.id} className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{row.fullName || row.id}</CardTitle>
                      <div className="mt-1 text-sm text-slate-500">
                        Preferred: {row.preferredName || "—"} · Room: {row.roomName}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {row.missing.length === 0 ? (
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Coverage complete
                        </span>
                      ) : (
                        row.missing.map((item) => (
                          <span
                            key={item}
                            className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", chipClass("missing")].join(" ")}
                          >
                            Missing {item}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {row.guardians.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No guardians linked.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {row.guardians.map((g) => (
                        <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="font-medium text-slate-900">{g.guardianName || g.guardianUserId || "Unnamed guardian"}</div>
                              <div className="mt-1 text-sm text-slate-500">
                                {g.guardianPhone || "—"} · {g.relation || "—"}
                              </div>
                              {g.notes ? (
                                <div className="mt-2 text-xs text-slate-500">Notes: {g.notes}</div>
                              ) : null}
                            </div>

                            <div className="flex flex-col items-start gap-3 md:items-end">
                              <div className="flex flex-wrap gap-2">
                                {g.isPrimaryContact ? (
                                  <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", chipClass("primary")].join(" ")}>Primary</span>
                                ) : null}
                                {g.isEmergencyContact ? (
                                  <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", chipClass("emergency")].join(" ")}>Emergency</span>
                                ) : null}
                                {g.isPickupAuthorized ? (
                                  <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", chipClass("pickup")].join(" ")}>Pickup</span>
                                ) : null}
                                {g.hasPortalAccess ? (
                                  <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", chipClass("portal")].join(" ")}>Portal access</span>
                                ) : null}
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => loadGuardianIntoEditor(row.id, g)}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeGuardian(row.id, g.id, g.guardianName || g.guardianUserId || "this guardian")}
                                  disabled={saving}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </RoleGate>
  );
}
