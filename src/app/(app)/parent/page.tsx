"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, MessageCircle, Quote, ShieldAlert, X } from "lucide-react";
import { PullToRefresh } from "@/components/app/pull-to-refresh";
import { RoleGate } from "@/components/auth/role-gate";
import { apiFetch } from "@/lib/api-client";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/error";

/* ─── types ─── */

type Child = {
  id: string;
  fullName?: string | null;
  preferredName?: string | null;
  dob?: string | null;
  className?: string | null;
  roomId?: string | null;
  allergies?: string | null;
};

type AttendanceRow = {
  id: string;
  childId?: string | null;
  status?: string | null;
  date?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

type ToiletingEntry = {
  time?: string | null;
  type?: string | null;
  notes?: string | null;
};

type DailyReport = {
  id: string;
  childId?: string | null;
  date?: string | null;
  mood?: string | null;
  naps?: number | string | null;
  meals?: string | null;
  activities?: string | null;
  notes?: string | null;
  bathroom?: string | null;
  toileting?: ToiletingEntry[] | null;
  photoUrls?: string[] | null;
  aiNarrative?: string | null;
};

type LearningStory = {
  id: string;
  childId: string;
  title: string;
  observation: string;
  learningOutcome?: string | null;
  authorName?: string | null;
  createdAt: string;
};

type ThreadRow = {
  id: string;
  childId?: string | null;
  childName?: string | null;
  latestMessage?: string | null;
  updatedAt?: string | null;
  unreadCount?: number;
  latestSenderName?: string | null;
};

type InvoiceRow = {
  id: string;
  childName?: string | null;
  status: string;
  dueDate?: string | null;
  balanceAmount: number;
};

type Announcement = {
  id: string;
  title: string;
  content?: string | null;
  createdAt: string;
};

type TodayMenu = {
  breakfast?: string;
  morningSnack?: string;
  lunch?: string;
  afternoonSnack?: string;
};

type IncidentRow = {
  id: string;
  childId: string;
  type?: string | null;
  severity: string;
  occurredAt: string;
  description: string;
  actionsTaken?: string | null;
  parentReviewedAt?: string | null;
};

/* ─── helpers ─── */

function fmtTime(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function childAge(dob?: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years > 0) return `${years}y ${months}m`;
  return `${months}m`;
}

function moodEmoji(m?: string | null) {
  if (!m) return "🙂";
  const l = m.toLowerCase();
  if (l === "happy") return "😊";
  if (l === "calm" || l === "content") return "😌";
  if (l === "tired") return "😴";
  if (l === "fussy") return "😢";
  if (l === "sick") return "🤒";
  if (l === "upset") return "😣";
  return "🙂";
}

const ACTIVITY_EMOJI: Record<string, string> = {
  "building/blocks": "🧱", "outdoor/nature": "🌿", storytime: "📚",
  "arts & crafts": "🎨", "music/dance": "🎵", "puzzles/games": "🧩",
  "physical play": "🏃", "water/sand play": "🌊", "cooking/baking": "🍳",
  "science/explore": "🔬", "social play": "🤝", "rest/quiet time": "😴",
  "writing/drawing": "✏️", "pretend play": "🎭", technology: "🖥️", gardening: "🌱",
};

function parseActivities(raw?: string | null): { emoji: string; label: string }[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean).map((label) => ({
    emoji: ACTIVITY_EMOJI[label.toLowerCase()] || "🎯",
    label,
  }));
}

