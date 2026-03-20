"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { PullToRefresh } from "@/components/app/pull-to-refresh";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { MetricCardsSkeleton, CardListSkeleton } from "@/components/ui/skeleton";
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
  status?: string | null;
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
  body?: string | null;
  content?: string | null;
  type?: string | null;
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
  if (!raw) return "—";
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  let total = 0, count = 0;
  const levels: Record<string, number> = { all: 3, most: 2, some: 1, little: 0, none: 0, refused: 0 };
  for (const p of parts) {
    const idx = p.indexOf(":");
    if (idx > 0) { total += levels[p.slice(idx + 1).trim().toLowerCase()] ?? 1; count++; }
  }
  if (count === 0) return "—";
  const avg = total / count;
  if (avg >= 2.5) return "Ate everything 😋";
  if (avg >= 1.5) return "Ate well 👍";
  if (avg >= 0.5) return "Light appetite";
  return "Didn't eat much";
}

type TodayMenu = { breakfast?: string; morningSnack?: string; lunch?: string; afternoonSnack?: string };

type NapLog = {
  id: string;
  childId: string;
  startAt: string;
  endAt?: string | null;
  duration?: number | null; // minutes
};

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
  const [todayMenu, setTodayMenu] = useState<TodayMenu | null>(null);
  const [napLogs, setNapLogs] = useState<NapLog[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [childrenRes, attendanceRes, reportsRes, threadsRes, invoicesRes, announcementsRes, weekMenuRes, todayMenuRes, napLogsRes] = await Promise.all([
        apiFetch("/children?myChildren=true"),
        apiFetch("/attendance").catch(() => null),
        apiFetch("/daily-reports").catch(() => null),
        apiFetch("/messages/threads").catch(() => null),
        apiFetch("/billing/invoices").catch(() => null),
        apiFetch("/announcements").catch(() => null),
        apiFetch(`/meal-menus/week?date=${today}`).catch(() => null),
        apiFetch(`/meal-menus?date=${today}`).catch(() => null),
        apiFetch(`/nap-logs?date=${today}`).catch(() => null),
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
        if (d?.menus && Array.isArray(d.menus)) setWeekMenus(d.menus);
      }
      if (todayMenuRes?.ok) {
        const d = await todayMenuRes.json();
        if (d && (d.breakfast || d.lunch || d.morningSnack || d.afternoonSnack)) setTodayMenu(d);
      }
      if (napLogsRes?.ok) {
        const d = await napLogsRes.json();
        setNapLogs(Array.isArray(d) ? d : []);
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
  const latestThreads = useMemo(() => threads.slice(0, 3), [threads]);

  // Use first child for metrics (most parents have 1 child)
  const child = children[0] || null;
  const att = child ? attByChild[child.id] : null;
  const report = child ? reportByChild[child.id] : null;
  const displayName = child ? (child.preferredName || child.fullName || "Child") : "";
  const age = childAge(child?.dob);
  const status = (att?.status || "UNKNOWN").toUpperCase();
  const isIn = status === "PRESENT" || status === "CHECKED_IN";
  const isOut = status === "CHECKED_OUT";
  const childNaps = useMemo(() => child ? napLogs.filter((n) => n.childId === child.id && n.endAt) : [], [napLogs, child]);
  const meals = mealsSummary(report?.meals);
  const hasPhotos = (report?.photoUrls || []).length > 0;
  const reportStatus = report?.status?.toUpperCase() === "SENT" ? "✅ Sent" : report ? "✏️ Being prepared" : "—";

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <PullToRefresh onRefresh={loadAll}>
        <div>
          <PageIntro
            title={`Welcome back${displayName ? `, ${displayName}'s family` : ""}`}
            description={new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          />

          {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          {/* ─── Unpaid invoice banner ─── */}
          {!loading && unpaid.length > 0 && (
            <Link href="/parent/billing" className="mb-6 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 transition-colors hover:bg-orange-100">
              <span className="text-xl">💰</span>
              <div className="flex-1 text-sm">
                <span className="font-semibold text-orange-800">${unpaid.reduce((s, i) => s + i.balanceAmount, 0).toFixed(2)}</span>
                <span className="text-orange-700"> due {unpaid[0]?.dueDate ? fmtDate(unpaid[0].dueDate) : "soon"}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-400" />
            </Link>
          )}

          {loading ? (
            <div className="space-y-6">
              <MetricCardsSkeleton count={4} />
              <CardListSkeleton count={2} />
            </div>
          ) : children.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <div className="text-5xl mb-4">👋</div>
                <div className="text-lg font-semibold text-slate-900">Welcome!</div>
                <div className="mt-1 text-sm text-slate-500">No children linked yet. Contact your centre.</div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ════════ Child Profile Card (TOP) ════════ */}
              <Card className="rounded-2xl border-0 shadow-sm mb-6">
                <CardContent className="py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 text-2xl font-bold text-white">
                      {displayName[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl font-bold text-slate-900">{displayName}</div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {[age, child?.className].filter(Boolean).join(" · ")}
                      </div>
                      <div className="mt-2">
                        {isOut && att?.checkinAt && att?.checkoutAt ? (
                          <div className="text-sm text-slate-600">
                            ✅ Checked in at {fmtTime(att.checkinAt)} → 🚪 Checked out at {fmtTime(att.checkoutAt)}
                          </div>
                        ) : isIn && att?.checkinAt ? (
                          <div className="text-sm text-emerald-600 font-medium">✅ Checked in at {fmtTime(att.checkinAt)}</div>
                        ) : status === "ABSENT" ? (
                          <div className="text-sm text-rose-500 font-medium">❌ Absent today</div>
                        ) : (
                          <div className="text-sm text-slate-400">⏰ Not checked in yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                  {child?.allergies && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-medium text-orange-700">
                      ⚠️ Allergies: {child.allergies}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ════════ Metric Cards Row ════════ */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Mood</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl">{report?.mood ? moodEmoji(report.mood) : "—"}</div>
                    <div className="mt-1 text-sm font-medium text-slate-800 capitalize">{report?.mood || "No data"}</div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Nap</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl">🌙</div>
                    {childNaps.length > 0 ? (
                      <div className="mt-1 space-y-0.5">
                        {childNaps.map((n) => {
                          const mins = n.duration ?? Math.round((new Date(n.endAt!).getTime() - new Date(n.startAt).getTime()) / 60000);
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          return (
                            <div key={n.id} className="text-sm font-medium text-slate-800">
                              {fmtTime(n.startAt)} – {fmtTime(n.endAt)} <span className="text-slate-400 font-normal">({h > 0 ? `${h}h ` : ""}{m}min)</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm font-medium text-slate-800">No nap</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Meals</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl">🍽️</div>
                    <div className="mt-1 text-sm font-medium text-slate-800">{meals}</div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Report</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl">📋</div>
                    <div className="mt-1 text-sm font-medium text-slate-800">{reportStatus}</div>
                  </CardContent>
                </Card>
              </div>

              {/* ════════ Today's Report ════════ */}
              <Card className="rounded-2xl border-0 shadow-sm mb-6">
                <CardHeader>
                  <CardTitle>Today&apos;s Report</CardTitle>
                </CardHeader>
                <CardContent>
                  {report?.aiNarrative ? (
                    <div>
                      <p className="text-base leading-relaxed text-slate-700">{report.aiNarrative}</p>
                      {hasPhotos && (
                        <div className="mt-4">
                          {report.photoUrls!.length === 1 ? (
                            <button onClick={() => setLightboxUrl(report.photoUrls![0])} className="w-full">
                              <img src={report.photoUrls![0]} alt="" className="w-full rounded-xl object-cover aspect-[16/9]" />
                            </button>
                          ) : (
                            <div className="flex gap-2 overflow-x-auto snap-x pb-1">
                              {report.photoUrls!.map((url, i) => (
                                <button key={i} onClick={() => setLightboxUrl(url)} className="shrink-0 snap-start">
                                  <img src={url} alt="" className="h-44 w-36 rounded-xl object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : report ? (
                    <div>
                      {report.notes && <p className="text-sm text-slate-600 italic leading-relaxed">&ldquo;{report.notes}&rdquo;</p>}
                      {!report.notes && <div className="text-sm text-slate-400">Report received — summary details are in the cards above.</div>}
                      {hasPhotos && (
                        <div className="mt-4 flex gap-2 overflow-x-auto snap-x pb-1">
                          {report.photoUrls!.map((url, i) => (
                            <button key={i} onClick={() => setLightboxUrl(url)} className="shrink-0 snap-start">
                              <img src={url} alt="" className="h-44 w-36 rounded-xl object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <div className="text-3xl mb-2">☀️</div>
                      <div className="text-sm font-medium text-slate-600">No report yet — check back later!</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ════════ Two-column: Messages + Weekly Menu ════════ */}
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                {/* Messages */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Messages</CardTitle>
                      <Link href="/messages" className="text-xs font-medium text-indigo-500 hover:text-indigo-700">View all →</Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {latestThreads.length === 0 ? (
                      <div className="text-sm text-slate-400">No messages yet</div>
                    ) : (
                      <div className="space-y-2">
                        {latestThreads.map((t) => (
                          <Link key={t.id} href={`/messages/${t.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 transition-colors -mx-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                              {(t.latestSenderName || t.childName || "?")[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-slate-900 truncate">{t.latestSenderName || t.childName || "Centre"}</div>
                              <div className="text-xs text-slate-500 truncate">{t.latestMessage || "No messages"}</div>
                            </div>
                            {(t.unreadCount ?? 0) > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{t.unreadCount}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly menu or Announcements */}
                {weekMenus.length > 0 ? (
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader><CardTitle>This Week&apos;s Menu</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {weekMenus.map((m) => {
                          const day = new Date(m.date).toLocaleDateString([], { weekday: "short" });
                          const items = [m.breakfast, m.lunch, m.afternoonSnack].filter(Boolean).join("  ·  ");
                          return items ? (
                            <div key={m.date} className="flex gap-2 text-sm">
                              <span className="w-9 shrink-0 font-medium text-slate-500">{day}</span>
                              <span className="text-slate-700 truncate">{items}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : announcements.length > 0 ? (
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Announcements</CardTitle>
                        <Link href="/parent/announcements" className="text-xs font-medium text-indigo-500 hover:text-indigo-700">View all →</Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {announcements.map((a) => {
                          const icon = a.type === "MENU_UPDATE" ? "🍽️" : a.type === "CURRICULUM_UPDATE" ? "📚" : a.type === "EMERGENCY" ? "🚨" : a.type === "HOLIDAY" ? "🏖️" : "📢";
                          const text = a.body || a.content;
                          return (
                            <div key={a.id} className="flex items-start gap-2">
                              <span className="text-sm mt-0.5">{icon}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900">{a.title}</div>
                                {text && <div className="mt-0.5 text-xs text-slate-500 line-clamp-2">{text}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              {/* ════════ Today's Menu ════════ */}
              {todayMenu && (
                <Card className="rounded-2xl border-0 shadow-sm mb-6">
                  <CardHeader><CardTitle>Today&apos;s Menu</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-slate-700">
                      {todayMenu.breakfast && <div>🌅 <span className="text-slate-500">Breakfast:</span> {todayMenu.breakfast}</div>}
                      {todayMenu.morningSnack && <div>🍎 <span className="text-slate-500">AM Snack:</span> {todayMenu.morningSnack}</div>}
                      {todayMenu.lunch && <div>🍱 <span className="text-slate-500">Lunch:</span> {todayMenu.lunch}</div>}
                      {todayMenu.afternoonSnack && <div>🍪 <span className="text-slate-500">PM Snack:</span> {todayMenu.afternoonSnack}</div>}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Multi-child: show additional children */}
              {children.length > 1 && children.slice(1).map((c) => {
                const cAtt = attByChild[c.id];
                const cReport = reportByChild[c.id];
                const cStatus = (cAtt?.status || "UNKNOWN").toUpperCase();
                const cName = c.preferredName || c.fullName || "Child";

                return (
                  <Card key={c.id} className="rounded-2xl border-0 shadow-sm mb-4">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 text-sm font-bold text-white">
                          {cName[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">{cName}</div>
                          <div className="text-xs text-slate-500">{childAge(c.dob)}</div>
                        </div>
                        <div className="text-xs text-slate-500">
                          {cStatus === "CHECKED_IN" || cStatus === "PRESENT" ? "✅ Checked in" :
                           cStatus === "CHECKED_OUT" ? "🚪 Checked out" :
                           cStatus === "ABSENT" ? "❌ Absent" : "⏰ Not in"}
                        </div>
                      </div>
                      {cReport?.aiNarrative && (
                        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{cReport.aiNarrative}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
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
