"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, X } from "lucide-react";
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
  allergies?: string | null;
};

type AttendanceRow = {
  id: string;
  childId?: string | null;
  status?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  date?: string | null;
};

type DailyReport = {
  id: string;
  childId?: string | null;
  date?: string | null;
  mood?: string | null;
  naps?: number | string | null;
  meals?: string | null;
  notes?: string | null;
  photoUrls?: string[] | null;
  aiNarrative?: string | null;
};

type ThreadRow = {
  id: string;
  childName?: string | null;
  latestMessage?: string | null;
  unreadCount?: number;
  latestSenderName?: string | null;
};

type InvoiceRow = {
  id: string;
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

type WeekMenu = {
  date: string;
  breakfast?: string;
  lunch?: string;
  afternoonSnack?: string;
};

/* ─── helpers ─── */

function fmtTime(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDate(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { month: "short", day: "numeric" });
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

function mealsSummary(raw?: string | null): string {
  if (!raw) return "";
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  let total = 0, count = 0;
  const levels: Record<string, number> = { all: 3, most: 2, some: 1, little: 0, none: 0, refused: 0 };
  for (const p of parts) {
    const idx = p.indexOf(":");
    if (idx > 0) { total += levels[p.slice(idx + 1).trim().toLowerCase()] ?? 1; count++; }
  }
  if (count === 0) return "";
  const avg = total / count;
  if (avg >= 2.5) return "Ate well";
  if (avg >= 1.5) return "Ate most";
  if (avg >= 0.5) return "Ate some";
  return "Ate little";
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
  const [weekMenus, setWeekMenus] = useState<WeekMenu[]>([]);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [childrenRes, attendanceRes, reportsRes, threadsRes, invoicesRes, announcementsRes, weekMenuRes] = await Promise.all([
        apiFetch("/children?myChildren=true"),
        apiFetch("/attendance").catch(() => null),
        apiFetch("/daily-reports").catch(() => null),
        apiFetch("/messages/threads").catch(() => null),
        apiFetch("/billing/invoices").catch(() => null),
        apiFetch("/announcements").catch(() => null),
        apiFetch(`/meal-menus/week?date=${today}`).catch(() => null),
      ]);

      const childrenData = await childrenRes.json();
      setChildren(Array.isArray(childrenData) ? childrenData : (childrenData?.data ?? []));

      const attData = attendanceRes?.ok ? await attendanceRes.json() : [];
      setAttendance((Array.isArray(attData) ? attData : (attData?.data ?? []))
        .filter((a: AttendanceRow) => !a.date || String(a.date).slice(0, 10) === today));

      const repData = reportsRes?.ok ? await reportsRes.json() : [];
      setReports((Array.isArray(repData) ? repData : (repData?.data ?? []))
        .filter((r: DailyReport) => r.date && String(r.date).slice(0, 10) === today));

      const thrData = threadsRes?.ok ? await threadsRes.json() : [];
      setThreads(Array.isArray(thrData) ? thrData : (thrData?.data ?? []));

      if (invoicesRes?.ok) { const d = await invoicesRes.json(); setInvoices(Array.isArray(d) ? d : (d?.data ?? [])); }

      if (announcementsRes?.ok) {
        const d = await announcementsRes.json();
        const arr = Array.isArray(d) ? d : (d?.data ?? []);
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        setAnnouncements(arr.filter((a: Announcement) => new Date(a.createdAt) >= weekAgo).slice(0, 3));
      }

      if (weekMenuRes?.ok) {
        const d = await weekMenuRes.json();
        if (d?.menus && Array.isArray(d.menus) && d.menus.length > 0) setWeekMenus(d.menus);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load."));
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const attByChild = useMemo(() => Object.fromEntries(attendance.filter((a) => a.childId).map((a) => [a.childId!, a])), [attendance]);
  const reportByChild = useMemo(() => { const m: Record<string, DailyReport> = {}; for (const r of reports) if (r.childId) m[r.childId] = r; return m; }, [reports]);
  const unpaid = useMemo(() => invoices.filter((i) => i.status.toUpperCase() !== "PAID" && i.status.toUpperCase() !== "VOID" && i.balanceAmount > 0), [invoices]);
  const unreadThreads = useMemo(() => threads.filter((t) => (t.unreadCount ?? 0) > 0).slice(0, 2), [threads]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <PullToRefresh onRefresh={loadAll}>
        <div className="mx-auto max-w-[520px] min-h-screen bg-white pb-8">
          {error && <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          {loading ? (
            <div className="px-4 pt-6"><CardListSkeleton count={3} /></div>
          ) : children.length === 0 ? (
            <div className="px-4 pt-16 text-center">
              <div className="text-5xl mb-4">👋</div>
              <div className="text-lg font-semibold text-slate-900">Welcome!</div>
              <div className="mt-1 text-sm text-slate-500">No children linked yet. Contact your centre.</div>
            </div>
          ) : (
            children.map((child) => {
              const att = attByChild[child.id];
              const report = reportByChild[child.id];
              const status = (att?.status || "UNKNOWN").toUpperCase();
              const isIn = status === "PRESENT" || status === "CHECKED_IN";
              const isOut = status === "CHECKED_OUT";
              const age = childAge(child.dob);
              const name = child.preferredName || child.fullName || "Child";
              const hasPhotos = (report?.photoUrls || []).length > 0;
              const napCount = report?.naps != null ? Number(report.naps) : 0;
              const meals = mealsSummary(report?.meals);

              return (
                <div key={child.id}>

                  {/* ════════════ TOP — Child Profile ════════════ */}
                  <div className="px-4 pt-8 pb-6 text-center">
                    {/* Avatar */}
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 text-3xl font-bold text-white shadow-lg">
                      {name[0].toUpperCase()}
                    </div>

                    {/* Name */}
                    <div className="mt-3 text-2xl font-bold text-slate-900">{name}</div>

                    {/* Meta line */}
                    <div className="mt-1 text-sm text-slate-400">
                      {[age, child.className].filter(Boolean).join(" · ")}
                    </div>

                    {/* Attendance status */}
                    <div className="mt-3">
                      {isOut && att?.checkinAt && att?.checkoutAt ? (
                        <div className="text-sm text-slate-500">
                          ✅ In {fmtTime(att.checkinAt)}  →  🚪 Out {fmtTime(att.checkoutAt)}
                        </div>
                      ) : isIn && att?.checkinAt ? (
                        <div className="text-sm text-emerald-600 font-medium">
                          ✅ Checked in at {fmtTime(att.checkinAt)}
                        </div>
                      ) : status === "ABSENT" ? (
                        <div className="text-sm text-rose-500 font-medium">❌ Absent today</div>
                      ) : (
                        <div className="text-sm text-slate-400">⏰ Not checked in yet</div>
                      )}
                    </div>

                    {/* Allergies */}
                    {child.allergies && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-medium text-orange-700">
                        ⚠️ Allergies: {child.allergies}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="mx-4 border-t border-slate-100" />

                  {/* ════════════ BOTTOM — Today's Report ════════════ */}
                  <div className="px-4 pt-5">
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                      Today&apos;s Report
                    </div>

                    {report?.aiNarrative ? (
                      /* ── Has AI narrative ── */
                      <div>
                        <p className="text-base leading-[1.6] text-slate-700">
                          {report.aiNarrative}
                        </p>

                        {/* Photos below narrative */}
                        {hasPhotos && (
                          <div className="mt-5">
                            {report.photoUrls!.length === 1 ? (
                              <button onClick={() => setLightboxUrl(report.photoUrls![0])} className="w-full">
                                <img src={report.photoUrls![0]} alt="" className="w-full rounded-xl object-cover aspect-[4/3]" />
                              </button>
                            ) : (
                              <div className="flex gap-2 overflow-x-auto snap-x -mx-4 px-4 pb-1">
                                {report.photoUrls!.map((url, i) => (
                                  <button key={i} onClick={() => setLightboxUrl(url)} className="shrink-0 snap-start">
                                    <img src={url} alt="" className="h-48 w-40 rounded-xl object-cover" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : report ? (
                      /* ── Has report but no AI narrative — show quick glance ── */
                      <div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                          {report.mood && (
                            <span className="inline-flex items-center gap-1">
                              {moodEmoji(report.mood)} <span className="capitalize">{report.mood}</span>
                            </span>
                          )}
                          {napCount > 0 && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span>🌙 {napCount} nap{napCount !== 1 ? "s" : ""}</span>
                            </>
                          )}
                          {meals && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span>🍽️ {meals}</span>
                            </>
                          )}
                        </div>
                        {report.notes && (
                          <p className="mt-3 text-sm text-slate-500 italic">&ldquo;{report.notes}&rdquo;</p>
                        )}

                        {hasPhotos && (
                          <div className="mt-4 flex gap-2 overflow-x-auto snap-x -mx-4 px-4 pb-1">
                            {report.photoUrls!.map((url, i) => (
                              <button key={i} onClick={() => setLightboxUrl(url)} className="shrink-0 snap-start">
                                <img src={url} alt="" className="h-48 w-40 rounded-xl object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ── No report yet ── */
                      <div className="py-6 text-center">
                        <div className="text-4xl mb-2">☀️</div>
                        <div className="text-base font-semibold text-slate-700">No report yet today</div>
                        <div className="text-sm text-slate-400 mt-1">Check back later!</div>
                      </div>
                    )}
                  </div>

                  {/* ════════════ EXTRAS ════════════ */}
                  <div className="px-4 mt-6 space-y-3">

                    {/* Announcement */}
                    {announcements.length > 0 && (
                      <button
                        onClick={() => setExpandedAnnouncement(!expandedAnnouncement)}
                        className="w-full rounded-xl border border-orange-200 bg-orange-50 p-3 text-left"
                      >
                        <div className="text-sm font-medium text-slate-800">
                          📢 {announcements[0].title}
                        </div>
                        {!expandedAnnouncement && announcements[0].content && (
                          <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">{announcements[0].content}</div>
                        )}
                        {expandedAnnouncement && announcements.map((a) => (
                          <div key={a.id} className="mt-2 rounded-lg bg-white p-2.5 text-xs text-slate-600">
                            <div className="font-medium text-slate-800">{a.title}</div>
                            {a.content && <div className="mt-1 leading-relaxed">{a.content}</div>}
                          </div>
                        ))}
                      </button>
                    )}

                    {/* Weekly menu */}
                    {weekMenus.length > 0 && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">This Week&apos;s Menu</div>
                        <div className="space-y-1">
                          {weekMenus.map((m) => {
                            const day = new Date(m.date).toLocaleDateString([], { weekday: "short" });
                            const items = [m.breakfast, m.lunch, m.afternoonSnack].filter(Boolean).join("  ·  ");
                            return items ? (
                              <div key={m.date} className="flex gap-2 text-xs">
                                <span className="w-8 shrink-0 font-medium text-slate-500">{day}</span>
                                <span className="text-slate-600 truncate">{items}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Unread messages */}
                    {unreadThreads.length > 0 && (
                      <div className="space-y-1.5">
                        {unreadThreads.map((t) => (
                          <Link key={t.id} href={`/messages/${t.id}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                            <span className="text-base">💬</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-slate-800 truncate">
                                <span className="font-medium">{t.latestSenderName || t.childName || "Centre"}:</span>{" "}
                                <span className="text-slate-500">&ldquo;{t.latestMessage}&rdquo;</span>
                              </div>
                            </div>
                            {(t.unreadCount ?? 0) > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{t.unreadCount}</span>
                            )}
                          </Link>
                        ))}
                        <Link href="/messages" className="block text-xs text-indigo-500 font-medium pl-1">View all →</Link>
                      </div>
                    )}

                    {/* Unpaid invoices */}
                    {unpaid.length > 0 && (
                      <Link href="/parent/billing" className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 hover:bg-orange-100 transition-colors">
                        <span className="text-base">💰</span>
                        <div className="flex-1 text-sm text-orange-800">
                          <span className="font-semibold">${unpaid.reduce((s, i) => s + i.balanceAmount, 0).toFixed(2)}</span>
                          {" "}due {unpaid[0]?.dueDate ? fmtDate(unpaid[0].dueDate) : "soon"}
                        </div>
                        <ChevronRight className="h-4 w-4 text-orange-400" />
                      </Link>
                    )}
                  </div>

                  {/* Bottom spacer for multi-child */}
                  {children.length > 1 && <div className="mx-4 mt-8 mb-4 border-t border-slate-200" />}
                </div>
              );
            })
          )}
        </div>
      </PullToRefresh>

      {/* Photo lightbox */}
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
