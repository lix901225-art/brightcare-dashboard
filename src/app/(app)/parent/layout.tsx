"use client";

import { ReactNode, useEffect } from "react";
import { ParentMobileNav } from "@/components/app/parent-mobile-nav";

export default function ParentLayout({ children }: { children: ReactNode }) {
  // Register service worker for PWA installability
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed — non-critical, app works without it
      });
    }
  }, []);

  return (
    <>
      {/* Extra bottom padding on mobile to clear the fixed tab bar */}
      <div className="pb-20 lg:pb-0">{children}</div>
      <ParentMobileNav />
    </>
  );
}
