"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Eye } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/api-helpers";
import { severityBadge } from "@/lib/badge-styles";
import { MetricCardsSkeleton, CardListSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

type Child = {
  id: string;
  fullName?: string | null;
};

type IncidentRow = {
  id: string;
  childId: string;
  type?: string | null;
  severity: string;
  occurredAt: string;
  description: string;
  actionsTaken?: string | null;
  lockedAt?: string | null;
};

function fmtDate(value: string) {
  return formatDate(value);
}

function fmtTime(value: string) {
  return formatTime(value) || "";
}

function severityColor(severity: string) {
  return severityBadge(severity);
}

const REVIEWED_KEY = "brightcare_reviewed_incidents";

function getReviewedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(REVIEWED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markReviewed(id: string) {
  const ids = getReviewedIds();
  ids.add(id);
  localStorage.setItem(REVIEWED_KEY, JSON.stringify([...ids]));
}

export default function ParentIncidentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [childFilter, setChildFilter] = useState("");
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  useEffect(() => { setReviewedIds(getReviewedIds()); }, []);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [childrenRes, incidentsRes] = await Promise.all([
        apiFetch("/children"),
        apiFetch("/incidents"),
      ]);
      const childrenData = await childrenRes.json();
      const incidentsData = await incidentsRes.json();
      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);
      if (!incidentsRes.ok) throw new Error(incidentsData?.message || `Incidents failed: ${incidentsRes.status}`);
      setChildren(Array.isArray(childrenData) ? childrenData : []);
      setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load incidents."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const childNameById = useMemo(
    () => Object.fromEntries(children.map((c) => [c.id, c.fullName || "Child"])),
    [children]
  );

  const filtered = useMemo(() => {
    let result = incidents;
    if (childFilter) {
      result = result.filter((i) => i.childId === childFilter);
    }
    return result;
  }, [incidents, childFilter]);

  const stats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = incidents.filter((i) => new Date(i.occurredAt) >= sevenDaysAgo);
    const highSeverity = incidents.filter((i) => {
      const s = i.severity.toLowerCase();
      return s === "critical" || s === "high";
    });
    return {
      total: incidents.length,
      recentCount: recent.length,
      highCount: highSeverity.length,
    };
  }, [incidents]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <div>
        <div className="mb-4">
          <Link href="/parent" className="text-sm text-slate-500 hover:text-slate-700">
            &larr; Back to parent home
          </Link>
        </div>

        <PageIntro
          title="Incidents"
          description="Safety incidents and reports involving your children."
        />

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="space-y-6">
            <MetricCardsSkeleton count={3} />
            <CardListSkeleton count={3} />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total incidents</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">This week</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{stats.recentCount}</div>
                  <div className="mt-1 text-xs text-slate-500">Last 7 days</div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className={["text-sm", stats.highCount > 0 ? "text-rose-600" : "text-slate-500"].join(" ")}>
                    High severity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={["text-3xl font-semibold", stats.highCount > 0 ? "text-rose-700" : ""].join(" ")}>
                    {stats.highCount}
                  </div>
                  {stats.highCount === 0 ? (
                    <div className="mt-1 text-xs text-emerald-600">None reported</div>
                  ) : null}
                </CardContent>
              </Card>
              {(() => {
                const unreviewed = incidents.filter((i) => !reviewedIds.has(i.id)).length;
                return (
                  <Card className={`rounded-2xl border-0 shadow-sm md:col-span-3 ${unreviewed > 0 ? "ring-1 ring-amber-200" : ""}`}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          {unreviewed > 0 ? (
                            <>
                              <Eye className="h-4 w-4 text-amber-500" />
                              <span className="font-medium text-amber-800">{unreviewed} incident{unreviewed !== 1 ? "s" : ""} not yet reviewed</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 text-emerald-500" />
                              <span className="font-medium text-emerald-700">All incidents reviewed</span>
                            </>
                          )}
                        </div>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${unreviewed === 0 ? "bg-emerald-500" : "bg-amber-400"}`}
                            style={{ width: `${incidents.length > 0 ? Math.round(((incidents.length - unreviewed) / incidents.length) * 100) : 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            {/* Filter */}
            {children.length > 1 ? (
              <div className="mt-6 mb-6">
                <select
                  value={childFilter}
                  onChange={(e) => setChildFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  <option value="">All children</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>{c.fullName || c.id}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Incident list */}
            <Card className="mt-6 rounded-2xl border-0 shadow-sm">
              <CardHeader><CardTitle>Incident reports</CardTitle></CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <FilteredEmptyState
                    totalCount={incidents.length}
                    filterLabel="filter"
                    onClear={childFilter ? () => setChildFilter("") : undefined}
                  />
                ) : (
                  <div className="space-y-3">
                    {filtered.map((inc) => {
                      const isReviewed = reviewedIds.has(inc.id);
                      return (
                        <div key={inc.id} className={[
                          "rounded-xl border p-4",
                          isReviewed ? "border-slate-100 bg-slate-50/50" : "border-slate-200",
                        ].join(" ")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className={[
                                "mt-0.5 h-4 w-4 shrink-0",
                                inc.severity.toLowerCase() === "critical" || inc.severity.toLowerCase() === "high"
                                  ? "text-rose-500"
                                  : "text-amber-500",
                              ].join(" ")} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-900">
                                    {inc.type || "Incident"}
                                  </span>
                                  <span className={[
                                    "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                    severityColor(inc.severity),
                                  ].join(" ")}>
                                    {inc.severity}
                                  </span>
                                  {isReviewed ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                      <Check className="h-2.5 w-2.5" /> Reviewed
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {childNameById[inc.childId] || "Child"} · {fmtDate(inc.occurredAt)} at {fmtTime(inc.occurredAt)}
                                </div>
                                <div className="mt-2 text-sm text-slate-700">
                                  {inc.description}
                                </div>
                                {inc.actionsTaken ? (
                                  <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                    <span className="font-medium">Actions taken:</span> {inc.actionsTaken}
                                  </div>
                                ) : null}
                                {!isReviewed ? (
                                  <button
                                    onClick={() => {
                                      markReviewed(inc.id);
                                      setReviewedIds(getReviewedIds());
                                    }}
                                    className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Mark as reviewed
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {inc.lockedAt ? (
                              <span className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                Finalized
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleGate>
  );
}
