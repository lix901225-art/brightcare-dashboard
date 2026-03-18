import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { AppAuthGate } from "@/components/auth/app-auth-gate";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Auth0ProviderClient from "@/lib/auth0-provider";
import { AuthTokenProvider } from "@/lib/auth-token-context";
import { Toaster } from "sonner";
import { NetworkStatus } from "@/components/ui/network-status";
import { StaffOnboarding } from "@/components/app/staff-onboarding";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProtectedAppLayout({ children }: { children: ReactNode }) {
  return (
    <Auth0ProviderClient>
      <AuthTokenProvider>
      <AppAuthGate>
        <AppShell>
          <ErrorBoundary>
            <Suspense>{children}</Suspense>
          </ErrorBoundary>
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
        <NetworkStatus />
        <StaffOnboarding />
      </AppAuthGate>
      </AuthTokenProvider>
    </Auth0ProviderClient>
  );
}
