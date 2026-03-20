"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CreditCard, MessageCircle, X } from "lucide-react";
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

/* ─── helpers ─── */

function fmtTime(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function childAge(dob?: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years > 0) return `${years} year${years !== 1 ? "s" : ""} old`;
  return `${months} month${months !== 1 ? "s" : ""} old`;
}

function moodEmoji(m?: string | null) {
  if (!m) return "";
  const l = m.toLowerCase();
  if (l === "happy") return "😊";
  if (l === "calm" || l === "content") return "😌";
  if (l === "tired") return "😴";
  if (l === "fussy") return "😢";
  if (l === "sick") return "🤒";
  if (l === "upset") return "😣";
  return "🙂";
}

/** Parse meals string like "breakfast:most,lunch:some,pmSnack:none" into structured data */
function parseMeals(raw?: string | null): { label: string; amount: string }[] {
  if (!raw) return [];
  const results: { label: string; amount: string }[] = [];
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);

  const labelMap: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    morningsnack: "AM Snack",
    amsnack: "AM Snack",
    am_snack: "AM Snack",
    afternoonsnack: "PM Snack",
    pmsnack: "PM Snack",
    pm_snack: "PM Snack",
    snack: "Snack",
    dinner: "Dinner",
  };

  const amountMap: Record<string, string> = {
    all: "All eaten",
    most: "Most eaten",
    some: "Some eaten",
    none: "Not eaten",
    "n/a": "N/A",
    refused: "Refused",
  };

  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx > 0) {
      const key = part.slice(0, colonIdx).trim().toLowerCase().replace(/[\s_-]/g, "");
      const val = part.slice(colonIdx + 1).trim().toLowerCase();
      const label = labelMap[key] || part.slice(0, colonIdx).trim();
      const amount = amountMap[val] || part.slice(colonIdx + 1).trim();
      results.push({ label, amount });
    } else {
      results.push({ label: part, amount: "" });
    }
  }
  return results;
}

