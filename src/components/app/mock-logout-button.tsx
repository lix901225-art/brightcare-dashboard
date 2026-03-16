"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/session";

export default function MockLogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        clearSession();
        router.replace("/login");
      }}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Logout
    </button>
  );
}
