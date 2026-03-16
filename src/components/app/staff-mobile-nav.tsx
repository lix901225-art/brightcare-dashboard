"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  ShieldAlert,
  MessageCircle,
} from "lucide-react";

const TABS = [
  { href: "/staff", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, exact: false },
  { href: "/daily-reports", label: "Reports", icon: FileText, exact: false },
  { href: "/incidents", label: "Incidents", icon: ShieldAlert, exact: false },
  { href: "/messages", label: "Messages", icon: MessageCircle, exact: false },
] as const;

/**
 * Bottom tab bar for STAFF users on mobile.
 * Surfaces the 5 most time-sensitive workflows for quick access.
 * Hidden on desktop (lg+) where the sidebar provides full navigation.
 */
export function StaffMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom lg:hidden"
      role="tablist"
      aria-label="Staff navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors touch-target",
                active
                  ? "text-slate-900"
                  : "text-slate-400 active:text-slate-600",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-5 w-5",
                  active ? "text-slate-900" : "text-slate-400",
                ].join(" ")}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
