"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, Users, X, Utensils, Moon, Smile, Activity, MessageSquare } from "lucide-react";
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
  notes?: string | null;
  bathroom?: string | null;
  photoUrls?: string[];
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
  const isParent = session?.role === "PARENT";
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
  const [templates, setTemplates] = useState<{ id: string; name: string; meals?: string | null; activities?: string | null; notes?: string | null }[]>([]);

  const [childId, setChildId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [meals, setMeals] = useState("");
  const [naps, setNaps] = useState("0");
  const [mood, setMood] = useState("");
  const [activities, setActivities] = useState("");
  const [notes, setNotes] = useState("");
  const [bathroom, setBathroom] = useState("");
  const [toileting, setToileting] = useState<{ time: string; type: string; notes: string }[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [batchChildIds, setBatchChildIds] = useState<string[]>([]);

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

      const childRows = Array.isArray(childrenData) ? childrenData : (childrenData?.data ?? []);
      const reportRows = Array.isArray(reportsData) ? reportsData : (reportsData?.data ?? []);
      setReports(reportRows);
      setChildren(childRows);

      if (!childId && childRows.length > 0) {
        setChildId(childRows[0].id);
      }

      // Load templates (non-blocking)
      apiFetch("/daily-reports/templates")
        .then((r) => r.ok ? r.json() : [])
        .then((data) => {
          const arr = Array.isArray(data) ? data : (data?.data ?? []);
          setTemplates(arr);
        })
        .catch(() => {});
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
    let result = reports || [];

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
    const todayReports = (reports || []).filter(
      (r) => String(r.date).slice(0, 10) === today
    );
    const uniqueChildrenToday = new Set(todayReports.map((r) => r.childId));

    return {
      total: reports.length,
      today: todayReports.length,
      childrenCoveredToday: uniqueChildrenToday.size,
      childrenMissing: Math.max(0, (children || []).length - uniqueChildrenToday.size),
    };
  }, [reports, children]);

  const missingChildren = useMemo(() => {
    if (!canCreate) return [];
    const today = new Date().toISOString().slice(0, 10);
    const coveredChildIds = new Set(
      (reports || [])
        .filter((r) => String(r.date).slice(0, 10) === today)
        .map((r) => r.childId)
    );
    return (children || []).filter((c) => !coveredChildIds.has(c.id));
  }, [canCreate, reports, children]);

  function resetForm() {
    setMeals("");
    setNaps("0");
    setMood("");
    setActivities("");
    setNotes("");
    setBathroom("");
    setToileting([]);
    setPhotoFiles([]);
    setDate(new Date().toISOString().slice(0, 10));
    setBatchChildIds([]);
  }

  async function createReport() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!childId) throw new Error("Select a child.");
      if (!date) throw new Error("Date is required.");

      // Upload photos first
      let photoUrls: string[] = [];
      if (photoFiles.length > 0) {
        setUploading(true);
        for (const file of photoFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadRes = await fetch("/api/proxy/files/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${(await import("@/lib/token-store")).readToken() || ""}` },
            body: formData,
          });
          if (uploadRes.ok) {
            const result = await uploadRes.json();
            if (result.url) photoUrls.push(`/api/proxy${result.url}`);
          }
        }
        setUploading(false);
      }

      const res = await apiFetch("/daily-reports", {
        method: "POST",
        body: JSON.stringify({
          childId,
          date,
          meals: meals.trim() || undefined,
          naps: Number(naps) || undefined,
          mood: mood || undefined,
          activities: activities.trim() || undefined,
          notes: notes.trim() || undefined,
          bathroom: bathroom.trim() || undefined,
          toileting: toileting.length > 0 ? toileting : undefined,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || `Create report failed: ${res.status}`
        );

      setOk("Daily report created.");
      setShowCreate(false);
      setFilterDate(date); // Show today's reports so the new one is visible
      resetForm();
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create daily report."));
    } finally {
      setSaving(false);
    }
  }

  async function batchCreate() {
    try {
      setSaving(true);
      setError("");
      setOk("");
      if (batchChildIds.length === 0) throw new Error("Select at least one child.");
      if (!date) throw new Error("Date is required.");

      const res = await apiFetch("/daily-reports/batch", {
        method: "POST",
        body: JSON.stringify({
          childIds: batchChildIds,
          date,
          meals: meals.trim() || undefined,
          naps: Number(naps) || undefined,
          mood: mood || undefined,
          activities: activities.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Batch create failed: ${res.status}`);

      const count = Array.isArray(data) ? data.length : batchChildIds.length;
      setOk(`${count} daily report${count !== 1 ? "s" : ""} created.`);
      setShowBatch(false);
      setFilterDate(date); // Show today's reports
      resetForm();
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to batch create reports."));
    } finally {
      setSaving(false);
    }
  }

  // For parents: group reports by date and highlight today
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayReportsForParent = useMemo(() => {
    if (!isParent) return [];
    return filteredReports.filter((r) => String(r.date).slice(0, 10) === todayStr);
  }, [isParent, filteredReports, todayStr]);

  const olderReportsForParent = useMemo(() => {
    if (!isParent) return [];
    return filteredReports.filter((r) => String(r.date).slice(0, 10) !== todayStr);
  }, [isParent, filteredReports, todayStr]);

  // Mood emoji for parent-friendly display
  function moodEmoji(m?: string | null) {
    if (!m) return "";
    const lower = m.toLowerCase();
    if (lower === "happy") return "😊";
    if (lower === "content") return "🙂";
    if (lower === "tired") return "😴";
    if (lower === "fussy") return "😣";
    if (lower === "upset") return "😢";
    return "";
  }

  // Parent-friendly report card
  function renderParentReportCard(report: DailyReport) {
    const isToday = String(report.date).slice(0, 10) === todayStr;
    return (
      <div
        key={report.id}
        className={[
          "rounded-2xl border p-5",
          isToday ? "border-emerald-200 bg-white" : "border-slate-100 bg-white",
        ].join(" ")}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {report.childName || "Your child"}
            </span>
            {report.mood ? (
              <span className="text-lg" title={report.mood}>
                {moodEmoji(report.mood)}
              </span>
            ) : null}
          </div>
          <span className="text-xs text-slate-400">
            {isToday ? "Today" : formatDate(report.date)}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {report.meals ? (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <Utensils className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Meals</div>
                <div className="mt-0.5 text-sm text-slate-800">{report.meals}</div>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
              <Moon className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Naps</div>
              <div className="mt-0.5 text-sm text-slate-800">
                {(report.naps ?? 0) === 0 ? "No naps today" : `${report.naps} nap${(report.naps ?? 0) > 1 ? "s" : ""}`}
              </div>
            </div>
          </div>

          {report.mood ? (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <Smile className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Mood</div>
                <div className="mt-0.5 text-sm text-slate-800">
                  {moodEmoji(report.mood)} {report.mood}
                </div>
              </div>
            </div>
          ) : null}

          {report.activities ? (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                <Activity className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Activities</div>
                <div className="mt-0.5 text-sm text-slate-800">{report.activities}</div>
              </div>
            </div>
          ) : null}

          {report.notes ? (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <MessageSquare className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Notes</div>
                <div className="mt-0.5 text-sm text-slate-800">{report.notes}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div>
        {/* Parent view: clean, child-focused */}
        {isParent ? (
          <>
            <div className="mb-4">
              <Link href="/parent" className="text-sm text-slate-500 hover:text-slate-700">
                &larr; Back to parent home
              </Link>
            </div>

            <PageIntro
              title="Daily Reports"
              description="See what your child did today — meals, naps, mood, and activities."
            />

            {error ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
            ) : null}

            {loading ? (
              <CardListSkeleton count={3} />
            ) : (
              <>
                {/* Child filter — only shown if multi-child family */}
                {children.length > 1 ? (
                  <div className="mb-6">
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
                  </div>
                ) : null}

                {/* Today's reports — highlighted section */}
                {todayReportsForParent.length > 0 ? (
                  <div className="mb-6">
                    <h2 className="mb-3 text-sm font-semibold text-slate-900">Today</h2>
                    <div className="space-y-3">
                      {todayReportsForParent.map(renderParentReportCard)}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-center">
                    <div className="text-sm text-slate-500">No reports filed yet today</div>
                    <div className="mt-1 text-xs text-slate-400">Reports are usually shared by the end of the day</div>
                  </div>
                )}

                {/* Earlier reports */}
                {olderReportsForParent.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold text-slate-900">Earlier</h2>
                    <div className="space-y-3">
                      {olderReportsForParent.map(renderParentReportCard)}
                    </div>
                  </div>
                ) : null}

                {filteredReports.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
                    <div className="text-sm text-slate-500">No daily reports yet</div>
                    <div className="mt-1 text-xs text-slate-400">Your centre will share daily updates here</div>
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : (
          /* Staff/Owner view: full admin interface */
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <PageIntro
                title="Daily Reports"
                description="Daily activity logs shared with families — meals, naps, mood, and activities."
              />
              {canCreate ? (
                <div className="flex gap-2">
                  <Link
                    href="/daily-reports/templates"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Templates
                  </Link>
                  <button
                    onClick={() => { setShowBatch(true); setShowCreate(false); resetForm(); setBatchChildIds(missingChildren.map((c) => c.id)); }}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Users className="h-4 w-4" />
                    Batch create
                  </button>
                  <button
                    onClick={() => { setShowCreate(true); setShowBatch(false); }}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    New report
                  </button>
                </div>
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
                    <div className="flex items-center gap-2">
                      {templates.length > 0 && (
                        <select
                          onChange={(e) => {
                            const t = templates.find((tpl) => tpl.id === e.target.value);
                            if (t) {
                              if (t.meals) setMeals(t.meals);
                              if (t.activities) setActivities(t.activities);
                              if (t.notes) setNotes(t.notes);
                            }
                            e.target.value = "";
                          }}
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600"
                          defaultValue=""
                        >
                          <option value="" disabled>Use template...</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      )}
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

                    {/* Mood — emoji tap selector */}
                    <div className="md:col-span-2">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Mood
                      </div>
                      <div className="flex gap-2">
                        {[
                          { key: "Happy", emoji: "😊" },
                          { key: "Calm", emoji: "😌" },
                          { key: "Tired", emoji: "😴" },
                          { key: "Fussy", emoji: "😢" },
                          { key: "Sick", emoji: "🤒" },
                        ].map((m) => (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setMood(mood === m.key ? "" : m.key)}
                            className={`flex flex-1 flex-col items-center rounded-xl border-2 py-3 transition ${mood === m.key ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                          >
                            <span className="text-2xl">{m.emoji}</span>
                            <span className={`mt-1 text-[10px] font-semibold ${mood === m.key ? "text-indigo-600" : "text-slate-400"}`}>{m.key}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Naps — descriptive tap selector */}
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Naps</div>
                      <div className="flex gap-2">
                        {[
                          { value: "0", label: "No nap", emoji: "🚫" },
                          { value: "1", label: "1 nap", emoji: "😴" },
                          { value: "2", label: "2 naps", emoji: "😴" },
                          { value: "3", label: "3 naps", emoji: "💤" },
                        ].map((n) => (
                          <button key={n.value} type="button" onClick={() => setNaps(n.value)}
                            className={`flex flex-1 flex-col items-center rounded-xl border-2 py-2.5 transition ${naps === n.value ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                          >
                            <span className="text-lg">{n.emoji}</span>
                            <span className={`mt-0.5 text-[10px] font-semibold ${naps === n.value ? "text-indigo-600" : "text-slate-400"}`}>{n.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Meals — tap selector */}
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Meals</div>
                    <div className="space-y-2">
                      {["Breakfast", "Lunch", "PM Snack"].map((mealTime) => (
                        <div key={mealTime} className="flex items-center gap-3">
                          <span className="w-20 text-sm font-medium text-slate-600">{mealTime}</span>
                          <div className="flex flex-1 gap-1.5">
                            {["none", "some", "most", "all"].map((level) => {
                              const mealKey = mealTime.toLowerCase().replace(" ", "");
                              const isActive = meals.includes(`${mealKey}:${level}`);
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => {
                                    const prefix = `${mealKey}:`;
                                    const cleaned = meals.split(",").filter((s) => !s.trim().startsWith(prefix)).join(",");
                                    setMeals(cleaned ? `${cleaned},${prefix}${level}` : `${prefix}${level}`);
                                  }}
                                  className={`flex-1 rounded-lg border py-1.5 text-center text-xs font-semibold transition ${isActive ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                                >
                                  {level.charAt(0).toUpperCase() + level.slice(1)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activities */}
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Activities
                    </div>
                    <textarea
                      value={activities}
                      onChange={(e) => setActivities(e.target.value)}
                      placeholder="Painting, outdoor play, circle time..."
                      className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Bathroom
                      </div>
                      <input
                        value={bathroom}
                        onChange={(e) => setBathroom(e.target.value)}
                        placeholder="e.g. 2 diaper changes, used potty once"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />

                      {/* Toileting log (BC licensing) */}
                      <div className="mt-3">
                        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">Toileting log</div>
                        {toileting.map((t, i) => (
                          <div key={i} className="mb-2 flex items-center gap-2">
                            <input type="time" value={t.time} onChange={(e) => { const arr = [...toileting]; arr[i] = { ...arr[i], time: e.target.value }; setToileting(arr); }} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs" />
                            <select value={t.type} onChange={(e) => { const arr = [...toileting]; arr[i] = { ...arr[i], type: e.target.value }; setToileting(arr); }} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs">
                              <option value="wet">Wet</option>
                              <option value="bm">BM</option>
                              <option value="both">Both</option>
                              <option value="dry">Dry</option>
                            </select>
                            <input value={t.notes} onChange={(e) => { const arr = [...toileting]; arr[i] = { ...arr[i], notes: e.target.value }; setToileting(arr); }} placeholder="Notes" className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs" />
                            <button onClick={() => setToileting(toileting.filter((_, j) => j !== i))} className="text-xs text-slate-400 hover:text-rose-500">&times;</button>
                          </div>
                        ))}
                        <button onClick={() => setToileting([...toileting, { time: new Date().toTimeString().slice(0, 5), type: "wet", notes: "" }])} className="text-xs font-medium text-slate-500 hover:text-slate-700">+ Add entry</button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Notes for parents
                      </div>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional notes for the family..."
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* Photo upload */}
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Photos</div>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100">
                      <span>Click to add photos (max 10 MB each)</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) setPhotoFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                        }}
                      />
                    </label>
                    {photoFiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {photoFiles.map((f, i) => (
                          <div key={i} className="relative">
                            <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover border border-slate-200" />
                            <button
                              type="button"
                              onClick={() => setPhotoFiles((prev) => prev.filter((_, j) => j !== i))}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={createReport}
                      disabled={saving || uploading}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {uploading ? "Uploading photos..." : saving ? "Saving..." : "Create report"}
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

            {showBatch && canCreate ? (
              <Card className="mb-6 rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Batch daily reports</CardTitle>
                    <span className="text-xs text-slate-500">{batchChildIds.length} children selected</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Date</div>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Mood</div>
                      <select value={mood} onChange={(e) => setMood(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                        <option value="">Select mood</option>
                        {MOOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Naps</div>
                      <div className="flex gap-1.5">
                        {[
                          { value: "0", label: "0" },
                          { value: "1", label: "1" },
                          { value: "2", label: "2" },
                          { value: "3", label: "3" },
                        ].map((n) => (
                          <button key={n.value} type="button" onClick={() => setNaps(n.value)}
                            className={`flex-1 rounded-xl border py-2.5 text-center text-sm font-semibold transition ${naps === n.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                          >{n.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Meals</div>
                      <textarea value={meals} onChange={(e) => setMeals(e.target.value)} placeholder="Breakfast, snack, lunch..." className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Activities</div>
                      <textarea value={activities} onChange={(e) => setActivities(e.target.value)} placeholder="Circle time, outdoor play..." className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Notes for parents</div>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." className="min-h-[50px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Select children</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setBatchChildIds(missingChildren.map((c) => c.id))} className="text-xs font-medium text-slate-600 hover:text-slate-900">Missing only</button>
                        <button type="button" onClick={() => setBatchChildIds(children.map((c) => c.id))} className="text-xs font-medium text-slate-600 hover:text-slate-900">All</button>
                        <button type="button" onClick={() => setBatchChildIds([])} className="text-xs font-medium text-slate-600 hover:text-slate-900">Clear</button>
                      </div>
                    </div>
                    <div className="grid gap-1.5 md:grid-cols-3 lg:grid-cols-4">
                      {children.map((child) => {
                        const selected = batchChildIds.includes(child.id);
                        return (
                          <label key={child.id} className={["flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors", selected ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"].join(" ")}>
                            <input type="checkbox" checked={selected} onChange={(e) => {
                              if (e.target.checked) setBatchChildIds((prev) => [...prev, child.id]);
                              else setBatchChildIds((prev) => prev.filter((id) => id !== child.id));
                            }} className="h-4 w-4 rounded border-slate-300" />
                            <span className="text-slate-700">{child.fullName || child.id}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button onClick={batchCreate} disabled={saving || batchChildIds.length === 0} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                      {saving ? "Creating..." : `Create ${batchChildIds.length} report${batchChildIds.length !== 1 ? "s" : ""}`}
                    </button>
                    <button onClick={() => { setShowBatch(false); resetForm(); }} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {canCreate && !showCreate && !showBatch ? (
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
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Reports needed</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">{stats.childrenMissing}</div>
                    {stats.childrenMissing > 0 ? <div className="mt-1 text-xs text-amber-600">Not yet filed</div> : null}
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* Missing reports today — actionable panel for staff (hidden when form is open) */}
            {canCreate && !showCreate && !showBatch && missingChildren.length > 0 && !filterDate ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  {missingChildren.length} {missingChildren.length === 1 ? "child" : "children"} missing daily reports today
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingChildren.slice(0, 8).map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        setChildId(child.id);
                        setDate(new Date().toISOString().slice(0, 10));
                        resetForm();
                        setChildId(child.id);
                        setShowCreate(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                    >
                      <Plus className="h-3 w-3" />
                      {child.fullName || "Child"}
                    </button>
                  ))}
                  {missingChildren.length > 8 ? (
                    <span className="inline-flex items-center px-2 py-1.5 text-xs text-amber-600">
                      +{missingChildren.length - 8} more
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

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
          </>
        )}
      </div>
    </RoleGate>
  );
}
