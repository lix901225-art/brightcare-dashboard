"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { logout as auth0Logout } from "@/lib/auth0-logout";

export function LoginButton() {
  const { loginWithRedirect, isLoading } = useAuth0();
  return (
    <button
      onClick={() => loginWithRedirect({ appState: { returnTo: "/dashboard" } })}
      disabled={isLoading}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {isLoading ? "Loading..." : "Login with Auth0"}
    </button>
  );
}

export function LogoutButton() {
  return (
    <button
      onClick={auth0Logout}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      Logout
    </button>
  );
}
