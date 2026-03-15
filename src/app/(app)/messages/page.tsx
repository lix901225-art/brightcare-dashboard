"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Send, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

type Thread = {
  id: string;
  childId?: string | null;
  childName?: string | null;
  roomId?: string | null;
  roomName?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessage?: { id: string; body: string; createdAt: string } | null;
  participants?: Array<{ id?: string; displayName?: string | null; role?: string | null }>;
  unreadCount?: number;
  createdAt?: string | null;
};

type Child = {
  id: string;
  fullName?: string | null;
};

function formatTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function relativeTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [childFilter, setChildFilter] = useState("");

  const [childId, setChildId] = useState("");
  const [body, setBody] = useState("");
  const searchParams = useSearchParams();

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [threadsRes, childrenRes] = await Promise.all([
        apiFetch("/messages/threads"),
        apiFetch("/children"),
      ]);

      const threadsData = await threadsRes.json();
      const childrenData = await childrenRes.json();

      if (!threadsRes.ok) throw new Error(threadsData?.message || `Threads failed: ${threadsRes.status}`);
      if (!childrenRes.ok) throw new Error(childrenData?.message || `Children failed: ${childrenRes.status}`);

      const threadRows = Array.isArray(threadsData) ? threadsData : [];
      const childRows = Array.isArray(childrenData) ? childrenData : [];

      setThreads(threadRows);
      setChildren(childRows);

      const selectedFromUrl = searchParams.get("childId");
      if (selectedFromUrl && childRows.some((child: Child) => child.id === selectedFromUrl)) {
        setChildId(selectedFromUrl);
        setShowCompose(true);
      } else if (!childId && childRows.length > 0) {
        setChildId(childRows[0].id);
      }
    } catch (e: any) {
      setError(e?.message || "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const selected = searchParams.get("childId");
    if (selected && selected !== childId) setChildId(selected);
  }, [searchParams, childId]);

  const filteredThreads = useMemo(() => {
    let result = threads;

    if (childFilter) {
      result = result.filter((t) => t.childId === childFilter);
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((thread) =>
      [
        thread.id,
        thread.childName,
        thread.roomName,
        thread.lastMessagePreview,
        ...(thread.participants || []).map((p) => `${p.displayName || ""} ${p.role || ""}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [threads, query, childFilter]);

  const stats = useMemo(() => {
    return {
      total: threads.length,
      unread: threads.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0),
      withChildren: threads.filter((t) => t.childId).length,
    };
  }, [threads]);

  async function createThread() {
    try {
      setCreating(true);
      setError("");
      setOk("");

      if (!childId) throw new Error("Select a child.");
      if (!body.trim()) throw new Error("Message body is required.");

      const threadRes = await apiFetch("/messages/threads", {
        method: "POST",
        body: JSON.stringify({
          childId,
        }),
      });

      const threadData = await threadRes.json();
      if (!threadRes.ok) throw new Error(threadData?.message || `Create thread failed: ${threadRes.status}`);

      const threadId = threadData?.id;
      if (!threadId) throw new Error("Thread created but no thread id returned.");

      const messageRes = await apiFetch(`/messages/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: body.trim(),
        }),
      });

      const messageData = await messageRes.json();
      if (!messageRes.ok) throw new Error(messageData?.message || `Send message failed: ${messageRes.status}`);

      setOk("Conversation created.");
      setBody("");
      setShowCompose(false);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to create conversation.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Messages"
            description="Family and staff communication threads tied to children and rooms."
          />
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            {showCompose ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCompose ? "Cancel" : "New thread"}
          </button>
        </div>

        {ok ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {ok}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total threads</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.total}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Unread</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.unread}</div>
              {stats.unread > 0 ? <div className="mt-1 text-xs text-violet-600">{stats.unread} pending</div> : null}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Child-linked</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{stats.withChildren}</div></CardContent>
          </Card>
        </div>

        {showCompose ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Start conversation</CardTitle>
                <button
                  onClick={() => setShowCompose(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Child</div>
                  <select
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">Select child</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.fullName || child.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Message</div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a message to the family or internal staff group..."
                  className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                />
              </div>

              <div className="mt-4 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCompose(false);
                    setBody("");
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createThread}
                  disabled={creating}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {creating ? "Sending..." : "Create thread"}
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search thread, child, room..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <select
            value={childFilter}
            onChange={(e) => setChildFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">All children</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>{child.fullName || child.id}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {loading ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-8 text-sm text-slate-500">Loading threads...</CardContent>
            </Card>
          ) : filteredThreads.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-8 text-sm text-slate-500">No conversation threads found.</CardContent>
            </Card>
          ) : (
            filteredThreads.map((thread) => (
              <Link
                key={thread.id}
                href={`/messages/${encodeURIComponent(thread.id)}`}
                className="block rounded-2xl border-0 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-slate-900">
                          {thread.childName || "General thread"}
                        </div>
                        {thread.roomName ? (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                            {thread.roomName}
                          </span>
                        ) : null}
                        {Number(thread.unreadCount || 0) > 0 ? (
                          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                            {thread.unreadCount} unread
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1.5 text-sm text-slate-600 line-clamp-1">
                        {thread.lastMessage?.body || thread.lastMessagePreview || "No messages yet."}
                      </div>

                      {(thread.participants || []).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(thread.participants || []).slice(0, 4).map((p, idx) => (
                            <span
                              key={`${thread.id}-${idx}`}
                              className="inline-flex rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-xs text-slate-500"
                            >
                              {p.displayName || "Unknown"}
                            </span>
                          ))}
                          {(thread.participants || []).length > 4 ? (
                            <span className="inline-flex rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                              +{(thread.participants || []).length - 4} more
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs text-slate-400">
                        {relativeTime(thread.lastMessage?.createdAt || thread.lastMessageAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </RoleGate>
  );
}
