/**
 * Development-mode environment validation.
 *
 * Warns about missing or placeholder values that will cause problems
 * in production. Only logs in development — no-op in production builds.
 *
 * Import this once from the root layout or app entry point.
 */

const PLACEHOLDER_VALUES = [
  "YOUR_AUTH0_DOMAIN",
  "YOUR_AUTH0_CLIENT_ID",
  "your-tenant.auth0.com",
  "replace-me",
  "changeme",
  "TODO",
];

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return false;
  return PLACEHOLDER_VALUES.some(
    (p) => value.toLowerCase() === p.toLowerCase(),
  );
}

function warnEnv(name: string, message: string): void {
  console.warn(`[env-check] ${name}: ${message}`);
}

export function checkEnvironment(): void {
  if (process.env.NODE_ENV !== "development") return;

  // API_BASE_URL — server-side only, critical for proxy
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    warnEnv("API_BASE_URL", "not set — proxy will default to http://127.0.0.1:4000");
  }

  // Auth0 partial config (domain set but not client ID, or vice versa)
  const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;

  if (auth0Domain && !auth0ClientId) {
    warnEnv(
      "NEXT_PUBLIC_AUTH0_CLIENT_ID",
      "Auth0 domain is set but client ID is missing — Auth0 login will be disabled",
    );
  }
  if (!auth0Domain && auth0ClientId) {
    warnEnv(
      "NEXT_PUBLIC_AUTH0_DOMAIN",
      "Auth0 client ID is set but domain is missing — Auth0 login will be disabled",
    );
  }

  // Placeholder detection
  if (isPlaceholder(auth0Domain)) {
    warnEnv("NEXT_PUBLIC_AUTH0_DOMAIN", `looks like a placeholder value ("${auth0Domain}")`);
  }
  if (isPlaceholder(auth0ClientId)) {
    warnEnv("NEXT_PUBLIC_AUTH0_CLIENT_ID", `looks like a placeholder value ("${auth0ClientId}")`);
  }

  // NEXT_PUBLIC_APP_URL — important for Auth0 redirects
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    warnEnv("NEXT_PUBLIC_APP_URL", "not set — Auth0 redirects will use http://localhost:3000");
  }
}
