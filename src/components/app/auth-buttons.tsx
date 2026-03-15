"use client";

import { useAuth0 } from "@auth0/auth0-react";

export function LoginButton() {
  const { loginWithRedirect, isLoading } = useAuth0();
  return (
    <button
      onClick={() => loginWithRedirect({ appState: { returnTo: "/workspace" } })}
      disabled={isLoading}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {isLoading ? "Loading..." : "Login with Auth0"}
    </button>
  );
}

export function LogoutButton() {
  const { logout, isLoading } = useAuth0();
  return (
    <button
      onClick={() =>
        logout({
          logoutParams: {
            returnTo: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          },
        })
      }
      disabled={isLoading}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      Logout
    </button>
  );
}
