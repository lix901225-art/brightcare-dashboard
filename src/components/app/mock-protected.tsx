"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readSession } from "@/lib/session";

export default function MockProtected({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (readSession()) {
      setReady(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading workspace...
      </div>
    );
  }

  return <>{children}</>;
}
