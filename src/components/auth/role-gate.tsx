"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppRole, getRoleHome } from "@/lib/workspace";
import { readSession } from "@/lib/session";
import { bootstrapSessionFromBackend } from "@/lib/auth-bootstrap";

export function RoleGate({
  allow,
  children,
}: {
  allow: AppRole[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const sync = () => {
      const session = readSession();
      setRole(session?.role || null);
      setReady(true);
    };

    const boot = async () => {
      await bootstrapSessionFromBackend();
      sync();
    };

    void boot();

    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const allowed = useMemo(() => {
    if (!role) return false;
    return allow.includes(role);
  }, [allow, role]);

  useEffect(() => {
    if (!ready) return;

    if (!role) {
      router.replace("/login");
      return;
    }

    if (!allowed) {
      const target = getRoleHome(role);
      if (pathname !== target) {
        router.replace(target);
      }
    }
  }, [allowed, pathname, ready, role, router]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  if (!role || !allowed) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Redirecting...
      </div>
    );
  }

  return <>{children}</>;
}
