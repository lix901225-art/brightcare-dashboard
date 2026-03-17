import { clearSession } from "@/lib/session";
import { AUTH0_ENABLED } from "@/lib/auth0-provider";

/**
 * Clear Auth0 SPA SDK localStorage cache entries.
 *
 * When cacheLocation is "localstorage", the SDK stores tokens under keys
 * prefixed with `@@auth0spajs@@`. If these aren't cleared, the SDK
 * auto-restores the session on next page load — making logout appear broken.
 */
function clearAuth0Cache() {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("@@auth0spajs@@")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Full logout that works for both Auth0 and non-Auth0 modes.
 *
 * 1. Clears our app session (brightcare.session + legacy keys + JWT token)
 * 2. Clears Auth0 SDK's localStorage cache (@@auth0spajs@@ keys)
 * 3. Redirects to Auth0's /v2/logout (if Auth0 enabled) or /login (if not)
 *
 * Auth0's /v2/logout clears the Auth0 server-side session cookie, then
 * redirects the user to the `returnTo` URL. The returnTo value MUST
 * exactly match one of the "Allowed Logout URLs" in Auth0 Application settings.
 *
 * For local dev: returnTo = http://localhost:3000
 */
export function logout() {
  clearSession();
  clearAuth0Cache();

  if (AUTH0_ENABLED && process.env.NEXT_PUBLIC_AUTH0_DOMAIN && process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID) {
    const returnTo = encodeURIComponent(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
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

/**
 * Build the Auth0 returnTo URL.
 * Must exactly match one of the "Allowed Logout URLs" in Auth0 Application settings.
 */
export function getAuth0ReturnTo(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export { AUTH0_ENABLED };
