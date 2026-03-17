import { clearSession, readSession } from "@/lib/session";

const DEFAULT_TIMEOUT_MS = 15_000;

type ApiInit = RequestInit & {
  skipAuth?: boolean;
  timeoutMs?: number;
  /** Track B: when provided, sends Authorization: Bearer <token> alongside legacy headers. */
  bearerToken?: string;
};

function buildHeaders(
  init?: RequestInit,
  skipAuth?: boolean,
  bearerToken?: string,
): Headers {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  if (!skipAuth) {
    const session = readSession();
    if (session?.userId) headers.set("x-user-id", session.userId);
    if (session?.tenantId) headers.set("x-tenant-id", session.tenantId);
  }

  // Track B: attach Bearer token when provided (coexists with legacy headers)
  if (bearerToken) {
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }

  return headers;
}

export async function apiFetch(path: string, init: ApiInit = {}) {
  const {
    skipAuth = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    bearerToken,
    ...rest
  } = init;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`/api/proxy${path}`, {
      ...rest,
      headers: buildHeaders(rest, skipAuth, bearerToken),
      cache: "no-store",
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      if (!skipAuth) {
        clearSession();
      }
    }

    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request to ${path} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
