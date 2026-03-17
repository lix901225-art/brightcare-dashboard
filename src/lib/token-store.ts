/**
 * Track B: simple JWT token store.
 *
 * Stores a backend-issued JWT in localStorage, separate from the session
 * (tokens have different lifecycle — they expire, need refresh, etc.).
 *
 * When the backend starts returning tokens in login/register/sync responses,
 * the frontend stores them here. apiFetch reads the stored token and
 * attaches it as Authorization: Bearer automatically.
 *
 * When no token is stored (current state), all behavior is unchanged.
 */

const TOKEN_KEY = "brightcare.token";

/** Read the stored JWT, or null if none exists. */
export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Store a JWT. */
export function writeToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

/** Clear the stored JWT. */
export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}
