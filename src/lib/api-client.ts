import { clearSession, readSession } from "@/lib/session";

const DEFAULT_TIMEOUT_MS = 15_000;

type ApiInit = RequestInit & {
  skipAuth?: boolean;
  timeoutMs?: number;
};

function buildHeaders(init?: RequestInit, skipAuth?: boolean): Headers {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  if (!skipAuth) {
    const session = readSession();
    if (session?.userId) headers.set("x-user-id", session.userId);
    if (session?.tenantId) headers.set("x-tenant-id", session.tenantId);
  }

  return headers;
}

export async function apiFetch(path: string, init: ApiInit = {}) {
  const { skipAuth = false, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`/api/proxy${path}`, {
      ...rest,
      headers: buildHeaders(rest, skipAuth),
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
