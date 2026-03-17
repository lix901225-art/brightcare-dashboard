/**
 * Track B: Auth0 sync contract types.
 *
 * These define the request/response shape for POST /auth/sync,
 * which the backend must implement to complete Auth0 integration.
 *
 * The callback route (src/app/auth/callback/page.tsx) already uses
 * this shape inline — these types serve as the canonical reference.
 */

/** Sent from frontend to POST /auth/sync after Auth0 authentication. */
export type Auth0SyncRequest = {
  /** Auth0 user ID (e.g. "auth0|abc123" or "google-oauth2|...") */
  auth0Id: string;
  /** Email from Auth0 profile */
  email: string;
  /** Display name from Auth0 profile */
  displayName: string;
  /** Avatar URL from Auth0 profile (optional) */
  picture?: string;
};

/** Returned from POST /auth/sync — maps Auth0 user to local session. */
export type Auth0SyncResponse = {
  userId: string;
  tenantId: string;
  role: "OWNER" | "STAFF" | "PARENT";
  displayName: string;
  tenantName: string;
};
