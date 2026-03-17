"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { writeSession } from "@/lib/session";
import { getRoleHome } from "@/lib/workspace";
import { AUTH0_ENABLED } from "@/lib/auth0-provider";
import type { Auth0SyncRequest, Auth0SyncResponse } from "@/lib/auth0-types";

/**
 * Inner component that calls useAuth0() — only rendered when Auth0 is enabled,
 * so the hook is always called within a valid Auth0Provider context.
 */
function Auth0CallbackInner() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, error: auth0Error } = useAuth0();
  const [error, setError] = useState("");
  const syncedRef = useRef(false);

  // Surface Auth0 SDK errors (e.g. user cancelled consent, misconfigured app)
  useEffect(() => {
    if (auth0Error) {
      setError(auth0Error.message || "Authentication failed. Please try again.");
    }
  }, [auth0Error]);

  // Timeout: if still loading after 15s, show an error instead of spinning forever
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!syncedRef.current && !error) {
        setError("Sign-in timed out. Please try again.");
      }
    }, 15_000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (isLoading || syncedRef.current) return;
    if (!isAuthenticated || !user) return;

    syncedRef.current = true;
    const currentUser = user;

    async function syncSession() {
      try {
        let token: string | null = null;
        try {
          token = await getAccessTokenSilently();
        } catch {
          // No audience configured — token not available, proceed with user info only
        }

        const res = await fetch("/api/proxy/auth/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            auth0Id: currentUser.sub ?? "",
            email: currentUser.email ?? "",
            displayName: currentUser.name || currentUser.nickname || currentUser.email || "User",
            picture: currentUser.picture,
          } satisfies Auth0SyncRequest),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data?.message || `Sync failed: ${res.status}`;
          // Surface a clearer message when the backend endpoint is not yet available
          if (res.status === 404) {
            throw new Error(
              "Auth0 sign-in succeeded, but the backend sync endpoint is not available yet. " +
              "Please use phone sign-in for now."
            );
          }
          throw new Error(msg);
        }

        const data: Auth0SyncResponse = await res.json();

        writeSession({
          userId: data.userId,
          tenantId: data.tenantId,
          role: data.role,
          displayName: data.displayName || currentUser.name || "User",
          tenantName: data.tenantName || data.tenantId,
        });

        window.location.replace(getRoleHome(data.role));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to sync session.");
      }
    }

    void syncSession();
  }, [isAuthenticated, isLoading, user, getAccessTokenSilently]);

  if (error) {
    return (
      <CallbackShell>
        <h1 className="text-lg font-semibold text-slate-900">Sign-in error</h1>
        <p className="mt-2 text-sm text-rose-600">{error}</p>
        <a
          href="/login"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to sign in
        </a>
      </CallbackShell>
    );
  }

  return (
    <CallbackShell>
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      <h1 className="text-lg font-semibold text-slate-900">Completing sign in...</h1>
      <p className="mt-2 text-sm text-slate-500">Setting up your workspace.</p>
    </CallbackShell>
  );
}

function CallbackShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">{children}</div>
    </div>
  );
}

/**
 * Route entry point.
 * When Auth0 is disabled, redirects back to /login immediately —
 * prevents useAuth0() from being called outside a provider context.
 */
export default function Auth0CallbackPage() {
  if (!AUTH0_ENABLED) {
    return (
      <CallbackShell>
        <h1 className="text-lg font-semibold text-slate-900">Auth0 is not enabled</h1>
        <p className="mt-2 text-sm text-slate-500">
          This callback route requires Auth0 configuration.
        </p>
        <a
          href="/login"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to sign in
        </a>
      </CallbackShell>
    );
  }

  return <Auth0CallbackInner />;
}
