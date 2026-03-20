"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Megaphone, Clock } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type?: string | null;
  priority?: string | null;
  createdAt: string;
  authorName: string | null;
};

const TYPE_ICON: Record<string, string> = {
  GENERAL: "📢",
  MENU_UPDATE: "🍽️",
  CURRICULUM_UPDATE: "📚",
  HOLIDAY: "🏖️",
  EMERGENCY: "🚨",
};

function typeIcon(type?: string | null) {
  return TYPE_ICON[type || ""] || "📢";
}

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ParentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : (data?.data ?? []));
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <div>
        <PageIntro
          title="Announcements"
          description="Updates from your childcare centre"
        />

        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">Loading...</div>
        ) : announcements.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <div className="text-sm font-medium text-slate-500">No announcements yet</div>
              <div className="mt-1 text-xs text-slate-400">Check back later for updates</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} className={[
                "rounded-2xl border-0 shadow-sm",
                a.priority === "HIGH" ? "ring-1 ring-rose-200" : "",
              ].join(" ")}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xl mt-0.5">{typeIcon(a.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{a.body}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeSince(a.createdAt)}
                        </span>
                        {a.authorName && <span>by {a.authorName}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
