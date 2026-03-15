"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X, AlertTriangle, Lock, Shield } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/api-helpers";
import { severityBadge } from "@/lib/badge-styles";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";

type Child = {
  id: string;
  fullName?: string | null;
};

type Room = {
  id: string;
  name?: string | null;
};

type Incident = {
  id: string;
  childId: string;
  roomId?: string | null;
  type: string;
  severity: string;
  occurredAt: string;
  description: string;
  actionsTaken?: string | null;
  lockedAt?: string | null;
  childName?: string;
  roomName?: string | null;
};

const SEVERITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const TYPE_OPTIONS = [
  "Injury",
  "Behavioral",
  "Medical",
  "Allergic Reaction",
  "Property Damage",
  "Other",
];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [childId, setChildId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [type, setType] = useState("Injury");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 16)
  );

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [incidentsRes, childrenRes, roomsRes] = await Promise.all([
        apiFetch("/incidents"),
        apiFetch("/children"),
        apiFetch("/rooms"),
      ]);

      const incidentsData = await incidentsRes.json();
      const childrenData = await childrenRes.json();
      const roomsData = await roomsRes.json();

      if (!incidentsRes.ok)
        throw new Error(
          incidentsData?.message || `Incidents failed: ${incidentsRes.status}`
        );
      if (!childrenRes.ok)
        throw new Error(
          childrenData?.message || `Children failed: ${childrenRes.status}`
        );
      if (!roomsRes.ok)
        throw new Error(
          roomsData?.message || `Rooms failed: ${roomsRes.status}`
        );

      const childRows = Array.isArray(childrenData) ? childrenData : [];
      const roomRows = Array.isArray(roomsData) ? roomsData : [];
      const incidentRows = Array.isArray(incidentsData) ? incidentsData : [];

      const childById = Object.fromEntries(
        childRows.map((c: Child) => [c.id, c.fullName || c.id])
      );
      const roomById = Object.fromEntries(
        roomRows.map((r: Room) => [r.id, r.name || r.id])
      );

      const enriched = incidentRows.map((inc: Incident) => ({
        ...inc,
        childName: inc.childName || childById[inc.childId] || inc.childId,
        roomName: inc.roomName || (inc.roomId ? roomById[inc.roomId] : null),
      }));

      setIncidents(enriched);
      setChildren(childRows);
      setRooms(roomRows);

      if (!childId && childRows.length > 0) setChildId(childRows[0].id);
    } catch (e: any) {
      setError(e?.message || "Unable to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredIncidents = useMemo(() => {
    let result = incidents;

    if (roomFilter) {
      result = result.filter((inc) => inc.roomId === roomFilter);
    }
    if (severityFilter) {
      result = result.filter((inc) => inc.severity.toLowerCase() === severityFilter.toLowerCase());
    }
    if (typeFilter) {
      result = result.filter((inc) => inc.type === typeFilter);
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((inc) =>
      [
        inc.childName,
        inc.roomName,
        inc.type,
        inc.severity,
        inc.description,
        inc.actionsTaken,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [incidents, query, roomFilter, severityFilter, typeFilter]);

  const stats = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent = incidents.filter(
      (i) => new Date(i.occurredAt) >= thirtyDaysAgo
    );
    const highSeverity = incidents.filter(
      (i) =>
        i.severity.toLowerCase() === "high" ||
        i.severity.toLowerCase() === "critical"
    );
    const locked = incidents.filter((i) => i.lockedAt);

    return {
      total: incidents.length,
      last30Days: recent.length,
      highSeverity: highSeverity.length,
      locked: locked.length,
    };
  }, [incidents]);

  function resetForm() {
    setType("Injury");
    setSeverity("Medium");
    setDescription("");
    setActionsTaken("");
    setOccurredAt(new Date().toISOString().slice(0, 16));
    setRoomId("");
  }

  async function createIncident() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!childId) throw new Error("Select a child.");
      if (!description.trim()) throw new Error("Description is required.");

      const res = await apiFetch("/incidents", {
        method: "POST",
        body: JSON.stringify({
          childId,
          roomId: roomId || undefined,
          type,
          severity,
          occurredAt: new Date(occurredAt).toISOString(),
          description: description.trim(),
          actionsTaken: actionsTaken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || `Create incident failed: ${res.status}`
        );

      setOk("Incident report created.");
      setShowCreate(false);
      resetForm();
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to create incident report.");
    } finally {
      setSaving(false);
    }
  }

  async function lockIncident(incidentId: string) {
    if (
      !confirm(
        "Lock this incident? Once locked, it cannot be modified. This is typically done after review."
      )
    )
      return;

    try {
      setSaving(true);
      setError("");
      setOk("");

      const res = await apiFetch(`/incidents/${incidentId}/lock`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || `Lock failed: ${res.status}`);
      }

      setOk("Incident locked.");
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to lock incident.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Incidents"
            description="Safety and incident tracking for compliance and parent communication."
          />
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Report incident
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
                <CardTitle>Report incident</CardTitle>
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
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Child
                  </div>
                  <select
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
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
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Room
                  </div>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">Select room (optional)</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name || room.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Type
                  </div>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Severity
                  </div>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    {SEVERITY_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Occurred at
                  </div>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Description
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened, including any injuries, witnesses, and circumstances..."
                  className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions taken
                </div>
                <textarea
                  value={actionsTaken}
                  onChange={(e) => setActionsTaken(e.target.value)}
                  placeholder="First aid administered, parent contacted, area inspected..."
                  className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={createIncident}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Submit report"}
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
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.total}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Last 30 days</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.last30Days}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">High / Critical</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.highSeverity}</div>
              {stats.highSeverity > 0 ? <div className="mt-1 text-xs text-rose-600">Needs review</div> : null}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Locked</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.locked}</div></CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search incidents..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap gap-3">
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
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All severities</option>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Incident log</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <CardListSkeleton count={4} />
            ) : filteredIncidents.length === 0 ? (
              <FilteredEmptyState
                totalCount={incidents.length}
                filterLabel="search or filter"
              />
            ) : (
              <div className="space-y-3">
                {filteredIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className={[
                      "rounded-xl border bg-white p-4",
                      inc.lockedAt ? "border-slate-300 bg-slate-50" : "border-slate-200",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <div className="font-medium text-slate-900">
                            {inc.childName}
                          </div>
                          <span
                            className={[
                              "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                              severityBadge(inc.severity),
                            ].join(" ")}
                          >
                            {inc.severity}
                          </span>
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            {inc.type}
                          </span>
                          {inc.lockedAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {formatDateTime(inc.occurredAt)}
                          {inc.roomName ? ` · ${inc.roomName}` : ""}
                        </div>

                        <div className="mt-2 text-sm text-slate-700">
                          {inc.description}
                        </div>

                        {inc.actionsTaken ? (
                          <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 p-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <Shield className="h-3 w-3" />
                              Actions taken
                            </div>
                            <div className="mt-1 text-sm text-emerald-800">
                              {inc.actionsTaken}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {!inc.lockedAt ? (
                        <button
                          onClick={() => lockIncident(inc.id)}
                          disabled={saving}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Lock
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
