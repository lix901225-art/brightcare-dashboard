"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { AUTH0_ENABLED } from "@/lib/auth0-provider";

type GetToken = () => Promise<string | null>;

const AuthTokenContext = createContext<GetToken>(async () => null);

/**
 * Inner provider that lives INSIDE Auth0Provider (so useAuth0 is safe to call).
 * Exposes getAccessTokenSilently via context.
 */
function Auth0TokenProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const getToken = useCallback<GetToken>(async () => {
    if (!isAuthenticated) return null;
    try {
      return await getAccessTokenSilently();
    } catch {
      return null;
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <AuthTokenContext.Provider value={getToken}>
      {children}
    </AuthTokenContext.Provider>
  );
}

/**
 * No-op provider when Auth0 is disabled. getToken always returns null.
 */
function NoOpTokenProvider({ children }: { children: ReactNode }) {
  return (
    <AuthTokenContext.Provider value={async () => null}>
      {children}
    </AuthTokenContext.Provider>
  );
}

/**
 * Track B: wraps children with the correct token provider based on AUTH0_ENABLED.
 * Must be rendered INSIDE Auth0ProviderClient (when Auth0 is enabled).
 */
export function AuthTokenProvider({ children }: { children: ReactNode }) {
  if (AUTH0_ENABLED) {
    return <Auth0TokenProvider>{children}</Auth0TokenProvider>;
  }
  return <NoOpTokenProvider>{children}</NoOpTokenProvider>;
}

/**
 * Returns a stable getToken() function.
 * Safe to call regardless of whether Auth0 is enabled.
 */
export function useAuthToken(): GetToken {
  return useContext(AuthTokenContext);
}
