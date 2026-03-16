"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Send, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { readSession } from "@/lib/session";
import { relativeTime } from "@/lib/api-helpers";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

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

export default function MessagesPage() {
  const session = readSession();
  const isParent = session?.role === "PARENT";

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
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load messages."));
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
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create conversation."));
    } finally {
      setCreating(false);
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div>
        {isParent ? (
          <div className="mb-4">
            <Link href="/parent" className="text-sm text-slate-500 hover:text-slate-700">
              &larr; Back to parent home
            </Link>
          </div>
        ) : null}

        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Messages"
            description={isParent
              ? "Messages between you and your child\u2019s centre."
              : "Family and staff communication threads tied to children and rooms."
            }
          />
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            {showCompose ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCompose ? "Cancel" : isParent ? "New message" : "New thread"}
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

        {isParent ? (
          stats.unread > 0 ? (
            <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
              <p className="text-sm font-medium text-violet-800">
                You have {stats.unread} unread {stats.unread === 1 ? "message" : "messages"} from your centre.
              </p>
            </div>
          ) : null
        ) : (
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
        )}

        {showCompose ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{isParent ? "Send a message" : "Start conversation"}</CardTitle>
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
                {/* Hide child selector for parents with only 1 child */}
                {isParent && children.length === 1 ? (
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">About</div>
                    <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                      {children[0].fullName || "Your child"}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{isParent ? "About" : "Child"}</div>
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
                )}
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Message</div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={5000}
                  placeholder={isParent ? "Write a message to your child\u2019s centre..." : "Write a message to the family or internal staff group..."}
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
                  {creating ? "Sending..." : isParent ? "Send" : "Create thread"}
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Search & filter — staff/owner only */}
        {!isParent ? (
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
        ) : children.length > 1 ? (
          <div className="mb-6">
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
        ) : null}

        <div className="space-y-3">
          {loading ? (
            <CardListSkeleton count={4} />
          ) : filteredThreads.length === 0 ? (
            isParent ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
                <div className="text-sm text-slate-500">No conversations yet</div>
                <div className="mt-1 text-xs text-slate-400">Tap &ldquo;New message&rdquo; to start a conversation with your centre</div>
              </div>
            ) : (
              <FilteredEmptyState
                totalCount={threads.length}
                filterLabel="search"
              />
            )
          ) : isParent ? (
            /* Parent: clean conversation list */
            filteredThreads.map((thread) => {
              const hasUnread = Number(thread.unreadCount || 0) > 0;
              return (
                <Link
                  key={thread.id}
                  href={`/messages/${encodeURIComponent(thread.id)}`}
                  className={[
                    "block rounded-2xl bg-white transition hover:shadow-md",
                    hasUnread ? "shadow-md ring-1 ring-violet-100" : "shadow-sm",
                  ].join(" ")}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {hasUnread ? (
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" />
                          ) : null}
                          <span className={["text-sm", hasUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"].join(" ")}>
                            {thread.childName || "Conversation"}
                          </span>
                        </div>
                        <div className={["mt-1 text-sm line-clamp-1", hasUnread ? "text-slate-700" : "text-slate-500"].join(" ")}>
                          {thread.lastMessage?.body || thread.lastMessagePreview || "No messages yet"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-slate-400">
                          {relativeTime(thread.lastMessage?.createdAt || thread.lastMessageAt)}
                        </div>
                        {hasUnread ? (
                          <span className="mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-semibold text-white">
                            {thread.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            /* Staff/Owner: full admin thread list */
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
