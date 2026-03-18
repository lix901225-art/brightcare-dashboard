"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Megaphone, Trash2, X, Send, Clock } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { apiFetch } from "@/lib/api-client";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { readSession } from "@/lib/session";

type Announcement = {
  id: string;
  title: string;
  body: string;
  priority?: string | null;
  audience?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  authorName: string | null;
  authorId: string | null;
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [audience, setAudience] = useState("ALL");
  const [expiresAt, setExpiresAt] = useState("");
  const [sending, setSending] = useState(false);

  const session = readSession();
  const role = session?.role ?? "PARENT";
  const canCreate = role === "OWNER" || role === "STAFF";

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/announcements");
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

  async function handleCreate() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      await apiFetch("/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          priority,
          audience,
          expiresAt: expiresAt || undefined,
        }),
      });
      setTitle("");
      setBody("");
      setPriority("NORMAL");
      setAudience("ALL");
      setExpiresAt("");
      setShowCreate(false);
      await load();
    } catch {
      /* empty */
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement? This cannot be undone.")) return;
    try {
      await apiFetch(`/announcements/${id}`, { method: "DELETE" });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      /* empty */
    }
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageIntro
          title="Announcements"
          description="Broadcast messages to all parents and staff."
        />
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New announcement
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              New Announcement
            </h2>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Spring Break Schedule Update"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Write your announcement here..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High (pinned, red highlight)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Audience</label>
                <select value={audience} onChange={(e) => setAudience(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                  <option value="ALL">Everyone</option>
                  <option value="PARENTS">Parents only</option>
                  <option value="STAFF">Staff only</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Expires (optional)</label>
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={sending || !title.trim() || !body.trim()}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending…" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {loading ? (
        <CardListSkeleton count={3} />
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border-0 bg-white p-12 text-center shadow-sm">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            No announcements yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {canCreate
              ? "Create one to broadcast to all parents and staff"
              : "Check back later for updates from your center"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={["rounded-2xl border-0 p-5 shadow-sm", a.priority === "HIGH" ? "bg-rose-50 ring-1 ring-rose-200" : "bg-white"].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={["mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", a.priority === "HIGH" ? "bg-rose-100" : "bg-blue-50"].join(" ")}>
                    <Megaphone className={["h-4 w-4", a.priority === "HIGH" ? "text-rose-600" : "text-blue-600"].join(" ")} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {a.title}
                      </h3>
                      {a.priority === "HIGH" && <span className="inline-flex rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">URGENT</span>}
                      {a.audience && a.audience !== "ALL" && <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">{a.audience === "PARENTS" ? "Parents only" : "Staff only"}</span>}
                    </div>
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
                {role === "OWNER" && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                    title="Delete announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
