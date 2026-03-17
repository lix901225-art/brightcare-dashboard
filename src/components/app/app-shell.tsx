"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_BY_ROLE, type AppRole } from "@/lib/workspace";
import { readSession } from "@/lib/session";
import { useLogout } from "@/lib/use-logout";
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

function SidebarContent({
  navItems,
  pathname,
  tenantTitle,
  tenantSub,
  userRole,
  onNavClick,
}: {
  navItems: { href: string; label: string }[];
  pathname: string;
  tenantTitle: string;
  tenantSub: string;
  userRole: string;
  onNavClick?: () => void;
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

      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                className={[
                  "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Role workspace</div>
          <div className="mt-1 text-sm font-medium text-slate-900">{userRole}</div>
        </div>
      </div>
    </>
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
            navItems={navItems}
            pathname={pathname}
            tenantTitle={tenantTitle}
            tenantSub={tenantSub}
            userRole={userRole}
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
                navItems={navItems}
                pathname={pathname}
                tenantTitle={tenantTitle}
                tenantSub={tenantSub}
                userRole={userRole}
                onNavClick={() => setMobileOpen(false)}
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
                  Logout
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
