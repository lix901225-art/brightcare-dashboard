"use client";

import { ReactNode, useEffect } from "react";
import { ParentMobileNav } from "@/components/app/parent-mobile-nav";
import { PwaInstallPrompt } from "@/components/app/pwa-install-prompt";
import { SurveyReminder } from "@/components/app/survey-reminder";
import { ParentOnboarding } from "@/components/app/parent-onboarding";
import { setupOfflineSync } from "@/lib/offline-queue";

export default function ParentLayout({ children }: { children: ReactNode }) {
  // Register service worker for PWA + offline caching
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed — non-critical, app works without it
      });
    }
    setupOfflineSync();
  }, []);

  return (
    <>
      {/* Extra bottom padding on mobile to clear the fixed tab bar */}
      <div className="pb-20 lg:pb-0">{children}</div>
      <ParentMobileNav />
      <PwaInstallPrompt />
      <SurveyReminder />
      <ParentOnboarding />
    </>
  );
}
