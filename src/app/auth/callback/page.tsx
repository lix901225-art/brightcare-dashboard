"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { writeSession } from "@/lib/session";
import { getRoleHome } from "@/lib/workspace";

export default function Auth0CallbackPage() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0();
  const [error, setError] = useState("");
  const syncedRef = useRef(false);

  useEffect(() => {
    if (isLoading || syncedRef.current) return;
    if (!isAuthenticated || !user) return;

    syncedRef.current = true;

    // Capture user in a const so TypeScript narrows inside the async closure
    const currentUser = user;

    async function syncSession() {
      try {
        // Get Auth0 access token (if audience is configured)
        let token: string | null = null;
        try {
          token = await getAccessTokenSilently();
        } catch {
          // No audience configured — token not available, proceed with user info only
        }

        // Sync Auth0 user with our backend
        const res = await fetch("/api/proxy/auth/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            auth0Id: currentUser.sub,
            email: currentUser.email,
            displayName: currentUser.name || currentUser.nickname || currentUser.email,
            picture: currentUser.picture,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || `Sync failed: ${res.status}`);
        }

        const data = await res.json();

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold text-slate-900">Sign-in error</h1>
          <p className="mt-2 text-sm text-rose-600">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
        <h1 className="text-lg font-semibold text-slate-900">Completing sign in...</h1>
        <p className="mt-2 text-sm text-slate-500">Setting up your workspace.</p>
      </div>
    </div>
  );
}
