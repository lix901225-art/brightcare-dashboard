"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome } from "@/lib/workspace";
import { readSession } from "@/lib/session";

export default function WorkspaceEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    router.replace(getRoleHome(session?.role));
  }, [router]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      Loading workspace...
    </div>
  );
}
