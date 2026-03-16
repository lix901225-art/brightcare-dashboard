"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { bootstrapSessionFromBackend } from "@/lib/auth-bootstrap";
import { readSession } from "@/lib/session";

export function AppAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const bootedRef = useRef(false);
  const redirectingRef = useRef(false);

  const redirectToLogin = useCallback(() => {
    if (redirectingRef.current || pathname === "/login") return;
    redirectingRef.current = true;
    router.replace("/login");
  }, [pathname, router]);

  useEffect(() => {
    let alive = true;

    const boot = async () => {
      try {
        const bootstrapped = await bootstrapSessionFromBackend();
        const session = bootstrapped || readSession();

        if (!alive) return;

        if (!session?.userId || !session?.tenantId) {
          setAllowed(false);
          setReady(true);
          redirectToLogin();
          return;
        }

        setAllowed(true);
        setReady(true);
        bootedRef.current = true;
      } catch {
        if (!alive) return;
        setAllowed(false);
        setReady(true);
        redirectToLogin();
      }
    };

    void boot();

    const sync = () => {
      // Don't process sync events until boot completes
      if (!bootedRef.current) return;

      const session = readSession();

      if (!session?.userId || !session?.tenantId) {
        setAllowed(false);
        redirectToLogin();
        return;
      }

      setAllowed(true);
      redirectingRef.current = false;
    };

    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      alive = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [pathname, router, redirectToLogin]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-2xl font-semibold tracking-tight text-slate-950">
            BrightCare OS
          </div>
          <div className="mt-3 text-sm text-slate-500">
            Checking workspace access...
          </div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-2xl font-semibold tracking-tight text-slate-950">
            Redirecting to login...
          </div>
          <div className="mt-3 text-sm text-slate-500">
            Your session is missing or expired.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
