"use client";

import { Auth0Provider } from "@auth0/auth0-react";

/** True when both required Auth0 env vars are present and non-placeholder. */
export const AUTH0_ENABLED =
  !!process.env.NEXT_PUBLIC_AUTH0_DOMAIN &&
  process.env.NEXT_PUBLIC_AUTH0_DOMAIN !== "YOUR_AUTH0_DOMAIN" &&
  !!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID &&
  process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID !== "YOUR_AUTH0_CLIENT_ID";

export default function Auth0ProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!AUTH0_ENABLED) {
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      authorizationParams={{
        redirect_uri: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + "/auth/callback",
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || undefined,
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {children}
    </Auth0Provider>
  );
}