/** Format toileting type for display */
function toiletingTypeLabel(type?: string | null): string {
  if (!type) return "";
  const t = type.toLowerCase();
  if (t === "wet") return "Wet";
  if (t === "bm" || t === "bowel") return "BM";
  if (t === "both") return "Wet + BM";
  if (t === "dry") return "Dry";
  return type;
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
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [childrenRes, attendanceRes, reportsRes, learningRes, threadsRes, invoicesRes, announcementsRes, menuRes] = await Promise.all([
        apiFetch("/children?myChildren=true"),
        apiFetch("/attendance").catch(() => null),
        apiFetch("/daily-reports").catch(() => null),
        apiFetch("/learning-stories").catch(() => null),
        apiFetch("/messages/threads").catch(() => null),
        apiFetch("/billing/invoices").catch(() => null),
        apiFetch("/announcements").catch(() => null),
        apiFetch(`/meal-menus?date=${today}`).catch(() => null),
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
        // Show recent learning stories (last 7 days)
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
        if (menuData && (menuData.breakfast || menuData.lunch || menuData.morningSnack || menuData.afternoonSnack)) {
          setTodayMenu(menuData);
        }
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load."));
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const attendanceByChild = useMemo(
    () => Object.fromEntries(attendance.filter((a) => a.childId).map((a) => [a.childId!, a])),
    [attendance]
  );

  const reportsByChild = useMemo(
    () => {
      const map: Record<string, DailyReport> = {};
      for (const r of reports) { if (r.childId) map[r.childId] = r; }
      return map;
    },
    [reports]
  );

  const storiesByChild = useMemo(
    () => {
      const map: Record<string, LearningStory[]> = {};
      for (const s of learningStories) {
        if (!map[s.childId]) map[s.childId] = [];
        map[s.childId].push(s);
      }
      return map;
    },
    [learningStories]
  );

  const unpaidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status.toUpperCase() !== "PAID" && inv.status.toUpperCase() !== "VOID" && inv.balanceAmount > 0),
    [invoices]
  );

  const recentThreads = useMemo(() => threads.slice(0, 3), [threads]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <PullToRefresh onRefresh={loadAll}>
        <div className="mx-auto max-w-2xl pb-6">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          {loading ? (
            <CardListSkeleton count={4} />
          ) : (
            <div className="space-y-4">

              {/* ─── Announcements banner ─── */}
              {announcements.length > 0 && (
                <button
                  onClick={() => setExpandedAnnouncement(!expandedAnnouncement)}
                  className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <span>📢</span>
                    {announcements[0].title}
                  </div>
                  {expandedAnnouncement && (
                    <div className="mt-3 space-y-2">
                      {announcements.map((a) => (
                        <div key={a.id} className="rounded-xl bg-white p-3">
                          <div className="text-sm font-medium text-slate-900">{a.title}</div>
                          {a.content && <div className="mt-1 text-xs text-slate-600">{a.content}</div>}
                          <div className="mt-1 text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              )}

              {/* ─── Unpaid invoices alert ─── */}
              {unpaidInvoices.length > 0 && (
                <Link href="/parent/billing" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 transition-colors hover:bg-rose-100">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                    <CreditCard className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-rose-800">
                      ${unpaidInvoices.reduce((s, i) => s + i.balanceAmount, 0).toFixed(2)} due
                    </div>
                    <div className="text-xs text-rose-600">
                      {unpaidInvoices.length} invoice{unpaidInvoices.length !== 1 ? "s" : ""} outstanding
                      {unpaidInvoices[0]?.dueDate ? ` · Due ${String(unpaidInvoices[0].dueDate).slice(0, 10)}` : ""}
                    </div>
                  </div>
                </Link>
              )}

              {/* ─── Feed per child ─── */}
              {children.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                  <div className="text-4xl mb-3">👋</div>
                  <div className="text-lg font-semibold text-slate-900">Welcome!</div>
                  <div className="mt-1 text-sm text-slate-500">No children linked to your account yet. Please contact the centre.</div>
                </div>
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
                  const toileting: ToiletingEntry[] = Array.isArray(report?.toileting) ? report.toileting : [];

                  return (
                    <div key={child.id} className="space-y-3">

                      {/* ═══ Child header card ═══ */}
                      <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
                            {displayName[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-semibold text-slate-900 truncate">
                                🧒 {displayName}
                              </span>
                              {age && (
                                <span className="text-sm text-slate-400 shrink-0">· {age}</span>
                              )}
                            </div>
                            <div className="mt-0.5">
                              {isCheckedIn && att?.checkinAt && (
                                <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                                  ✅ Checked in at {fmtTime(att.checkinAt)}
                                </span>
                              )}
                              {isCheckedOut && att?.checkoutAt && (
                                <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                                  🚪 Checked out at {fmtTime(att.checkoutAt)}
                                </span>
                              )}
                              {status === "ABSENT" && (
                                <span className="text-sm text-rose-500">Absent today</span>
                              )}
                              {status === "UNKNOWN" && (
                                <span className="text-sm text-slate-400">Not checked in yet</span>
                              )}
                            </div>
                            {child.className && (
                              <div className="text-xs text-slate-400 mt-0.5">{child.className}</div>
                            )}
                          </div>
                        </div>

                        {child.allergies && (
                          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="text-xs font-medium text-rose-700">Allergies: {child.allergies}</span>
                          </div>
                        )}
                      </div>

                      {/* ═══ Today's Report card ═══ */}
                      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                        <div className="px-5 pt-5 pb-1">
                          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Today&apos;s Report
                          </div>
                        </div>

                        {report ? (
                          <div className="px-5 pb-5 space-y-5">

                            {/* Mood */}
                            {report.mood && (
                              <div className="flex items-center gap-3 pt-3">
                                <span className="text-3xl">{moodEmoji(report.mood)}</span>
                                <span className="text-lg font-medium text-slate-800 capitalize">{report.mood}</span>
                              </div>
                            )}

                            {/* Naps */}
                            {report.naps != null && Number(report.naps) > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
                                  <span>🌙</span> Naps
                                </div>
                                <div className="text-sm text-slate-600 pl-6">
                                  {Number(report.naps)} nap{Number(report.naps) !== 1 ? "s" : ""} today
                                </div>
                              </div>
                            )}

                            {/* Meals */}
                            {meals.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                  <span>🍽️</span> Meals
                                </div>
                                <div className="space-y-1.5 pl-6">
                                  {meals.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                      <span className="text-slate-600">{m.label}</span>
                                      <span className="text-slate-800 font-medium">{m.amount}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Toileting */}
                            {toileting.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                  <span>🚽</span> Toileting
                                </div>
                                <div className="space-y-1.5 pl-6">
                                  {toileting.map((entry, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                      {entry.time && <span className="text-slate-400">{fmtTime(entry.time) || entry.time}</span>}
                                      <span>·</span>
                                      <span>{toiletingTypeLabel(entry.type)}</span>
                                      {entry.notes && <span className="text-slate-400">— {entry.notes}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Activities */}
                            {report.activities && (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
                                  <span>🎨</span> Activities
                                </div>
                                <div className="text-sm text-slate-600 pl-6">
                                  {report.activities}
                                </div>
                              </div>
                            )}

                            {/* Photos */}
                            {report.photoUrls && report.photoUrls.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                  <span>📷</span> Photos
                                </div>
                                <div className="grid grid-cols-3 gap-2 pl-6">
                                  {report.photoUrls.map((url, i) => (
                                    <button
                                      key={i}
                                      onClick={() => setLightboxUrl(url)}
                                      className="aspect-square overflow-hidden rounded-xl border border-slate-200 hover:opacity-80 transition-opacity"
                                    >
                                      <img src={url} alt="" className="h-full w-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Teacher's note */}
                            {report.notes && (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                  <span>💬</span> Teacher&apos;s Note
                                </div>
                                <div className="ml-6 rounded-xl bg-sky-50 border border-sky-100 p-4">
                                  <p className="text-sm text-slate-700 italic leading-relaxed">
                                    &ldquo;{report.notes}&rdquo;
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Learning Moment */}
                            {stories.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                  <span>✨</span> Learning Moment
                                </div>
                                {stories.slice(0, 2).map((story) => (
                                  <div key={story.id} className="ml-6 mb-2 rounded-xl bg-amber-50 border border-amber-100 p-4">
                                    <div className="text-sm font-medium text-slate-800 mb-1">{story.title}</div>
                                    <p className="text-sm text-slate-600 italic leading-relaxed">
                                      &ldquo;{story.observation}&rdquo;
                                    </p>
                                    {story.authorName && (
                                      <div className="text-xs text-slate-400 mt-2">— {story.authorName}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="px-5 pb-5 pt-3">
                            <div className="text-sm text-slate-400">No report yet today. Check back later!</div>
                          </div>
                        )}
                      </div>

                      {/* ═══ Today's Menu card ═══ */}
                      {todayMenu && (
                        <div className="rounded-2xl bg-white p-5 shadow-sm">
                          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                            Today&apos;s Menu
                          </div>
                          <div className="space-y-3">
                            {todayMenu.breakfast && (
                              <div className="flex items-start gap-3">
                                <span className="text-base">🌅</span>
                                <div>
                                  <div className="text-xs font-medium text-slate-400">Breakfast</div>
                                  <div className="text-sm text-slate-700">{todayMenu.breakfast}</div>
                                </div>
                              </div>
                            )}
                            {todayMenu.morningSnack && (
                              <div className="flex items-start gap-3">
                                <span className="text-base">🍎</span>
                                <div>
                                  <div className="text-xs font-medium text-slate-400">AM Snack</div>
                                  <div className="text-sm text-slate-700">{todayMenu.morningSnack}</div>
                                </div>
                              </div>
                            )}
                            {todayMenu.lunch && (
                              <div className="flex items-start gap-3">
                                <span className="text-base">🍱</span>
                                <div>
                                  <div className="text-xs font-medium text-slate-400">Lunch</div>
                                  <div className="text-sm text-slate-700">{todayMenu.lunch}</div>
                                </div>
                              </div>
                            )}
                            {todayMenu.afternoonSnack && (
                              <div className="flex items-start gap-3">
                                <span className="text-base">🍪</span>
                                <div>
                                  <div className="text-xs font-medium text-slate-400">PM Snack</div>
                                  <div className="text-sm text-slate-700">{todayMenu.afternoonSnack}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* ─── Recent messages ─── */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MessageCircle className="h-4 w-4" /> Messages
                  </div>
                  <Link href="/messages" className="text-xs font-medium text-indigo-500 hover:text-indigo-700">View all →</Link>
                </div>
                {recentThreads.length === 0 ? (
                  <div className="text-sm text-slate-400">No messages yet</div>
                ) : (
                  <div className="space-y-1">
                    {recentThreads.map((t) => (
                      <Link key={t.id} href={`/messages/${t.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                          {(t.latestSenderName || t.childName || "?")[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {t.latestSenderName || t.childName || "Centre"}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{t.latestMessage || "No messages"}</div>
                        </div>
                        {(t.unreadCount ?? 0) > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{t.unreadCount}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </PullToRefresh>

      {/* ─── Photo lightbox ─── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </RoleGate>
  );
}
