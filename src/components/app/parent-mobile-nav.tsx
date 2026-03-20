"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  CreditCard,
  Settings,
} from "lucide-react";

const TABS = [
  { href: "/parent", label: "Home", tKey: "nav.parentHome", icon: Home, exact: true },
  { href: "/messages", label: "Messages", tKey: "nav.messages", icon: MessageSquare, exact: false },
  { href: "/parent/billing", label: "Billing", tKey: "nav.billing", icon: CreditCard, exact: false },
  { href: "/settings", label: "Settings", tKey: "nav.settings", icon: Settings, exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function ParentMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom lg:hidden"
      role="tablist"
      aria-label="Parent navigation"
    >
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
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
