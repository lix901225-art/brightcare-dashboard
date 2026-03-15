"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  authorName: string | null;
};

export default function ParentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/messages/announcements");
      if (res.ok) setAnnouncements(await res.json());
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Updates from your childcare center
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">
          Loading…
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border-0 bg-white p-12 text-center shadow-sm">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            No announcements yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Check back later for updates from your center
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border-0 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {a.title}
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {a.body}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeSince(a.createdAt)}
                    </span>
                    {a.authorName && (
                      <span className="text-slate-500">
                        by {a.authorName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
