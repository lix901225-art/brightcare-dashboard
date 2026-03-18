"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, User, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

type SearchResult = {
  type: "child" | "guardian" | "staff";
  id: string;
  name: string;
  detail?: string;
  href: string;
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const q = query.trim().toLowerCase();
      const items: SearchResult[] = [];

      try {
        // Search children
        const childRes = await apiFetch("/children");
        if (childRes.ok) {
          const children = await childRes.json();
          const arr = Array.isArray(children) ? children : [];
          for (const c of arr) {
            if ((c.fullName || "").toLowerCase().includes(q) || (c.preferredName || "").toLowerCase().includes(q)) {
              items.push({ type: "child", id: c.id, name: c.fullName || c.id, detail: c.status, href: `/children/${c.id}` });
            }
          }
        }

        // Search staff/users (via admin endpoint)
        const staffRes = await apiFetch("/admin/users").catch(() => null);
        if (staffRes?.ok) {
          const users = await staffRes.json();
          const arr = Array.isArray(users) ? users : [];
          for (const u of arr) {
            if ((u.displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || (u.phone || "").toLowerCase().includes(q)) {
              const role = u.roles?.[0]?.role?.key || u.role || "";
              items.push({ type: role === "PARENT" ? "guardian" : "staff", id: u.id, name: u.displayName || u.email || u.id, detail: role, href: `/staff-management` });
            }
          }
        }
      } catch {}

      setResults(items.slice(0, 10));
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  const iconFor = (type: string) => {
    if (type === "child") return <Users className="h-4 w-4 text-sky-500" />;
    if (type === "guardian") return <User className="h-4 w-4 text-emerald-500" />;
    return <User className="h-4 w-4 text-violet-500" />;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 sm:inline-flex"
        title="Search (Cmd+K)"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[15vh]" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-4">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search children, parents, staff..."
                className="h-14 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); }}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            {results.length > 0 && (
              <div className="max-h-80 overflow-y-auto p-2">
                {results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => navigate(r.href)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
                  >
                    {iconFor(r.type)}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">{r.name}</div>
                      {r.detail && <div className="truncate text-xs text-slate-400">{r.detail}</div>}
                    </div>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 capitalize">{r.type}</span>
                  </button>
                ))}
              </div>
            )}

            {query && results.length === 0 && !loading && (
              <div className="p-6 text-center text-sm text-slate-400">No results found</div>
            )}

            {loading && (
              <div className="p-6 text-center text-sm text-slate-400">Searching...</div>
            )}

            {!query && (
              <div className="p-6 text-center text-sm text-slate-400">
                Type to search children, parents, or staff members
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