function parseMeals(raw?: string | null): { label: string; amount: string; level: number; emoji: string }[] {
  if (!raw) return [];
  const results: { label: string; amount: string; level: number; emoji: string }[] = [];
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);

  const labelMap: Record<string, { name: string; emoji: string }> = {
    breakfast: { name: "Breakfast", emoji: "🌅" },
    lunch: { name: "Lunch", emoji: "🍱" },
    morningsnack: { name: "AM Snack", emoji: "🍎" },
    amsnack: { name: "AM Snack", emoji: "🍎" },
    am_snack: { name: "AM Snack", emoji: "🍎" },
    afternoonsnack: { name: "PM Snack", emoji: "🍪" },
    pmsnack: { name: "PM Snack", emoji: "🍪" },
    pm_snack: { name: "PM Snack", emoji: "🍪" },
    snack: { name: "Snack", emoji: "🍪" },
    dinner: { name: "Dinner", emoji: "🍽️" },
  };

  const amountMap: Record<string, { text: string; level: number }> = {
    all: { text: "All eaten", level: 10 },
    most: { text: "Most eaten", level: 8 },
    some: { text: "Some eaten", level: 5 },
    little: { text: "A little", level: 3 },
    none: { text: "Not eaten", level: 0 },
    "n/a": { text: "N/A", level: 0 },
    refused: { text: "Refused", level: 0 },
  };

  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx > 0) {
      const key = part.slice(0, colonIdx).trim().toLowerCase().replace(/[\s_-]/g, "");
      const val = part.slice(colonIdx + 1).trim().toLowerCase();
      const mapped = labelMap[key] || { name: part.slice(0, colonIdx).trim(), emoji: "🍽️" };
      const amt = amountMap[val] || { text: part.slice(colonIdx + 1).trim(), level: 5 };
      results.push({ label: mapped.name, amount: amt.text, level: amt.level, emoji: mapped.emoji });
    }
  }
  return results;
}

function toiletingTypeLabel(type?: string | null): string {
  if (!type) return "";
  const t = type.toLowerCase();
  if (t === "wet") return "Wet";
  if (t === "bm" || t === "bowel") return "Bowel movement";
  if (t === "both") return "Wet + BM";
  if (t === "dry") return "Dry";
  return type;
}

function severityColor(severity: string) {
  const s = severity?.toUpperCase();
  if (s === "HIGH" || s === "CRITICAL") return "bg-rose-100 text-rose-700 border-rose-200";
  if (s === "MEDIUM") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

/** Progress bar color based on level (0-10) */
function barColor(level: number) {
  if (level >= 8) return "bg-emerald-400";
  if (level >= 5) return "bg-amber-400";
  if (level >= 1) return "bg-rose-400";
  return "bg-slate-200";
}

/* ─── Feed Card wrapper ─── */
function FeedCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["rounded-[20px] shadow-sm overflow-hidden", className].join(" ")}>
      {children}
    </div>
  );
}

/* ─── page ─── */

