import { AUTH0_ENABLED } from "@/lib/auth0-provider";

/**
 * Build the Auth0 returnTo URL.
 * Must exactly match one of the "Allowed Logout URLs" in Auth0 Application settings.
 *
 * For local dev: http://localhost:3000
 */
export function getAuth0ReturnTo(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export { AUTH0_ENABLED };
