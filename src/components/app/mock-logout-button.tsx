"use client";

import { useRouter } from "next/navigation";

export default function MockLogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        localStorage.removeItem("mock_logged_in");
        router.push("/login");
      }}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Logout
    </button>
  );
}
