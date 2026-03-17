"use client";

import { useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { clearSession } from "@/lib/session";
import { AUTH0_ENABLED, getAuth0ReturnTo } from "@/lib/auth0-logout";

/**
 * Hook that returns a stable `logout()` function.
 *
 * - When Auth0 is enabled, uses the Auth0 SDK's `logout()` which properly
 *   clears its own localStorage cache AND redirects to Auth0 /v2/logout.
 *   The SDK sends the correct client_id automatically.
 * - When Auth0 is disabled (Track A), clears session and redirects to /login.
 *
 * Must be called inside Auth0ProviderClient — which always wraps (app) routes.
 * When AUTH0_ENABLED is false, Auth0ProviderClient renders a passthrough,
 * so we avoid calling useAuth0() entirely (it would throw without a provider).
 */
export function useLogout(): () => void {
  if (!AUTH0_ENABLED) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useCallback(() => {
      clearSession();
      window.location.replace("/login");
    }, []);
  }

  // Auth0 IS enabled — provider is in the tree, safe to call useAuth0()
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { logout: auth0SdkLogout } = useAuth0();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCallback(() => {
    clearSession();
    auth0SdkLogout({
      logoutParams: {
        returnTo: getAuth0ReturnTo(),
      },
    });
  }, [auth0SdkLogout]);
}
