"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, CreditCard, MessageCircle, Utensils } from "lucide-react";
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
  bathroom?: string | null;
  photoUrls?: string[] | null;
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
  const [todayMenu, setTodayMenu] = useState<{ breakfast?: string; morningSnack?: string; lunch?: string; afternoonSnack?: string } | null>(null);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [childrenRes, attendanceRes, reportsRes, threadsRes, invoicesRes, announcementsRes, menuRes] = await Promise.all([
        apiFetch("/children?myChildren=true"),
        apiFetch("/attendance"),
        apiFetch("/daily-reports"),
        apiFetch("/messages/threads"),
        apiFetch("/billing/invoices").catch(() => null),
        apiFetch("/announcements").catch(() => null),
        apiFetch(`/meal-menus?date=${today}`).catch(() => null),
      ]);

      const childrenData = await childrenRes.json();
      const attendanceData = await attendanceRes.json();
      const reportsData = await reportsRes.json();
      const threadsData = await threadsRes.json();

      setChildren(Array.isArray(childrenData) ? childrenData : (childrenData?.data ?? []));

      const todayAttendance = (Array.isArray(attendanceData) ? attendanceData : (attendanceData?.data ?? []))
        .filter((a: AttendanceRow) => !a.date || String(a.date).slice(0, 10) === today);
      setAttendance(todayAttendance);

      const allReports = Array.isArray(reportsData) ? reportsData : (reportsData?.data ?? []);
      setReports(allReports.filter((r: DailyReport) => r.date && String(r.date).slice(0, 10) === today));

      setThreads(Array.isArray(threadsData) ? threadsData : (threadsData?.data ?? []));

      if (invoicesRes?.ok) {
        const invData = await invoicesRes.json();
        setInvoices(Array.isArray(invData) ? invData : (invData?.data ?? []));
      }

      if (announcementsRes?.ok) {
        const annData = await announcementsRes.json();
        const arr = Array.isArray(annData) ? annData : (annData?.data ?? []);
        // Show recent announcements (last 7 days)
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
  }

  useEffect(() => { loadAll(); }, [today]);

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

  const unpaidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status.toUpperCase() !== "PAID" && inv.status.toUpperCase() !== "VOID" && inv.balanceAmount > 0),
    [invoices]
  );

  const recentThreads = useMemo(() => threads.slice(0, 3), [threads]);

  const handleRefresh = useCallback(async () => { await loadAll(); }, [today]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="mx-auto max-w-2xl">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          {loading ? (
            <CardListSkeleton count={3} />
          ) : (
            <div className="space-y-4">

              {/* ─── Announcements banner ─── */}
              {announcements.length > 0 && (
                <button
                  onClick={() => setExpandedAnnouncement(!expandedAnnouncement)}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-left transition-colors hover:bg-amber-100"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <span>📢</span>
                    {announcements[0].title}
                  </div>
                  {expandedAnnouncement && (
                    <div className="mt-2 space-y-2">
                      {announcements.map((a) => (
                        <div key={a.id} className="rounded-lg bg-white p-3">
                          <div className="text-sm font-medium text-slate-900">{a.title}</div>
                          {a.content && <div className="mt-1 text-xs text-slate-600">{a.content}</div>}
                          <div className="mt-1 text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              )}

              {/* ─── Children cards ─── */}
              {children.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                  <div className="text-lg font-semibold text-slate-900">Welcome!</div>
                  <div className="mt-1 text-sm text-slate-500">No children linked to your account yet. Please contact the centre.</div>
                </div>
              ) : (
                children.map((child) => {
                  const att = attendanceByChild[child.id];
                  const report = reportsByChild[child.id];
                  const status = (att?.status || "UNKNOWN").toUpperCase();
                  const isPresent = status === "PRESENT" || status === "CHECKED_IN" || status === "CHECKED_OUT";
                  const age = childAge(child.dob);

                  return (
                    <div key={child.id} className="space-y-3">
                      {/* Child header card */}
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                            {(child.fullName || "?")[0]}
                          </div>
                          <div className="flex-1">
                            <div className="text-base font-semibold text-slate-900">
                              👶 {child.fullName}{age ? <span className="ml-2 text-sm font-normal text-slate-500">{age}</span> : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {isPresent && att?.checkinAt && (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                  <Check className="h-3 w-3" /> Checked in at {fmtTime(att.checkinAt)}
                                </span>
                              )}
                              {status === "CHECKED_OUT" && att?.checkoutAt && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                  🚪 Checked out at {fmtTime(att.checkoutAt)}
                                </span>
                              )}
                              {status === "ABSENT" && (
                                <span className="text-xs text-rose-500">Absent today</span>
                              )}
                              {status === "UNKNOWN" && (
                                <span className="text-xs text-slate-400">Not checked in yet</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Allergies warning */}
                        {child.allergies && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                            <span className="text-xs font-medium text-rose-700">Allergies: {child.allergies}</span>
                          </div>
                        )}
                      </div>

                      {/* Daily report card */}
                      {report ? (
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Today&apos;s Report</div>
                          <div className="space-y-2">
                            {report.mood && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-lg">{moodEmoji(report.mood)}</span>
                                <span className="font-medium text-slate-800">{report.mood}</span>
                              </div>
                            )}
                            {report.naps != null && Number(report.naps) > 0 && (
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <span>🌙</span> Nap: {report.naps} nap{Number(report.naps) !== 1 ? "s" : ""}
                              </div>
                            )}
                            {report.meals && (
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <span>🍽️</span> {report.meals}
                              </div>
                            )}
                            {report.bathroom && (
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <span>🚽</span> {report.bathroom}
                              </div>
                            )}
                            {report.activities && (
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <span>🎨</span> {report.activities}
                              </div>
                            )}
                            {report.notes && (
                              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                                📝 {report.notes}
                              </div>
                            )}
                            {report.photoUrls && report.photoUrls.length > 0 && (
                              <div className="mt-2 flex gap-2 overflow-x-auto">
                                {report.photoUrls.slice(0, 4).map((url, i) => (
                                  <img key={i} src={url} alt="" className="h-20 w-20 rounded-xl object-cover border border-slate-200" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Today&apos;s Report</div>
                          <div className="text-sm text-slate-500">No report yet. Check back later.</div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* ─── Today's menu ─── */}
              {todayMenu && (
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-slate-900">Today&apos;s Menu</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {todayMenu.breakfast && <div><span className="text-slate-400">Breakfast:</span> <span className="text-slate-700">{todayMenu.breakfast}</span></div>}
                    {todayMenu.morningSnack && <div><span className="text-slate-400">AM Snack:</span> <span className="text-slate-700">{todayMenu.morningSnack}</span></div>}
                    {todayMenu.lunch && <div><span className="text-slate-400">Lunch:</span> <span className="text-slate-700">{todayMenu.lunch}</span></div>}
                    {todayMenu.afternoonSnack && <div><span className="text-slate-400">PM Snack:</span> <span className="text-slate-700">{todayMenu.afternoonSnack}</span></div>}
                  </div>
                </div>
              )}

              {/* ─── Recent messages ─── */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MessageCircle className="h-4 w-4" /> Messages
                  </div>
                  <Link href="/messages" className="text-xs font-medium text-slate-500 hover:text-slate-700">View all →</Link>
                </div>
                {recentThreads.length === 0 ? (
                  <div className="text-sm text-slate-400">No messages yet</div>
                ) : (
                  <div className="space-y-2">
                    {recentThreads.map((t) => (
                      <Link key={t.id} href={`/messages/${t.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 transition-colors">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                          {(t.latestSenderName || t.childName || "?")[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {t.latestSenderName || t.childName || "Centre"}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{t.latestMessage || "No messages"}</div>
                        </div>
                        {(t.unreadCount ?? 0) > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{t.unreadCount}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── Unpaid invoices ─── */}
              {unpaidInvoices.length > 0 && (
                <Link href="/parent/billing" className="block rounded-2xl bg-white p-4 shadow-sm transition-colors hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                      <CreditCard className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        💰 ${unpaidInvoices.reduce((s, i) => s + i.balanceAmount, 0).toFixed(2)} due
                      </div>
                      <div className="text-xs text-slate-500">
                        {unpaidInvoices.length} invoice{unpaidInvoices.length !== 1 ? "s" : ""} outstanding
                        {unpaidInvoices[0]?.dueDate ? ` · Due ${String(unpaidInvoices[0].dueDate).slice(0, 10)}` : ""}
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
      </PullToRefresh>
    </RoleGate>
  );
}
