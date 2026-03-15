import { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { AppAuthGate } from "@/components/auth/app-auth-gate";

export default function ProtectedAppLayout({ children }: { children: ReactNode }) {
  return (
    <AppAuthGate>
      <AppShell>{children}</AppShell>
    </AppAuthGate>
  );
}
