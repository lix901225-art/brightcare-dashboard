"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Utensils, Moon, Smile, Activity, Calendar, User, Home } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { moodBadge as moodColor } from "@/lib/badge-styles";
import { PageLoadingSkeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/error";

type ReportDetail = {
  id: string;
  childId: string;
  childName?: string | null;
  className?: string | null;
  date: string;
  meals?: string | null;
  naps?: number | null;
  mood?: string | null;
  activities?: string | null;
  photosCount?: number;
};

function moodEmoji(mood?: string | null) {
  switch ((mood || "").toLowerCase()) {
    case "happy": return "😊";
    case "content": return "😌";
    case "tired": return "😴";
    case "fussy": return "😣";
    case "upset": return "😢";
    default: return "🙂";
  }
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DailyReportDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch(`/daily-reports/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `Failed: ${res.status}`);
        if (!data) throw new Error("Report not found.");
        setReport(data);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Unable to load daily report."));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div>
        <div className="mb-6">
          <Link
            href="/daily-reports"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to daily reports
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <PageLoadingSkeleton />
        ) : report ? (
          <>
            <Card className="mb-6 rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-xl">{report.childName || "Child"}&apos;s Daily Report</CardTitle>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(report.date)}
                      </span>
                      {report.className ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Home className="h-3.5 w-3.5" />
                          {report.className}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {report.childName || "Unknown"}
                      </span>
                    </div>
                  </div>
                  {report.mood ? (
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{moodEmoji(report.mood)}</span>
                      <span
                        className={[
                          "inline-flex rounded-full border px-3 py-1 text-sm font-medium",
                          moodColor(report.mood),
                        ].join(" ")}
                      >
                        {report.mood}
                      </span>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                      <Utensils className="h-4 w-4 text-amber-600" />
                    </div>
                    <CardTitle className="text-base">Meals</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {report.meals ? (
                    <div className="text-sm leading-relaxed text-slate-700">{report.meals}</div>
                  ) : (
                    <div className="text-sm text-slate-400">No meal information recorded.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                      <Moon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <CardTitle className="text-base">Naps</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-slate-900">{report.naps ?? 0}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {(report.naps ?? 0) === 0
                      ? "No naps today"
                      : (report.naps ?? 0) === 1
                      ? "1 nap today"
                      : `${report.naps} naps today`}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                      <Smile className="h-4 w-4 text-emerald-600" />
                    </div>
                    <CardTitle className="text-base">Mood</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {report.mood ? (
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{moodEmoji(report.mood)}</span>
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{report.mood}</div>
                        <div className="text-sm text-slate-500">Overall mood for the day</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">No mood recorded.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
                      <Activity className="h-4 w-4 text-sky-600" />
                    </div>
                    <CardTitle className="text-base">Activities</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {report.activities ? (
                    <div className="text-sm leading-relaxed text-slate-700">{report.activities}</div>
                  ) : (
                    <div className="text-sm text-slate-400">No activities recorded.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </RoleGate>
  );
}
