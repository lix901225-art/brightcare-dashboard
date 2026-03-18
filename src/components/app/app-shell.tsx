"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronDown, Menu, X } from "lucide-react";
import { NAV_BY_ROLE, NAV_GROUPS_BY_ROLE, type AppRole, type NavItem, type NavGroup } from "@/lib/workspace";
import { useLocale } from "@/lib/use-locale";
import { readSession } from "@/lib/session";
import { useLogout } from "@/lib/use-logout";
import { apiFetch } from "@/lib/api-client";
import { StaffMobileNav } from "@/components/app/staff-mobile-nav";

type ShellSession = {
  role: AppRole;
  displayName: string;
  tenantName: string;
  tenantId: string;
};

const FALLBACK_SESSION: ShellSession = {
  role: "STAFF",
  displayName: "User",
  tenantName: "Workspace",
  tenantId: "",
};

function getInitials(name: string) {
  const clean = (name || "").trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function readSessionFromStorage(): ShellSession {
  const session = readSession();
  if (!session) return FALLBACK_SESSION;

  return {
    role: session.role,
    displayName: session.displayName,
    tenantName: session.tenantName,
    tenantId: session.tenantId,
  };
}

export function PageIntro({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

function NavLink({ item, pathname, onNavClick, t }: { item: NavItem; pathname: string; onNavClick?: () => void; t: (key: string) => string }) {
  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
  return (
    <Link
      href={item.href}
      onClick={onNavClick}
      className={[
        "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      ].join(" ")}
    >
      {item.tKey ? t(item.tKey) : item.label}
    </Link>
  );
}

function CollapsibleGroup({ group, pathname, onNavClick, t }: { group: NavGroup; pathname: string; onNavClick?: () => void; t: (key: string) => string }) {
  const hasActiveChild = group.items.some(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
  );
  const [open, setOpen] = useState(hasActiveChild);

  // Auto-expand when navigating into this group
  useEffect(() => {
    if (hasActiveChild && !open) setOpen(true);
  }, [hasActiveChild]);

  const label = group.tKey ? t(group.tKey) : (group.title || "");

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        <span>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavClick={onNavClick} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  navGroups,
  pathname,
  tenantTitle,
  tenantSub,
  userRole,
  onNavClick,
  t,
}: {
  navGroups: NavGroup[];
  pathname: string;
  tenantTitle: string;
  tenantSub: string;
  userRole: string;
  onNavClick?: () => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="border-b border-slate-200 px-5 py-5">
        <Link href="/workspace" className="flex items-center gap-3" onClick={onNavClick}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
            BC
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-950">BrightCare OS</div>
            <div className="truncate text-xs text-slate-500">Multi-tenant daycare SaaS</div>
          </div>
        </Link>
      </div>

      <div className="border-b border-slate-200 px-4 py-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="truncate text-sm font-medium text-slate-900">{tenantTitle}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{tenantSub}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-4">
          {navGroups.map((group, gi) => {
            if (group.collapsible && group.title) {
              return <CollapsibleGroup key={group.title} group={group} pathname={pathname} onNavClick={onNavClick} t={t} />;
            }
            return (
              <div key={gi} className="space-y-0.5">
                {group.title && (
                  <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {group.tKey ? t(group.tKey) : group.title}
                  </div>
                )}
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onNavClick={onNavClick} t={t} />
                ))}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Role workspace</div>
          <div className="mt-1 text-sm font-medium text-slate-900">{t(`roles.${userRole}`)}</div>
        </div>
      </div>
    </>
  );
}

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  async function loadCount() {
    try {
      const res = await apiFetch("/notifications/unread-count");
      if (res.ok) {
        const count = await res.json();
        setUnread(typeof count === "number" ? count : 0);
      }
    } catch { /* silent */ }
  }

  async function loadItems() {
    try {
      const res = await apiFetch("/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data.slice(0, 10) : []);
        setLoaded(true);
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  function handleOpen() {
    setOpen((v) => {
      if (!v && !loaded) loadItems();
      return !v;
    });
  }

  async function markRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await apiFetch("/notifications/read-all", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications</div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.isRead && markRead(n.id)}
                    className={[
                      "flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50",
                      n.isRead ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    {!n.isRead && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                    <div className={n.isRead ? "pl-5" : ""}>
                      <div className="text-sm font-medium text-slate-900">{n.title}</div>
                      {n.body ? <div className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.body}</div> : null}
                      <div className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<ShellSession>(FALLBACK_SESSION);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- hydration safety
    setSession(readSessionFromStorage());

    let timer: ReturnType<typeof setTimeout>;
    const debouncedSync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setSession(readSessionFromStorage()), 300);
    };

    window.addEventListener("storage", debouncedSync);
    window.addEventListener("focus", debouncedSync);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", debouncedSync);
      window.removeEventListener("focus", debouncedSync);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- intentional: close menu on nav
  }, [pathname]);

  const navItems = useMemo(() => NAV_BY_ROLE[session.role] || NAV_BY_ROLE.OWNER, [session.role]);
  const navGroups = useMemo(() => NAV_GROUPS_BY_ROLE[session.role] || NAV_GROUPS_BY_ROLE.OWNER, [session.role]);

  const { t } = useLocale();
  const logout = useLogout();

  const tenantTitle = mounted ? session.tenantName || "Workspace" : "Workspace";
  const tenantSub = mounted ? session.tenantId || "No tenant selected" : "Loading workspace...";
  const userTitle = mounted ? session.displayName : "User";
  const userRole = mounted ? session.role : "STAFF";
  const userInitials = mounted ? getInitials(session.displayName) : "U";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <SidebarContent
            navGroups={navGroups}
            pathname={pathname}
            tenantTitle={tenantTitle}
            tenantSub={tenantSub}
            userRole={userRole}
            t={t}
          />
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative flex h-full w-72 flex-col bg-white shadow-xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                navGroups={navGroups}
                pathname={pathname}
                tenantTitle={tenantTitle}
                tenantSub={tenantSub}
                userRole={userRole}
                onNavClick={() => setMobileOpen(false)}
                t={t}
              />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 lg:h-20 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <div className="text-lg font-semibold text-slate-950 lg:text-xl">{tenantTitle}</div>
                  <div className="hidden text-sm text-slate-500 sm:block">Childcare management platform</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {mounted && <NotificationBell />}

                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium text-slate-900">{userTitle}</div>
                  <div className="text-xs text-slate-500">{userRole}</div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                  {userInitials}
                </div>

                <button
                  onClick={logout}
                  className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t("auth.logout")}
                </button>
              </div>
            </div>
          </header>

          <main className={[
            "flex-1 px-4 py-6 lg:px-8 lg:py-8",
            mounted && session.role === "STAFF" ? "pb-24 lg:pb-8" : "",
          ].join(" ")}>
            {children}
          </main>

          {/* Staff bottom tab bar on mobile */}
          {mounted && session.role === "STAFF" ? <StaffMobileNav /> : null}
        </div>
      </div>
    </div>
  );
}
