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

type DailyReport = {
  id: string;
  childId?: string | null;
  date?: string | null;
  mood?: string | null;
  naps?: number | string | null;
  meals?: string | null;
  activities?: string | null;
  notes?: string | null;
  photoUrls?: string[] | null;
  aiNarrative?: string | null;
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
  severity: string;
  occurredAt: string;
  description: string;
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

/** Summarize meals for Quick Glance: "Ate well", "Ate some", etc. */
function mealsSummary(raw?: string | null): string {
  if (!raw) return "";
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  let total = 0;
  let count = 0;
  const levels: Record<string, number> = { all: 3, most: 2, some: 1, little: 0, none: 0, refused: 0 };
  for (const p of parts) {
    const idx = p.indexOf(":");
    if (idx > 0) {
      const val = p.slice(idx + 1).trim().toLowerCase();
      total += levels[val] ?? 1;
      count++;
    }
  }
  if (count === 0) return "";
  const avg = total / count;
  if (avg >= 2.5) return "Ate well";
  if (avg >= 1.5) return "Ate most";
  if (avg >= 0.5) return "Ate some";
  return "Ate little";
}

/** Get gradient background based on activities */
function activityGradient(activities?: string | null): string {
  if (!activities) return "from-sky-200 to-sky-300";
  const a = activities.toLowerCase();
  if (a.includes("outdoor") || a.includes("nature")) return "from-green-300 to-green-400";
  if (a.includes("block") || a.includes("building")) return "from-orange-300 to-orange-400";
  if (a.includes("story") || a.includes("reading")) return "from-purple-300 to-purple-400";
  if (a.includes("art") || a.includes("craft")) return "from-pink-300 to-pink-400";
  if (a.includes("music") || a.includes("dance")) return "from-blue-300 to-blue-400";
  if (a.includes("physical") || a.includes("play")) return "from-lime-300 to-green-300";
  if (a.includes("science") || a.includes("explore")) return "from-cyan-300 to-teal-400";
  if (a.includes("garden")) return "from-emerald-300 to-emerald-400";
  return "from-sky-200 to-sky-300";
}

/** Get emoji icons for activities (up to 3) */
function activityEmojis(activities?: string | null): string[] {
  if (!activities) return ["⭐"];
  const EMOJI_MAP: Record<string, string> = {
    block: "🧱", building: "🧱", outdoor: "🌿", nature: "🌿",
    story: "📚", reading: "📚", art: "🎨", craft: "🎨",
    music: "🎵", dance: "🎵", puzzle: "🧩", game: "🧩",
    physical: "🏃", water: "🌊", sand: "🌊", cooking: "🍳",
    baking: "🍳", science: "🔬", explore: "🔬", social: "🤝",
    writing: "✏️", drawing: "✏️", pretend: "🎭", garden: "🌱",
    rest: "😴", quiet: "😴", technology: "🖥️",
  };
  const parts = activities.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const emojis: string[] = [];
  for (const part of parts) {
    if (emojis.length >= 3) break;
    const match = Object.entries(EMOJI_MAP).find(([key]) => part.includes(key));
    if (match && !emojis.includes(match[1])) emojis.push(match[1]);
  }
  return emojis.length > 0 ? emojis : ["⭐"];
}

function severityColor(severity: string) {
  const s = severity?.toUpperCase();
  if (s === "HIGH" || s === "CRITICAL") return "bg-rose-100 text-rose-700 border-rose-200";
  if (s === "MEDIUM") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

/* ─── Card wrapper — unified 16px radius, light shadow, left accent ─── */
function FeedCard({ children, className = "", accent }: { children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <div className={["rounded-2xl shadow-sm overflow-hidden", className].join(" ")}>
      {accent ? (
        <div className="flex">
          <div className={["w-1 shrink-0 rounded-l-2xl", accent].join(" ")} />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      ) : children}
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
      const [childrenRes, attendanceRes, reportsRes, threadsRes, invoicesRes, announcementsRes, menuRes, incidentsRes] = await Promise.all([
        apiFetch("/children?myChildren=true"),
        apiFetch("/attendance").catch(() => null),
        apiFetch("/daily-reports").catch(() => null),
        apiFetch("/messages/threads").catch(() => null),
        apiFetch("/billing/invoices").catch(() => null),
        apiFetch("/announcements").catch(() => null),
        apiFetch(`/meal-menus?date=${today}`).catch(() => null),
        apiFetch("/incidents").catch(() => null),
      ]);
      const childrenData = await childrenRes.json();
      setChildren(Array.isArray(childrenData) ? childrenData : (childrenData?.data ?? []));

      const attendanceData = attendanceRes?.ok ? await attendanceRes.json() : [];
      setAttendance((Array.isArray(attendanceData) ? attendanceData : (attendanceData?.data ?? []))
        .filter((a: AttendanceRow) => !a.date || String(a.date).slice(0, 10) === today));

      const reportsData = reportsRes?.ok ? await reportsRes.json() : [];
      setReports((Array.isArray(reportsData) ? reportsData : (reportsData?.data ?? []))
        .filter((r: DailyReport) => r.date && String(r.date).slice(0, 10) === today));

      const threadsData = threadsRes?.ok ? await threadsRes.json() : [];
      setThreads(Array.isArray(threadsData) ? threadsData : (threadsData?.data ?? []));

      if (invoicesRes?.ok) {
        const d = await invoicesRes.json();
        setInvoices(Array.isArray(d) ? d : (d?.data ?? []));
      }
      if (announcementsRes?.ok) {
        const d = await announcementsRes.json();
        const arr = Array.isArray(d) ? d : (d?.data ?? []);
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        setAnnouncements(arr.filter((a: Announcement) => new Date(a.createdAt) >= weekAgo).slice(0, 3));
      }
      if (menuRes?.ok) {
        const d = await menuRes.json();
        if (d && (d.breakfast || d.lunch || d.morningSnack || d.afternoonSnack)) setTodayMenu(d);
      }
      if (incidentsRes?.ok) {
        const d = await incidentsRes.json();
        const arr = Array.isArray(d) ? d : (d?.data ?? []);
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
  const unpaidInvoices = useMemo(() => invoices.filter((inv) => inv.status.toUpperCase() !== "PAID" && inv.status.toUpperCase() !== "VOID" && inv.balanceAmount > 0), [invoices]);
  const unreadThreads = useMemo(() => threads.filter((t) => (t.unreadCount ?? 0) > 0).slice(0, 2), [threads]);
  const unreviewed = useMemo(() => incidents.filter((i) => !i.parentReviewedAt), [incidents]);
  const childNameMap = useMemo(() => { const m: Record<string, string> = {}; for (const c of children) m[c.id] = c.preferredName || c.fullName || "Child"; return m; }, [children]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <PullToRefresh onRefresh={loadAll}>
        <div className="mx-auto max-w-[480px] pb-8" style={{ backgroundColor: "#f0f4f8", minHeight: "100vh" }}>
          {error && (
            <div className="mx-3 mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          {loading ? (
            <div className="px-3"><CardListSkeleton count={3} /></div>
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
                  const status = (att?.status || "UNKNOWN").toUpperCase();
                  const isCheckedIn = status === "PRESENT" || status === "CHECKED_IN";
                  const isCheckedOut = status === "CHECKED_OUT";
                  const age = childAge(child.dob);
                  const displayName = child.preferredName || child.fullName || "Child";
                  const hasPhotos = (report?.photoUrls || []).length > 0;
                  const photoCount = (report?.photoUrls || []).length;
                  const napCount = report?.naps != null ? Number(report.naps) : 0;
                  const mealsText = mealsSummary(report?.meals);

                  return (
                    <div key={child.id} className="space-y-3">

                      {/* ═══ Card 1 — Child Status ═══ */}
                      <FeedCard className="bg-gradient-to-br from-slate-900 to-blue-800">
                        <div className="p-5 flex items-center gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 text-xl font-bold text-white shadow-lg">
                            {displayName[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold text-white truncate">{displayName}</span>
                              {age && <span className="text-sm text-blue-200">· {age}</span>}
                            </div>
                            <div className="mt-1">
                              {isCheckedIn && att?.checkinAt && (
                                <div className="text-sm text-emerald-300 font-medium">✅ Checked in at {fmtTime(att.checkinAt)}</div>
                              )}
                              {isCheckedOut && att?.checkoutAt && (
                                <div className="text-sm text-slate-300">🚪 Checked out at {fmtTime(att.checkoutAt)}</div>
                              )}
                              {status === "ABSENT" && <div className="text-sm text-rose-300 font-medium">❌ Absent today</div>}
                              {status === "UNKNOWN" && <div className="text-sm text-slate-400">Not checked in yet</div>}
                            </div>
                            {child.className && <div className="text-xs text-blue-300/60 mt-0.5">🏠 {child.className}</div>}
                          </div>
                        </div>
                      </FeedCard>

                      {/* ═══ Card 2 — AI Daily Summary (THE main card) ═══ */}
                      {report?.aiNarrative ? (
                        <FeedCard className="bg-yellow-50 border border-amber-100" accent="bg-amber-400">
                          <div className="p-5">
                            <Quote className="h-5 w-5 text-amber-300 mb-3" />
                            <p className="text-base leading-[1.7] text-slate-800">
                              {report.aiNarrative}
                            </p>
                            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                              <span>✨</span> Daily Summary
                            </div>
                          </div>
                        </FeedCard>
                      ) : report ? (
                        /* Fallback: show teacher's note if no AI narrative */
                        <FeedCard className="bg-white" accent="bg-slate-300">
                          <div className="p-5">
                            {report.notes ? (
                              <>
                                <Quote className="h-5 w-5 text-slate-300 mb-3" />
                                <p className="text-sm leading-relaxed text-slate-700">{report.notes}</p>
                                <div className="mt-3 text-xs text-slate-400">Teacher&apos;s note</div>
                              </>
                            ) : (
                              <div className="text-sm text-slate-500">Report received. Summary generating...</div>
                            )}
                          </div>
                        </FeedCard>
                      ) : null}

                      {/* ═══ Card 3 — Photos / Activity Placeholder ═══ */}
                      {report && (
                        hasPhotos ? (
                          <FeedCard className="bg-white">
                            {report.photoUrls!.length === 1 ? (
                              <button onClick={() => setLightboxUrl(report.photoUrls![0])} className="w-full">
                                <div className="relative">
                                  <img src={report.photoUrls![0]} alt="" className="w-full aspect-[4/3] object-cover" />
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-4 rounded-b-2xl">
                                    <div className="text-xs text-white/80">📷 Today&apos;s photo</div>
                                  </div>
                                </div>
                              </button>
                            ) : (
                              <div className="flex gap-1.5 overflow-x-auto snap-x p-2">
                                {report.photoUrls!.map((url, i) => (
                                  <button key={i} onClick={() => setLightboxUrl(url)} className="shrink-0 snap-start overflow-hidden rounded-xl">
                                    <img src={url} alt="" className="h-52 w-44 object-cover" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </FeedCard>
                        ) : (
                          <FeedCard>
                            <div className={["bg-gradient-to-br h-48 flex flex-col items-center justify-center gap-3", activityGradient(report.activities)].join(" ")}>
                              <div className="text-[60px] leading-none flex items-center gap-2">
                                {activityEmojis(report.activities).map((e, i) => <span key={i}>{e}</span>)}
                              </div>
                              <span className="text-sm text-white/75 font-medium">No photos today</span>
                            </div>
                          </FeedCard>
                        )
                      )}

                      {/* ═══ Card 4 — Quick Glance ═══ */}
                      {report && (
                        <FeedCard className="bg-white">
                          <div className="px-5 py-3.5">
                            <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                              {report.mood && (
                                <span className="inline-flex items-center gap-1">
                                  {moodEmoji(report.mood)} <span className="capitalize">{report.mood}</span>
                                </span>
                              )}
                              {napCount > 0 && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="inline-flex items-center gap-1">
                                    🌙 {napCount} nap{napCount !== 1 ? "s" : ""}
                                  </span>
                                </>
                              )}
                              {mealsText && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="inline-flex items-center gap-1">🍽️ {mealsText}</span>
                                </>
                              )}
                              {photoCount > 0 && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="inline-flex items-center gap-1">📷 {photoCount} photo{photoCount !== 1 ? "s" : ""}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </FeedCard>
                      )}

                      {/* ═══ Card 5 — Menu ═══ */}
                      {todayMenu && (
                        <FeedCard className="bg-green-50 border border-emerald-100" accent="bg-emerald-400">
                          <div className="p-4">
                            <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">Today&apos;s Menu</div>
                            <div className="space-y-1.5 text-sm text-slate-700">
                              {todayMenu.breakfast && <div>🌅 Breakfast: {todayMenu.breakfast}</div>}
                              {todayMenu.morningSnack && <div>🍎 AM Snack: {todayMenu.morningSnack}</div>}
                              {todayMenu.lunch && <div>🍱 Lunch: {todayMenu.lunch}</div>}
                              {todayMenu.afternoonSnack && <div>🍪 PM Snack: {todayMenu.afternoonSnack}</div>}
                            </div>
                          </div>
                        </FeedCard>
                      )}
                    </div>
                  );
                })
              )}

              {/* ─── Messages (only if unread) ─── */}
              {unreadThreads.length > 0 && (
                <FeedCard className="bg-white">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <MessageCircle className="h-4 w-4" /> Messages
                      </div>
                      <Link href="/messages" className="text-xs font-medium text-indigo-500">View all →</Link>
                    </div>
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
                </FeedCard>
              )}

              {/* ─── Invoice reminder ─── */}
              {unpaidInvoices.length > 0 && (
                <Link href="/parent/billing">
                  <FeedCard className="bg-orange-50 border border-orange-200">
                    <div className="p-4 flex items-center gap-4">
                      <span className="text-2xl">💰</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-orange-800">
                          Invoice due {unpaidInvoices[0]?.dueDate ? fmtDate(unpaidInvoices[0].dueDate) : "soon"}
                        </div>
                        <div className="text-base font-bold text-orange-900">
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

              {/* No report yet */}
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
