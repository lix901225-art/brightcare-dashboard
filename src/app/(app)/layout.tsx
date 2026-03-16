import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { AppAuthGate } from "@/components/auth/app-auth-gate";
import Auth0ProviderClient from "@/lib/auth0-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProtectedAppLayout({ children }: { children: ReactNode }) {
  return (
    <Auth0ProviderClient>
      <AppAuthGate>
        <AppShell>
          <Suspense>{children}</Suspense>
        </AppShell>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontSize: "14px",
            },
          }}
        />
      </AppAuthGate>
    </Auth0ProviderClient>
  );
}
