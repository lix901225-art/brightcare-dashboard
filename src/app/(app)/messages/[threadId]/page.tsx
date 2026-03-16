"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Send, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { readSession } from "@/lib/session";
import { formatDateTime } from "@/lib/api-helpers";
import { getErrorMessage } from "@/lib/error";

type Thread = {
  id: string;
  childId?: string | null;
  childName?: string | null;
  roomId?: string | null;
  roomName?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount?: number;
  participants?: Array<{ id?: string; displayName?: string | null; role?: string | null }>;
};

type MessageRow = {
  id: string;
  body?: string | null;
  createdAt?: string | null;
  senderDisplayName?: string | null;
  senderName?: string | null;
  senderRole?: string | null;
  senderUserId?: string | null;
};

function fmt(value?: string | null) {
  return formatDateTime(value);
}

function timeOnly(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dateLabel(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function senderLabel(m: MessageRow) {
  return m.senderDisplayName || m.senderName || m.senderRole || "Staff";
}

function roleBadgeClass(role?: string | null) {
  switch ((role || "").toUpperCase()) {
    case "OWNER": return "bg-violet-100 text-violet-700";
    case "STAFF": return "bg-sky-100 text-sky-700";
    case "PARENT": return "bg-emerald-100 text-emerald-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export default function MessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = String(params?.threadId || "");
  const session = readSession();
  const isParent = session?.role === "PARENT";
  const myUserId = session?.userId;

  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [body, setBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [threadsRes, messagesRes] = await Promise.all([
        apiFetch("/messages/threads"),
        apiFetch(`/messages/threads/${threadId}/messages`),
      ]);

      const threadsData = await threadsRes.json();
      const messagesData = await messagesRes.json();

      if (!threadsRes.ok) throw new Error(threadsData?.message || `Threads failed: ${threadsRes.status}`);
      if (!messagesRes.ok) throw new Error(messagesData?.message || `Messages failed: ${messagesRes.status}`);

      const threadRows = Array.isArray(threadsData) ? threadsData : [];
      const messageRows = Array.isArray(messagesData) ? messagesData : [];

      const current = threadRows.find((t: Thread) => t.id === threadId) || null;

      setThread(current);
      setMessages(messageRows);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load thread."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (threadId) loadAll();
  }, [threadId]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0 && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Auto-refresh for parents every 15s for near-realtime feel
  useEffect(() => {
    if (!isParent || !threadId) return;
    const interval = setInterval(() => {
      loadAll();
    }, 15000);
    return () => clearInterval(interval);
  }, [isParent, threadId]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.trim().toLowerCase();
    return messages.filter(
      (m) =>
        (m.body || "").toLowerCase().includes(q) ||
        (m.senderName || "").toLowerCase().includes(q) ||
        (m.senderDisplayName || "").toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Group messages by date for date separators
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: MessageRow[] }[] = [];
    let currentDate = "";
    for (const m of filteredMessages) {
      const d = m.createdAt ? new Date(m.createdAt).toDateString() : "";
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, messages: [] });
      }
      if (groups.length > 0) {
        groups[groups.length - 1].messages.push(m);
      }
    }
    return groups;
  }, [filteredMessages]);

  async function sendMessage() {
    try {
      if (!body.trim()) throw new Error("Message body is required.");
      setSending(true);
      setError("");
      setOk("");

      const res = await apiFetch(`/messages/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: body.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Send failed: ${res.status}`);

      setBody("");
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to send message."));
    } finally {
      setSending(false);
    }
  }

  const title = useMemo(() => {
    if (thread?.childName) return thread.childName;
    if (thread?.roomName) return thread.roomName;
    return "Message thread";
  }, [thread]);

  function isOwnMessage(m: MessageRow) {
    if (!myUserId) return false;
    return m.senderUserId === myUserId;
  }

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div className={isParent ? "pb-36 lg:pb-0" : "pb-20 lg:pb-0"}>
        <div className="mb-4">
          <Link
            href="/messages"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            &larr; Back to messages
          </Link>
        </div>

        {isParent ? (
          /* Parent: clean chat header */
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-900">
              {title}
            </h1>
            {thread?.participants && thread.participants.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {thread.participants.map((p, i) => (
                  <span
                    key={`${p.id || i}`}
                    className={["inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", roleBadgeClass(p.role)].join(" ")}
                  >
                    {p.displayName || p.role || "Participant"}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          /* Staff/Owner: standard admin view */
          <>
            <PageIntro
              title="Message thread"
              description={
                thread
                  ? `Child: ${thread.childName || "—"} · Room: ${thread.roomName || "—"} · Last activity: ${fmt(thread.lastMessageAt)}`
                  : "Conversation history and replies."
              }
            />

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Thread</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-semibold">{title}</div></CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Messages</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-semibold">{messages.length}</div></CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Unread</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-semibold">{Number(thread?.unreadCount || 0)}</div></CardContent>
              </Card>
            </div>
          </>
        )}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Message area */}
        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          {!isParent ? (
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Messages</CardTitle>
                <button
                  onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  title="Search messages"
                >
                  {showSearch ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                </button>
              </div>
              {showSearch && (
                <div className="mt-2 relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search within conversation…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
                    autoFocus
                  />
                  {searchQuery && (
                    <div className="mt-1 text-xs text-slate-400">
                      {filteredMessages.length} of {messages.length} messages
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
          ) : null}
          <CardContent className={isParent ? "pt-5" : ""}>
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                Loading messages...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                {searchQuery ? "No messages match your search." : "No messages yet — start the conversation below."}
              </div>
            ) : isParent ? (
              /* Parent: chat-bubble layout */
              <div className="max-h-[60vh] space-y-1 overflow-y-auto px-1 py-2">
                {groupedMessages.map((group) => (
                  <div key={group.date}>
                    <div className="my-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[11px] font-medium text-slate-400">
                        {dateLabel(group.messages[0]?.createdAt)}
                      </span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    {group.messages.map((m) => {
                      const own = isOwnMessage(m);
                      return (
                        <div
                          key={m.id}
                          className={["flex mb-2", own ? "justify-end" : "justify-start"].join(" ")}
                        >
                          <div className={[
                            "max-w-[80%] rounded-2xl px-4 py-2.5",
                            own
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-900",
                          ].join(" ")}>
                            {!own ? (
                              <div className="mb-1 flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-700">
                                  {senderLabel(m)}
                                </span>
                                {m.senderRole ? (
                                  <span className={["inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium", roleBadgeClass(m.senderRole)].join(" ")}>
                                    {m.senderRole === "OWNER" ? "Admin" : m.senderRole === "STAFF" ? "Staff" : "Parent"}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {m.body || "—"}
                            </div>
                            <div className={["mt-1 text-right text-[10px]", own ? "text-slate-400" : "text-slate-400"].join(" ")}>
                              {timeOnly(m.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            ) : (
              /* Staff/Owner: card-list layout */
              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
                {filteredMessages.map((m) => {
                  const highlight = searchQuery.trim().toLowerCase();
                  const bodyText = m.body || "—";
                  const own = isOwnMessage(m);
                  return (
                    <div key={m.id} className={["rounded-xl border p-4", own ? "border-slate-200 bg-slate-50/50" : "border-slate-200 bg-white"].join(" ")}>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {senderLabel(m)}
                          </span>
                          {m.senderRole ? (
                            <span className={["inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", roleBadgeClass(m.senderRole)].join(" ")}>
                              {m.senderRole}
                            </span>
                          ) : null}
                          {own ? (
                            <span className="text-[10px] text-slate-400">(you)</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500">{fmt(m.createdAt)}</div>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {highlight && bodyText.toLowerCase().includes(highlight) ? (
                          (() => {
                            const idx = bodyText.toLowerCase().indexOf(highlight);
                            return (
                              <>
                                {bodyText.slice(0, idx)}
                                <mark className="rounded bg-yellow-200 px-0.5">{bodyText.slice(idx, idx + highlight.length)}</mark>
                                {bodyText.slice(idx + highlight.length)}
                              </>
                            );
                          })()
                        ) : bodyText}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desktop: card-based reply. Mobile: sticky chat-style composer */}
        <div className="hidden lg:block">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>{isParent ? "Send a message" : "Reply"}</CardTitle></CardHeader>
            <CardContent>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (body.trim() && !sending) sendMessage();
                  }
                }}
                placeholder={isParent ? "Type your message…" : "Type a message… (Enter to send, Shift+Enter for new line)"}
                className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={sendMessage}
                  disabled={sending || !body.trim()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile: sticky bottom composer — raised above parent bottom nav */}
        <div className={[
          "fixed inset-x-0 z-20 border-t border-slate-200 bg-white p-3 lg:hidden",
          isParent ? "bottom-16" : "bottom-0 safe-bottom",
        ].join(" ")}>
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (body.trim() && !sending) sendMessage();
                }
              }}
              placeholder="Type a message…"
              rows={1}
              className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !body.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
