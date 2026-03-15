"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Search, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { calcAge } from "@/lib/api-helpers";
import { childStatusBadge as statusBadge } from "@/lib/badge-styles";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";

type Child = {
  id: string;
  fullName?: string | null;
  preferredName?: string | null;
  status?: string | null;
  roomId?: string | null;
  className?: string | null;
  dob?: string | null;
  startDate?: string | null;
  gender?: string | null;
  allergies?: string | null;
  medicalNotes?: string | null;
};

type Room = {
  id: string;
  name?: string | null;
};

type GuardianLink = {
  id: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  relation?: string | null;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  isPickupAuthorized?: boolean;
  hasPortalAccess?: boolean;
};

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guardiansByChild, setGuardiansByChild] = useState<Record<string, GuardianLink[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dob, setDob] = useState("");
  const [startDate, setStartDate] = useState("");
  const [gender, setGender] = useState("");
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [childrenRes, roomsRes] = await Promise.all([
        apiFetch("/children"),
        apiFetch("/rooms"),
      ]);

      const childrenData = await childrenRes.json();
      const roomsData = await roomsRes.json();

      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);
      if (!roomsRes.ok) throw new Error(roomsData?.message || `Rooms failed: ${roomsRes.status}`);

      const childRows = Array.isArray(childrenData) ? childrenData : [];
      const roomRows = Array.isArray(roomsData) ? roomsData : [];

      setChildren(childRows);
      setRooms(roomRows);

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
    } catch (e: any) {
      setError(e?.message || "Unable to load children.");
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

  const rows = useMemo(() => {
    return children.map((child) => {
      const guardians = guardiansByChild[child.id] || [];
      const primary =
        guardians.find((g) => g.isPrimaryContact) ||
        guardians.find((g) => g.isEmergencyContact) ||
        guardians[0] ||
        null;

      const roomName =
        child.className ||
        (child.roomId ? roomNameById[child.roomId] || child.roomId : "—");

      const missingPrimary = !guardians.some((g) => g.isPrimaryContact);
      const missingEmergency = !guardians.some((g) => g.isEmergencyContact);
      const missingPickup = !guardians.some((g) => g.isPickupAuthorized);

      const profileChecks = {
        hasDob: !!child.dob,
        hasRoom: !!child.roomId,
        hasStartDate: !!child.startDate,
        hasGuardian: guardians.length > 0,
        hasEmergency: guardians.some((g) => g.isEmergencyContact),
        hasPrimary: guardians.some((g) => g.isPrimaryContact),
      };
      const profileComplete = Object.values(profileChecks).filter(Boolean).length;
      const profileTotal = Object.keys(profileChecks).length;
      const profileMissing: string[] = [];
      if (!profileChecks.hasDob) profileMissing.push("DOB");
      if (!profileChecks.hasRoom) profileMissing.push("Room");
      if (!profileChecks.hasStartDate) profileMissing.push("Start date");
      if (!profileChecks.hasGuardian) profileMissing.push("Guardian");
      if (!profileChecks.hasEmergency) profileMissing.push("Emergency contact");
      if (!profileChecks.hasPrimary) profileMissing.push("Primary contact");

      return {
        ...child,
        roomName,
        guardianName: primary?.guardianName || "—",
        guardianPhone: primary?.guardianPhone || "—",
        missingCount: [missingPrimary, missingEmergency, missingPickup].filter(Boolean).length,
        profileComplete,
        profileTotal,
        profileMissing,
      };
    });
  }, [children, guardiansByChild, roomNameById]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (roomFilter) {
      result = result.filter((row) => row.roomId === roomFilter);
    }
    if (statusFilter) {
      result = result.filter((row) => (row.status || "").toUpperCase() === statusFilter);
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((row) =>
      [
        row.id,
        row.fullName,
        row.preferredName,
        row.roomName,
        row.guardianName,
        row.guardianPhone,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query, roomFilter, statusFilter]);

  const stats = useMemo(() => {
    const incompleteProfiles = rows.filter((r) => r.profileComplete < r.profileTotal).length;
    return {
      total: rows.length,
      active: rows.filter((r) => (r.status || "").toUpperCase() === "ACTIVE").length,
      waitlist: rows.filter((r) => (r.status || "").toUpperCase() === "WAITLIST").length,
      withdrawn: rows.filter((r) => (r.status || "").toUpperCase() === "WITHDRAWN").length,
      followUp: rows.filter((r) => r.missingCount > 0).length,
      incompleteProfiles,
    };
  }, [rows]);

  function resetForm() {
    setFullName("");
    setPreferredName("");
    setDob("");
    setStartDate("");
    setGender("");
    setRoomId("");
    setStatus("ACTIVE");
  }

  async function createChild() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!fullName.trim()) throw new Error("Full name is required.");

      const res = await apiFetch("/children", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          preferredName: preferredName.trim() || undefined,
          dob: dob || undefined,
          startDate: startDate || undefined,
          gender: gender || undefined,
          roomId: roomId || undefined,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create child failed: ${res.status}`);

      setOk("Child created.");
      setShowCreate(false);
      resetForm();
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to create child.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Children"
            description="Child roster, guardian coverage, and operational follow-up."
          />
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add child
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
                <CardTitle>Add child</CardTitle>
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
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Full name</div>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Child full name"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preferred name</div>
                  <input
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Date of birth</div>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Start date</div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Gender</div>
                  <input
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Room</div>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">No room yet</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name || room.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Status</div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="WAITLIST">WAITLIST</option>
                    <option value="WITHDRAWN">WITHDRAWN</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={createChild}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create child"}
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

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Enrolled</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.total}</div>
              <div className="mt-1 text-xs text-slate-500">{stats.active} active</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Waitlist</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.waitlist}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Withdrawn</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.withdrawn}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Guardian follow-up</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.followUp}</div>
              {stats.followUp > 0 ? (
                <div className="mt-1 text-xs text-amber-600">Missing coverage</div>
              ) : (
                <div className="mt-1 text-xs text-emerald-600">All complete</div>
              )}
            </CardContent>
          </Card>
          <Card className={`rounded-2xl border-0 shadow-sm ${stats.incompleteProfiles > 0 ? "ring-1 ring-amber-200" : ""}`}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Registration</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.incompleteProfiles}</div>
              {stats.incompleteProfiles > 0 ? (
                <div className="mt-1 text-xs text-amber-600">Incomplete profiles</div>
              ) : (
                <div className="mt-1 text-xs text-emerald-600">All profiles complete</div>
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
              placeholder="Search children, guardians, rooms..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-3">
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="WAITLIST">Waitlist</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>
        </div>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Child roster</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : filteredRows.length === 0 ? (
              <FilteredEmptyState
                totalCount={children.length}
                filterLabel="search or filter"
                onClear={() => { setQuery(""); setStatusFilter(""); setRoomFilter(""); }}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Child</th>
                      <th className="px-4 py-3 font-medium">Room</th>
                      <th className="px-4 py-3 font-medium">Primary guardian</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Coverage</th>
                      <th className="px-4 py-3 font-medium">Profile</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <Link href={`/children/${encodeURIComponent(row.id)}`} className="group">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-slate-900 group-hover:text-slate-600">{row.fullName || row.id}</span>
                              {row.allergies ? (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-600" title={row.allergies}>
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  Allergy
                                </span>
                              ) : null}
                              {row.medicalNotes && !row.allergies ? (
                                <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-600" title={row.medicalNotes}>
                                  Medical
                                </span>
                              ) : null}
                            </div>
                            {(row.preferredName || row.dob) ? (
                              <div className="text-xs text-slate-500">
                                {row.preferredName || ""}{row.preferredName && row.dob ? " · " : ""}{row.dob ? calcAge(row.dob) || "" : ""}
                              </div>
                            ) : null}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.roomName}</td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900">{row.guardianName}</div>
                          {row.guardianPhone !== "—" ? <div className="text-xs text-slate-500">{row.guardianPhone}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusBadge(row.status)].join(" ")}>
                            {row.status || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.missingCount > 0 ? (
                            <Link
                              href={`/guardians?childId=${encodeURIComponent(row.id)}`}
                              className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                            >
                              Missing {row.missingCount}
                            </Link>
                          ) : (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              Complete
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.profileComplete === row.profileTotal ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              {row.profileComplete}/{row.profileTotal}
                            </span>
                          ) : (
                            <Link
                              href={`/children/${encodeURIComponent(row.id)}`}
                              className="group inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                              title={`Missing: ${row.profileMissing.join(", ")}`}
                            >
                              {row.profileComplete}/{row.profileTotal}
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/children/${encodeURIComponent(row.id)}`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
