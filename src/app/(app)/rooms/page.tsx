"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X, Pencil, Trash2, Users, Shield, AlertTriangle } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { CardListSkeleton } from "@/components/ui/skeleton";

type Room = {
  id: string;
  name: string;
  capacity?: number | null;
  createdAt?: string | null;
};

type Child = {
  id: string;
  fullName?: string | null;
  roomId?: string | null;
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState("");

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [roomsRes, childrenRes] = await Promise.all([
        apiFetch("/rooms"),
        apiFetch("/children"),
      ]);

      const roomsData = await roomsRes.json();
      const childrenData = await childrenRes.json();

      if (!roomsRes.ok) throw new Error(roomsData?.message || `Rooms failed: ${roomsRes.status}`);

      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setChildren(childrenRes.ok && Array.isArray(childrenData) ? childrenData : []);
    } catch (e: any) {
      setError(e?.message || "Unable to load rooms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const childCountByRoom = useMemo(() => {
    const map: Record<string, number> = {};
    for (const child of children) {
      if (child.roomId) {
        map[child.roomId] = (map[child.roomId] || 0) + 1;
      }
    }
    return map;
  }, [children]);

  const unassignedCount = useMemo(() => {
    return children.filter((c) => !c.roomId).length;
  }, [children]);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => r.name.toLowerCase().includes(q));
  }, [rooms, query]);

  function resetForm() {
    setFormName("");
    setFormCapacity("");
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(room: Room) {
    setFormName(room.name);
    setFormCapacity(room.capacity != null ? String(room.capacity) : "");
    setEditingId(room.id);
    setShowForm(true);
  }

  async function saveRoom() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!formName.trim()) throw new Error("Room name is required.");

      const body: Record<string, unknown> = { name: formName.trim() };
      if (formCapacity.trim()) {
        const cap = parseInt(formCapacity.trim(), 10);
        if (isNaN(cap) || cap < 0) throw new Error("Capacity must be a positive number.");
        body.capacity = cap;
      } else {
        body.capacity = null;
      }

      if (editingId) {
        const res = await apiFetch(`/rooms/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `Update failed: ${res.status}`);
        setOk(`Room "${formName.trim()}" updated.`);
      } else {
        const res = await apiFetch("/rooms", {
          method: "POST",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `Create failed: ${res.status}`);
        setOk(`Room "${formName.trim()}" created.`);
      }

      setShowForm(false);
      resetForm();
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to save room.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRoom(room: Room) {
    const count = childCountByRoom[room.id] || 0;
    const msg = count > 0
      ? `Delete "${room.name}"? ${count} children are assigned to this room and will become unassigned.`
      : `Delete "${room.name}"? This cannot be undone.`;

    if (!confirm(msg)) return;

    try {
      setError("");
      setOk("");
      const res = await apiFetch(`/rooms/${room.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || `Delete failed: ${res.status}`);
      }
      setOk(`Room "${room.name}" deleted.`);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to delete room.");
    }
  }

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Rooms & Licensed Capacity"
            description="Manage classrooms, licensed capacity per BC Community Care licensing, and room assignments."
          />
          <button
            onClick={openCreate}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add room
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

        {showForm ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingId ? "Edit room" : "Add new room"}</CardTitle>
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Room name</div>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="e.g. Sunshine Room"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Licensed capacity</div>
                  <input
                    type="number"
                    min={0}
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Per BC licensing"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Set to your BC Community Care licensed max for this room
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={saveRoom}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update room" : "Create room"}
                </button>
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total rooms</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{rooms.length}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Enrolled / Licensed capacity</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {children.length - unassignedCount}
                <span className="text-lg text-slate-400"> / {rooms.reduce((s, r) => s + (r.capacity || 0), 0)}</span>
              </div>
              {(() => {
                const totalCap = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
                const assigned = children.length - unassignedCount;
                const pct = totalCap > 0 ? Math.round((assigned / totalCap) * 100) : 0;
                const isOver = assigned > totalCap && totalCap > 0;
                return (
                  <>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${isOver ? "bg-rose-500" : pct >= 90 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className={`mt-1 text-xs ${isOver ? "font-medium text-rose-600" : "text-slate-400"}`}>
                      {isOver ? "Over licensed capacity" : `${pct}% utilization`}
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Unassigned</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{unassignedCount}</div>
              {unassignedCount > 0 ? (
                <div className="mt-1 text-xs text-amber-600">Not assigned to any room</div>
              ) : (
                <div className="mt-1 text-xs text-emerald-600">All children assigned</div>
              )}
            </CardContent>
          </Card>
          <Card className={`rounded-2xl border-0 shadow-sm ${rooms.some((r) => r.capacity == null) ? "ring-1 ring-amber-200" : ""}`}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Licensing compliance</CardTitle></CardHeader>
            <CardContent>
              {(() => {
                const missing = rooms.filter((r) => r.capacity == null);
                const overCap = rooms.filter((r) => r.capacity != null && (childCountByRoom[r.id] || 0) > r.capacity);
                if (missing.length > 0) {
                  return (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                      <div>
                        <div className="text-sm font-medium text-amber-700">Needs attention</div>
                        <div className="mt-0.5 text-xs text-amber-600">
                          {missing.length} room{missing.length > 1 ? "s" : ""} missing licensed capacity
                        </div>
                      </div>
                    </div>
                  );
                }
                if (overCap.length > 0) {
                  return (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                      <div>
                        <div className="text-sm font-medium text-rose-700">Over capacity</div>
                        <div className="mt-0.5 text-xs text-rose-600">
                          {overCap.length} room{overCap.length > 1 ? "s" : ""} exceeding licensed limit
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <div>
                      <div className="text-sm font-medium text-emerald-700">Inspection ready</div>
                      <div className="mt-0.5 text-xs text-emerald-600">All rooms within licensed capacity</div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        {loading ? (
          <CardListSkeleton count={3} />
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            {rooms.length === 0 ? "No rooms yet. Create your first classroom above." : "No rooms match your search."}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => {
              const count = childCountByRoom[room.id] || 0;
              const atCapacity = room.capacity != null && count >= room.capacity;
              const overCapacity = room.capacity != null && count > room.capacity;

              return (
                <Card key={room.id} className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{room.name}</CardTitle>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(room)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          title="Edit room"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteRoom(room)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
                          title="Delete room"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">{count} children</span>
                      {room.capacity != null ? (
                        <span className={[
                          "text-xs",
                          overCapacity ? "text-rose-600 font-medium" : atCapacity ? "text-amber-600" : "text-slate-500",
                        ].join(" ")}>
                          / {room.capacity} licensed
                          {overCapacity ? " — over limit" : atCapacity ? " — at capacity" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                          <AlertTriangle className="h-3 w-3" />
                          No licensed capacity set
                        </span>
                      )}
                    </div>

                    {room.capacity != null ? (
                      <div className="mt-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={[
                              "h-full rounded-full transition-all",
                              overCapacity ? "bg-rose-500" : atCapacity ? "bg-amber-500" : "bg-emerald-500",
                            ].join(" ")}
                            style={{ width: `${Math.min(100, room.capacity > 0 ? (count / room.capacity) * 100 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {room.createdAt ? (
                      <div className="mt-3 text-xs text-slate-400">
                        Created {new Date(room.createdAt).toLocaleDateString()}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
