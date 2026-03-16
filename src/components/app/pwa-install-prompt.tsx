"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Smart PWA install banner — only shows when:
 * 1. The browser fires `beforeinstallprompt` (Chrome/Edge)
 * 2. The user hasn't dismissed it before (persists in localStorage)
 * 3. The app is not already in standalone mode
 */
export function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed as standalone — don't show
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // User previously dismissed
    if (localStorage.getItem("pwa-install-dismissed") === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    deferredPrompt.current = null;
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-sm animate-in slide-in-from-bottom-4 lg:bottom-6">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">
            Add BrightCare to Home Screen
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Quick access to attendance, reports & messages
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="inline-flex h-9 items-center rounded-xl bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
