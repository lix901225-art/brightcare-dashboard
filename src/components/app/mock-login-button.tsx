"use client";

import { useRouter } from "next/navigation";

export default function MockLoginButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        localStorage.setItem("mock_logged_in", "1");
        router.push("/workspace");
      }}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
    >
      Enter Demo Workspace
    </button>
  );
}
