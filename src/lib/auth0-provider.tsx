"use client";

import { Auth0Provider } from "@auth0/auth0-react";

export default function Auth0ProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      authorizationParams={{
        redirect_uri: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || undefined,
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {children}
    </Auth0Provider>
  );
}
