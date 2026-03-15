"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Send, X } from "lucide-react";
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
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function MessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = String(params?.threadId || "");

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
    } catch (e: any) {
      setError(e?.message || "Unable to load thread.");
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
      setOk("Message sent.");
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  const title = useMemo(() => {
    if (thread?.childName) return thread.childName;
    if (thread?.roomName) return thread.roomName;
    return "Message thread";
  }, [thread]);

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div>
        <div className="mb-4">
          <Link
            href="/messages"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to messages
          </Link>
        </div>

        <PageIntro
          title="Message thread"
          description={
            thread
              ? `Child: ${thread.childName || "—"} · Room: ${thread.roomName || "—"} · Last activity: ${fmt(thread.lastMessageAt)}`
              : "Conversation history and replies."
          }
        />

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

        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
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
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                Loading thread...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                {searchQuery ? "No messages match your search." : "No messages yet. Send the first one below!"}
              </div>
            ) : (
              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
                {filteredMessages.map((m) => {
                  const highlight = searchQuery.trim().toLowerCase();
                  const bodyText = m.body || "—";
                  return (
                    <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm font-medium text-slate-900">
                          {m.senderDisplayName || m.senderName || m.senderRole || m.senderUserId || "Sender"}
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

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Reply</CardTitle></CardHeader>
          <CardContent>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (body.trim() && !sending) sendMessage();
                }
              }}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={sendMessage}
                disabled={sending}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
