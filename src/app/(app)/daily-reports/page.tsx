"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X, Utensils, Moon, Smile, Activity } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { readSession } from "@/lib/session";
import { moodBadge as moodColor } from "@/lib/badge-styles";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

type Child = {
  id: string;
  fullName?: string | null;
};

type DailyReport = {
  id: string;
  childId: string;
  childName?: string;
  className?: string | null;
  date: string;
  meals?: string | null;
  naps?: number | null;
  mood?: string | null;
  activities?: string | null;
  photosCount?: number;
};

const MOOD_OPTIONS = ["Happy", "Content", "Tired", "Fussy", "Upset"];

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DailyReportsPage() {
  const session = readSession();
  const canCreate = session?.role === "OWNER" || session?.role === "STAFF";

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [filterChild, setFilterChild] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [childId, setChildId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [meals, setMeals] = useState("");
  const [naps, setNaps] = useState("0");
  const [mood, setMood] = useState("");
  const [activities, setActivities] = useState("");

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [reportsRes, childrenRes] = await Promise.all([
        apiFetch("/daily-reports"),
        apiFetch("/children"),
      ]);

      const reportsData = await reportsRes.json();
      const childrenData = await childrenRes.json();

      if (!reportsRes.ok)
        throw new Error(
          reportsData?.message || `Reports failed: ${reportsRes.status}`
        );
      if (!childrenRes.ok)
        throw new Error(
          childrenData?.message || `Children failed: ${childrenRes.status}`
        );

      const childRows = Array.isArray(childrenData) ? childrenData : [];
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setChildren(childRows);

      if (!childId && childRows.length > 0) {
        setChildId(childRows[0].id);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load daily reports."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredReports = useMemo(() => {
    let result = reports;

    if (filterChild) {
      result = result.filter((r) => r.childId === filterChild);
    }
    if (filterDate) {
      result = result.filter((r) => String(r.date).slice(0, 10) === filterDate);
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((r) =>
      [r.childName, r.className, r.meals, r.mood, r.activities, r.date]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [reports, query, filterChild, filterDate]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayReports = reports.filter(
      (r) => String(r.date).slice(0, 10) === today
    );
    const uniqueChildrenToday = new Set(todayReports.map((r) => r.childId));

    return {
      total: reports.length,
      today: todayReports.length,
      childrenCoveredToday: uniqueChildrenToday.size,
      childrenMissing: Math.max(0, children.length - uniqueChildrenToday.size),
    };
  }, [reports, children]);

  function resetForm() {
    setMeals("");
    setNaps("0");
    setMood("");
    setActivities("");
    setDate(new Date().toISOString().slice(0, 10));
  }

  async function createReport() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!childId) throw new Error("Select a child.");
      if (!date) throw new Error("Date is required.");

      const res = await apiFetch("/daily-reports", {
        method: "POST",
        body: JSON.stringify({
          childId,
          date,
          meals: meals.trim() || undefined,
          naps: Number(naps) || undefined,
          mood: mood || undefined,
          activities: activities.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || `Create report failed: ${res.status}`
        );

      setOk("Daily report created.");
      setShowCreate(false);
      resetForm();
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create daily report."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Daily Reports"
            description="Daily activity logs for each child — meals, naps, mood, and activities."
          />
          {canCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New report
            </button>
          ) : null}
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

        {showCreate && canCreate ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>New daily report</CardTitle>
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
                    Date
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Mood
                  </div>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">Select mood</option>
                    {MOOD_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Naps (count)
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={naps}
                    onChange={(e) => setNaps(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Meals
                </div>
                <textarea
                  value={meals}
                  onChange={(e) => setMeals(e.target.value)}
                  placeholder="Breakfast: oatmeal, snack: apple slices, lunch: pasta..."
                  className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Activities
                </div>
                <textarea
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  placeholder="Painting, outdoor play, circle time, story reading..."
                  className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={createReport}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create report"}
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
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total reports</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.total}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Today</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.today}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Children covered</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.childrenCoveredToday}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Missing today</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.childrenMissing}</div>
              {stats.childrenMissing > 0 ? <div className="mt-1 text-xs text-amber-600">Reports needed</div> : null}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by child, mood, activity..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterChild}
              onChange={(e) => setFilterChild(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All children</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>{child.fullName || child.id}</option>
              ))}
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            />
          </div>
        </div>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <CardListSkeleton count={4} />
            ) : filteredReports.length === 0 ? (
              <FilteredEmptyState
                totalCount={reports.length}
                filterLabel="search or date filter"
              />
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/daily-reports/${encodeURIComponent(report.id)}`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-slate-900">
                            {report.childName || report.childId}
                          </div>
                          <span className="text-xs text-slate-500">
                            {formatDate(report.date)}
                          </span>
                          {report.mood ? (
                            <span
                              className={[
                                "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                moodColor(report.mood),
                              ].join(" ")}
                            >
                              {report.mood}
                            </span>
                          ) : null}
                        </div>

                        {report.className ? (
                          <div className="mt-1 text-xs text-slate-500">
                            Room: {report.className}
                          </div>
                        ) : null}

                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {report.meals ? (
                            <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                              <Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <div>
                                <div className="text-xs font-medium text-slate-500">
                                  Meals
                                </div>
                                <div className="mt-0.5 text-sm text-slate-700">
                                  {report.meals}
                                </div>
                              </div>
                            </div>
                          ) : null}

                          <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                            <Moon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <div>
                              <div className="text-xs font-medium text-slate-500">
                                Naps
                              </div>
                              <div className="mt-0.5 text-sm text-slate-700">
                                {report.naps ?? 0}
                              </div>
                            </div>
                          </div>

                          {report.mood ? (
                            <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                              <Smile className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <div>
                                <div className="text-xs font-medium text-slate-500">
                                  Mood
                                </div>
                                <div className="mt-0.5 text-sm text-slate-700">
                                  {report.mood}
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {report.activities ? (
                            <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                              <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <div>
                                <div className="text-xs font-medium text-slate-500">
                                  Activities
                                </div>
                                <div className="mt-0.5 text-sm text-slate-700">
                                  {report.activities}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
