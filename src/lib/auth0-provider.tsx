"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Auth0Provider } from "@auth0/auth0-react";

/** True when both required Auth0 env vars are present and non-placeholder. */
export const AUTH0_ENABLED =
  !!process.env.NEXT_PUBLIC_AUTH0_DOMAIN &&
  process.env.NEXT_PUBLIC_AUTH0_DOMAIN !== "YOUR_AUTH0_DOMAIN" &&
  !!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID &&
  process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID !== "YOUR_AUTH0_CLIENT_ID";

// Dev-mode validation: warn if domain doesn't look like a valid Auth0 domain
if (
  AUTH0_ENABLED &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_AUTH0_DOMAIN &&
  !process.env.NEXT_PUBLIC_AUTH0_DOMAIN.includes(".auth0.com")
) {
  console.warn(
    `[auth0-provider] NEXT_PUBLIC_AUTH0_DOMAIN "${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}" ` +
    `does not contain ".auth0.com" — is this correct?`
  );
}

/**
 * Error boundary that catches Auth0 SDK crashes (bad config, network issues
 * during init, etc.) and falls through to rendering children without Auth0.
 * This prevents a misconfigured Auth0 from taking down the entire app.
 *
 * Uses a `fallback` prop (the raw app content) so that on error it renders
 * children WITHOUT re-rendering the crashed Auth0Provider.
 */
class Auth0ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Auth0ErrorBoundary] Auth0 SDK error — falling back to non-Auth0 mode:", error, info);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback (app content without Auth0Provider)
      return <>{this.props.fallback}</>;
    }
    return this.props.children;
  }
}

export default function Auth0ProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!AUTH0_ENABLED) {
    return <>{children}</>;
  }

  return (
    <Auth0ErrorBoundary fallback={children}>
      <Auth0Provider
        domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
        clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
        authorizationParams={{
          redirect_uri: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + "/auth/callback",
          audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || undefined,
        }}
        cacheLocation="localstorage"
        useRefreshTokens
        useCookiesForTransactions={false}
      >
        {children}
      </Auth0Provider>
    </Auth0ErrorBoundary>
  );
}
