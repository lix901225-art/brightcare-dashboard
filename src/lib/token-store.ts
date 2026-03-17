/**
 * JWT token store.
 *
 * Stores the backend-issued JWT in localStorage, separate from the session
 * (tokens have different lifecycle — they expire after 24h).
 *
 * Login/register/sync responses include a `token` field which is stored here.
 * apiFetch auto-reads the stored token and attaches it as Authorization: Bearer.
 */

const TOKEN_KEY = "brightcare.token";

/** Read the stored JWT, or null if none exists. */
export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Basic JWT format check: must have exactly 3 dot-separated parts. */
function isJwtShaped(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

/** Store a JWT. Rejects tokens that don't look like valid JWTs. */
export function writeToken(token: string): void {
  if (typeof window === "undefined") return;
  if (!isJwtShaped(token)) {
    console.warn("[token-store] Rejected malformed token — not stored");
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

/** Clear the stored JWT. */
export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}
