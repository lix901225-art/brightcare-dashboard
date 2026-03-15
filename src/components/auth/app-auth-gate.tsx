"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { bootstrapSessionFromBackend } from "@/lib/auth-bootstrap";
import { readSession } from "@/lib/session";
import { getRoleHome } from "@/lib/workspace";

export function AppAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;

    const boot = async () => {
      const bootstrapped = await bootstrapSessionFromBackend();
      const session = bootstrapped || readSession();

      if (!alive) return;

      if (!session?.userId || !session?.tenantId) {
        setAllowed(false);
        setReady(true);
        if (pathname !== "/login") {
          router.replace("/login");
        }
        return;
      }

      setAllowed(true);
      setReady(true);
    };

    void boot();

    const sync = async () => {
      const session = readSession();

      if (!session?.userId || !session?.tenantId) {
        setAllowed(false);
        if (pathname !== "/login") {
          router.replace("/login");
        }
        return;
      }

      setAllowed(true);
    };

    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      alive = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [pathname, router]);

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
