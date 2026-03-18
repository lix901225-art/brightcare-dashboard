"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Home,
  CalendarCheck,
  FileText,
  CreditCard,
  MoreHorizontal,
  AlertTriangle,
  Megaphone,
  FileCheck,
  X,
} from "lucide-react";
import { useLocale } from "@/lib/use-locale";

const TABS = [
  { href: "/parent", label: "Home", tKey: "nav.parentHome", icon: Home, exact: true },
  { href: "/parent/attendance", label: "Attendance", tKey: "nav.attendance", icon: CalendarCheck, exact: false },
  { href: "/daily-reports", label: "Reports", tKey: "nav.dailyReports", icon: FileText, exact: false },
  { href: "/parent/billing", label: "Billing", tKey: "nav.billing", icon: CreditCard, exact: false },
] as const;

const MORE_ITEMS = [
  { href: "/messages", label: "Messages", tKey: "nav.messages", icon: FileText },
  { href: "/parent/incidents", label: "Incidents", tKey: "nav.incidents", icon: AlertTriangle },
  { href: "/parent/announcements", label: "Announcements", tKey: "nav.announcements", icon: Megaphone },
  { href: "/policies", label: "Policies", tKey: "nav.policies", icon: FileCheck },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

/**
 * Bottom tab bar shown on mobile for parent users.
 * 4 primary tabs + "More" flyout for secondary pages.
 * Hidden on desktop (lg+) where the sidebar provides navigation.
 */
export function ParentMobileNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setMoreOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- intentional: close menu on nav
  }, [pathname]);

  // Close on outside tap
  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  const moreActive = MORE_ITEMS.some((item) =>
    isActive(pathname, item.href, false)
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom lg:hidden"
      role="tablist"
      aria-label="Parent navigation"
    >
      {/* More flyout */}
      {moreOpen && (
        <div
          ref={moreRef}
          className="absolute bottom-full left-0 right-0 border-t border-slate-200 bg-white shadow-lg"
        >
          <div className="mx-auto max-w-lg px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MORE_ITEMS.map((item) => {
                const active = isActive(pathname, item.href, false);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <Icon className={["h-4 w-4", active ? "text-slate-900" : "text-slate-400"].join(" ")} />
                    {t(item.tKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-lg items-stretch">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href, tab.exact);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors touch-target",
                active ? "text-slate-900" : "text-slate-400 active:text-slate-600",
              ].join(" ")}
            >
              <Icon
                className={["h-5 w-5", active ? "text-slate-900" : "text-slate-400"].join(" ")}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span>{t(tab.tKey)}</span>
            </Link>
          );
        })}

        {/* More tab */}
        <button
          role="tab"
          aria-selected={moreActive}
          onClick={() => setMoreOpen((prev) => !prev)}
          className={[
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors touch-target",
            moreActive || moreOpen ? "text-slate-900" : "text-slate-400 active:text-slate-600",
          ].join(" ")}
        >
          <MoreHorizontal
            className={["h-5 w-5", moreActive || moreOpen ? "text-slate-900" : "text-slate-400"].join(" ")}
            strokeWidth={moreActive || moreOpen ? 2.2 : 1.8}
          />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
