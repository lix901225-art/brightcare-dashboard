"use client";

import { clearSession } from "@/lib/session";
import { AUTH0_ENABLED } from "@/lib/auth0-provider";

/**
 * Returns a logout function that clears the local session and redirects.
 *
 * When Auth0 is enabled, also calls Auth0's /v2/logout to end the Auth0 session.
 * Uses direct redirect instead of the Auth0 SDK hook to avoid requiring Auth0Provider context.
 *
 * When Auth0 is disabled, simply redirects to /login.
 */
export function logout() {
  clearSession();

  if (AUTH0_ENABLED && process.env.NEXT_PUBLIC_AUTH0_DOMAIN && process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID) {
    // Auth0 universal logout: redirect to Auth0's logout endpoint,
    // which clears the Auth0 session then redirects back to our app.
    const returnTo = encodeURIComponent(
      (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + "/login"
    );
    const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    window.location.replace(
      `https://${domain}/v2/logout?client_id=${clientId}&returnTo=${returnTo}`
    );
  } else {
    window.location.replace("/login");
  }
}