export default function ParentHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [learningStories, setLearningStories] = useState<LearningStory[]>([]);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [todayMenu, setTodayMenu] = useState<TodayMenu | null>(null);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [childrenRes, attendanceRes, reportsRes, learningRes, threadsRes, invoicesRes, announcementsRes, menuRes, incidentsRes] = await Promise.all([
        apiFetch("/children?myChildren=true"),
        apiFetch("/attendance").catch(() => null),
        apiFetch("/daily-reports").catch(() => null),
        apiFetch("/learning-stories").catch(() => null),
        apiFetch("/messages/threads").catch(() => null),
        apiFetch("/billing/invoices").catch(() => null),
        apiFetch("/announcements").catch(() => null),
        apiFetch(`/meal-menus?date=${today}`).catch(() => null),
        apiFetch("/incidents").catch(() => null),
      ]);
      const childrenData = await childrenRes.json();
      const attendanceData = attendanceRes?.ok ? await attendanceRes.json() : [];
      const reportsData = reportsRes?.ok ? await reportsRes.json() : [];
      const threadsData = threadsRes?.ok ? await threadsRes.json() : [];
      setChildren(Array.isArray(childrenData) ? childrenData : (childrenData?.data ?? []));
      const todayAttendance = (Array.isArray(attendanceData) ? attendanceData : (attendanceData?.data ?? []))
        .filter((a: AttendanceRow) => !a.date || String(a.date).slice(0, 10) === today);
      setAttendance(todayAttendance);
      const allReports = Array.isArray(reportsData) ? reportsData : (reportsData?.data ?? []);
      setReports(allReports.filter((r: DailyReport) => r.date && String(r.date).slice(0, 10) === today));
      if (learningRes?.ok) {
        const lsData = await learningRes.json();
        const arr = Array.isArray(lsData) ? lsData : (lsData?.data ?? []);
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        setLearningStories(arr.filter((s: LearningStory) => new Date(s.createdAt) >= weekAgo));
      }
      setThreads(Array.isArray(threadsData) ? threadsData : (threadsData?.data ?? []));
      if (invoicesRes?.ok) {
        const invData = await invoicesRes.json();
        setInvoices(Array.isArray(invData) ? invData : (invData?.data ?? []));
      }
      if (announcementsRes?.ok) {
        const annData = await announcementsRes.json();
        const arr = Array.isArray(annData) ? annData : (annData?.data ?? []);
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        setAnnouncements(arr.filter((a: Announcement) => new Date(a.createdAt) >= weekAgo).slice(0, 3));
      }
      if (menuRes?.ok) {
        const menuData = await menuRes.json();
        if (menuData && (menuData.breakfast || menuData.lunch || menuData.morningSnack || menuData.afternoonSnack)) setTodayMenu(menuData);
      }
      if (incidentsRes?.ok) {
        const incData = await incidentsRes.json();
        const arr = Array.isArray(incData) ? incData : (incData?.data ?? []);
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
        setIncidents(arr.filter((i: IncidentRow) => new Date(i.occurredAt) >= monthAgo).slice(0, 5));
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load."));
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const attendanceByChild = useMemo(() => Object.fromEntries(attendance.filter((a) => a.childId).map((a) => [a.childId!, a])), [attendance]);
  const reportsByChild = useMemo(() => { const m: Record<string, DailyReport> = {}; for (const r of reports) { if (r.childId) m[r.childId] = r; } return m; }, [reports]);
  const storiesByChild = useMemo(() => { const m: Record<string, LearningStory[]> = {}; for (const s of learningStories) { if (!m[s.childId]) m[s.childId] = []; m[s.childId].push(s); } return m; }, [learningStories]);
  const unpaidInvoices = useMemo(() => invoices.filter((inv) => inv.status.toUpperCase() !== "PAID" && inv.status.toUpperCase() !== "VOID" && inv.balanceAmount > 0), [invoices]);
  const unreadThreads = useMemo(() => threads.filter((t) => (t.unreadCount ?? 0) > 0).slice(0, 2), [threads]);
  const unreviewed = useMemo(() => incidents.filter((i) => !i.parentReviewedAt), [incidents]);
  const childNameMap = useMemo(() => { const m: Record<string, string> = {}; for (const c of children) m[c.id] = c.preferredName || c.fullName || "Child"; return m; }, [children]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <PullToRefresh onRefresh={loadAll}>
        <div className="mx-auto max-w-[480px] pb-8" style={{ backgroundColor: "#f0f4f8", minHeight: "100vh" }}>
          {error && (
            <div className="mx-3 mb-3 rounded-[20px] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          {loading ? (
            <div className="px-3"><CardListSkeleton count={4} /></div>
          ) : (
            <div className="space-y-3 px-3 pt-3">

              {/* ─── Announcements ─── */}
              {announcements.length > 0 && (
                <FeedCard className="bg-amber-50 border border-amber-200">
                  <button onClick={() => setExpandedAnnouncement(!expandedAnnouncement)} className="w-full p-4 text-left">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                      <span>📢</span> {announcements[0].title}
                    </div>
                    {expandedAnnouncement && (
                      <div className="mt-3 space-y-2">
                        {announcements.map((a) => (
                          <div key={a.id} className="rounded-xl bg-white/80 p-3">
                            <div className="text-sm font-medium text-slate-900">{a.title}</div>
                            {a.content && <div className="mt-1 text-xs text-slate-600">{a.content}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                </FeedCard>
              )}

              {/* ─── Per-child feed ─── */}
              {children.length === 0 ? (
                <FeedCard className="bg-white">
                  <div className="p-8 text-center">
                    <div className="text-5xl mb-4">👋</div>
                    <div className="text-lg font-semibold text-slate-900">Welcome!</div>
                    <div className="mt-1 text-sm text-slate-500">No children linked yet. Contact your centre.</div>
                  </div>
                </FeedCard>
              ) : (
                children.map((child) => {
                  const att = attendanceByChild[child.id];
                  const report = reportsByChild[child.id];
                  const stories = storiesByChild[child.id] || [];
                  const status = (att?.status || "UNKNOWN").toUpperCase();
                  const isCheckedIn = status === "PRESENT" || status === "CHECKED_IN";
                  const isCheckedOut = status === "CHECKED_OUT";
                  const age = childAge(child.dob);
                  const displayName = child.preferredName || child.fullName || "Child";
                  const meals = parseMeals(report?.meals);
                  const activities = parseActivities(report?.activities);
                  const toileting: ToiletingEntry[] = Array.isArray(report?.toileting) ? report.toileting : [];
                  const hasPhotos = (report?.photoUrls || []).length > 0;

                  return (
                    <div key={child.id} className="space-y-3">

                      {/* ═══ Card 1 — Child Status (dark gradient hero) ═══ */}
                      <FeedCard className="bg-gradient-to-br from-slate-900 to-blue-800">
                        <div className="p-6 flex items-center gap-4" style={{ minHeight: 160 }}>
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 text-2xl font-bold text-white shadow-lg">
                            {displayName[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xl font-bold text-white truncate">{displayName}</div>
                            {age && <div className="text-sm text-blue-200 mt-0.5">{age}</div>}
                            <div className="mt-2">
                              {isCheckedIn && att?.checkinAt && (
                                <div className="text-sm text-emerald-300 font-medium">✅ Checked in at {fmtTime(att.checkinAt)}</div>
                              )}
                              {isCheckedOut && att?.checkoutAt && (
                                <div className="text-sm text-slate-300">🚪 Checked out at {fmtTime(att.checkoutAt)}</div>
                              )}
                              {status === "ABSENT" && <div className="text-sm text-rose-300 font-medium">❌ Absent today</div>}
                              {status === "UNKNOWN" && <div className="text-sm text-slate-400">Not checked in yet</div>}
                            </div>
                            {child.className && <div className="text-xs text-blue-300/70 mt-1">🏠 {child.className}</div>}
                          </div>
                        </div>
                      </FeedCard>

                      {/* ═══ Card 2 — Mood ═══ */}
                      {report?.mood && (
                        <FeedCard className="bg-white">
                          <div className="py-8 px-6 text-center">
                            <div className="text-[80px] leading-none">{moodEmoji(report.mood)}</div>
                            <div className="mt-3 text-2xl font-semibold text-slate-900 capitalize">{report.mood}</div>
                            {report.notes && (
                              <div className="mt-2 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">{report.notes}</div>
                            )}
                          </div>
                        </FeedCard>
                      )}

                      {/* ═══ Card 3 — Activities ═══ */}
                      {activities.length > 0 && (
                        <FeedCard className="bg-white">
                          <div className="p-5">
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Today&apos;s Activities</div>
                            <div className="grid grid-cols-2 gap-2">
                              {activities.map((a, i) => (
                                <div key={i} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
                                  <span className="text-xl">{a.emoji}</span>
                                  <span className="text-sm font-medium text-slate-700">{a.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </FeedCard>
                      )}

                      {/* ═══ Card 4 — Photos ═══ */}
                      {hasPhotos ? (
                        <FeedCard className="bg-white">
                          {report!.photoUrls!.length === 1 ? (
                            <button onClick={() => setLightboxUrl(report!.photoUrls![0])} className="w-full">
                              <div className="relative">
                                <img src={report!.photoUrls![0]} alt="" className="w-full aspect-[4/3] object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                                  <div className="text-xs text-white/80">📷 Today&apos;s photo</div>
                                </div>
                              </div>
                            </button>
                          ) : (
                            <div className="flex gap-1 overflow-x-auto snap-x">
                              {report!.photoUrls!.map((url, i) => (
                                <button key={i} onClick={() => setLightboxUrl(url)} className="shrink-0 snap-start">
                                  <img src={url} alt="" className="h-56 w-48 object-cover first:rounded-l-[20px] last:rounded-r-[20px]" />
                                </button>
                              ))}
                            </div>
                          )}
                        </FeedCard>
                      ) : report && activities.length > 0 ? (
                        <FeedCard className="bg-gradient-to-br from-slate-50 to-blue-50">
                          <div className="py-8 px-6 text-center">
                            <div className="text-5xl flex items-center justify-center gap-2">
                              {activities.slice(0, 3).map((a, i) => <span key={i}>{a.emoji}</span>)}
                            </div>
                            <div className="mt-3 text-sm text-slate-400">No photos today</div>
                          </div>
                        </FeedCard>
                      ) : null}

                      {/* ═══ Card 5 — AI Summary ═══ */}
                      {report?.aiNarrative && (
                        <FeedCard className="bg-blue-50">
                          <div className="p-5">
                            <Quote className="h-5 w-5 text-blue-300 mb-2" />
                            <p className="text-base text-slate-800 leading-relaxed font-medium">
                              &ldquo;{report.aiNarrative}&rdquo;
                            </p>
                            <div className="mt-3 flex items-center gap-1 text-xs text-blue-400 font-medium">
                              <span>✨</span> AI Summary
                            </div>
                          </div>
                        </FeedCard>
                      )}

                      {/* ═══ Card 6 — Meals ═══ */}
                      {meals.length > 0 && (
                        <FeedCard className="bg-white">
                          <div className="p-5">
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Meals Today</div>
                            <div className="space-y-3">
                              {meals.map((m, i) => (
                                <div key={i}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span>{m.emoji}</span>
                                      <span className="text-sm font-medium text-slate-700">{m.label}</span>
                                    </div>
                                    <span className="text-xs text-slate-500">{m.amount}</span>
                                  </div>
                                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className={["h-full rounded-full transition-all", barColor(m.level)].join(" ")}
                                      style={{ width: `${m.level * 10}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </FeedCard>
                      )}

                      {/* ═══ Card 7 — Nap ═══ */}
                      {report && (
                        <FeedCard className="bg-slate-900">
                          <div className="p-6 text-center">
                            <div className="text-5xl mb-3">🌙</div>
                            <div className="text-lg font-semibold text-white mb-1">Nap Time</div>
                            {report.naps != null && Number(report.naps) > 0 ? (
                              <div className="text-sm text-blue-200">
                                {Number(report.naps)} nap{Number(report.naps) !== 1 ? "s" : ""} today
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">No nap today</div>
                            )}
                          </div>
                        </FeedCard>
                      )}

                      {/* ═══ Card — Toileting ═══ */}
                      {toileting.length > 0 && (
                        <FeedCard className="bg-white">
                          <div className="p-5">
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Toileting</div>
                            <div className="space-y-2">
                              {toileting.map((entry, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                  <span>🚽</span>
                                  {entry.time && <span className="text-slate-400 font-medium">{fmtTime(entry.time) || entry.time}</span>}
                                  <span className="text-slate-300">·</span>
                                  <span>{toiletingTypeLabel(entry.type)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </FeedCard>
                      )}

                      {/* ═══ Card — Learning Moment ═══ */}
                      {stories.length > 0 && (
                        <FeedCard className="bg-amber-50">
                          <div className="p-5">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
                              <span>✨</span> Learning Moment
                            </div>
                            {stories.slice(0, 1).map((story) => (
                              <div key={story.id}>
                                <div className="text-base font-semibold text-slate-800 mb-1">{story.title}</div>
                                <p className="text-sm text-slate-600 italic leading-relaxed">&ldquo;{story.observation}&rdquo;</p>
                                {story.authorName && <div className="text-xs text-slate-400 mt-2">— {story.authorName}</div>}
                              </div>
                            ))}
                          </div>
                        </FeedCard>
                      )}

                      {/* ═══ Card 8 — Menu ═══ */}
                      {todayMenu && (
                        <FeedCard className="bg-emerald-50">
                          <div className="p-5">
                            <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-4">Today&apos;s Menu</div>
                            <div className="space-y-2.5">
                              {todayMenu.breakfast && (
                                <div className="flex items-start gap-2.5">
                                  <span>🌅</span>
                                  <div><span className="text-xs text-emerald-600 font-medium">Breakfast</span><div className="text-sm text-slate-700">{todayMenu.breakfast}</div></div>
                                </div>
                              )}
                              {todayMenu.morningSnack && (
                                <div className="flex items-start gap-2.5">
                                  <span>🍎</span>
                                  <div><span className="text-xs text-emerald-600 font-medium">AM Snack</span><div className="text-sm text-slate-700">{todayMenu.morningSnack}</div></div>
                                </div>
                              )}
                              {todayMenu.lunch && (
                                <div className="flex items-start gap-2.5">
                                  <span>🍱</span>
                                  <div><span className="text-xs text-emerald-600 font-medium">Lunch</span><div className="text-sm text-slate-700">{todayMenu.lunch}</div></div>
                                </div>
                              )}
                              {todayMenu.afternoonSnack && (
                                <div className="flex items-start gap-2.5">
                                  <span>🍪</span>
                                  <div><span className="text-xs text-emerald-600 font-medium">PM Snack</span><div className="text-sm text-slate-700">{todayMenu.afternoonSnack}</div></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </FeedCard>
                      )}
                    </div>
                  );
                })
              )}

              {/* ─── Card 9 — Messages (only if unread) ─── */}
              {unreadThreads.length > 0 && (
                <FeedCard className="bg-white">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <MessageCircle className="h-4 w-4" /> Messages
                      </div>
                      <Link href="/messages" className="text-xs font-medium text-indigo-500">View all →</Link>
                    </div>
                    <div className="space-y-1">
                      {unreadThreads.map((t) => (
                        <Link key={t.id} href={`/messages/${t.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50 transition-colors">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                            {(t.latestSenderName || t.childName || "?")[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 truncate">{t.latestSenderName || t.childName || "Centre"}</div>
                            <div className="text-xs text-slate-500 truncate">{t.latestMessage || "New message"}</div>
                          </div>
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{t.unreadCount}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </FeedCard>
              )}

              {/* ─── Card 10 — Invoice reminder ─── */}
              {unpaidInvoices.length > 0 && (
                <Link href="/parent/billing">
                  <FeedCard className="bg-orange-50 border border-orange-200">
                    <div className="p-5 flex items-center gap-4">
                      <div className="text-3xl">💰</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-orange-800">
                          Invoice due {unpaidInvoices[0]?.dueDate ? fmtDate(unpaidInvoices[0].dueDate) : "soon"}
                        </div>
                        <div className="text-lg font-bold text-orange-900">
                          ${unpaidInvoices.reduce((s, i) => s + i.balanceAmount, 0).toFixed(2)} outstanding
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-orange-400" />
                    </div>
                  </FeedCard>
                </Link>
              )}

              {/* ─── Incidents ─── */}
              {incidents.length > 0 && (
                <FeedCard className="bg-white">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ShieldAlert className="h-4 w-4" /> Recent Incidents
                        {unreviewed.length > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{unreviewed.length}</span>
                        )}
                      </div>
                      <Link href="/parent/incidents" className="text-xs font-medium text-indigo-500">View all →</Link>
                    </div>
                    {incidents.slice(0, 2).map((inc) => (
                      <Link key={inc.id} href="/parent/incidents" className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 mb-2 hover:bg-slate-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={["text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border", severityColor(inc.severity)].join(" ")}>{inc.severity}</span>
                            <span className="text-xs text-slate-500">{fmtDate(inc.occurredAt)}</span>
                          </div>
                          <div className="text-sm text-slate-700 mt-1 line-clamp-1">{childNameMap[inc.childId] || "Child"}: {inc.description}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </FeedCard>
              )}

              {/* No report fallback */}
              {children.length > 0 && reports.length === 0 && (
                <FeedCard className="bg-white">
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="text-base font-semibold text-slate-700">No report yet today</div>
                    <div className="text-sm text-slate-400 mt-1">Check back later for updates!</div>
                  </div>
                </FeedCard>
              )}

            </div>
          )}
        </div>
      </PullToRefresh>

      {/* ─── Photo lightbox ─── */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxUrl} alt="" className="max-h-[85vh] max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </RoleGate>
  );
}
