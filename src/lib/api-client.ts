import { clearSession } from "@/lib/session";
import { readToken, writeToken } from "@/lib/token-store";

const DEFAULT_TIMEOUT_MS = 15_000;
const REFRESH_TIMEOUT_MS = 10_000;

type ApiInit = RequestInit & {
  skipAuth?: boolean;
  timeoutMs?: number;
  /** When provided, overrides the stored Bearer token. */
  bearerToken?: string;
  /** Internal: skip the 401 → refresh → retry logic (prevents infinite loops). */
  _skipRefresh?: boolean;
};

function buildHeaders(
  init?: RequestInit,
  skipAuth?: boolean,
  bearerToken?: string,
): Headers {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  if (!skipAuth) {
    const token = bearerToken ?? readToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

/**
 * Try to refresh the stored JWT via POST /auth/refresh.
 * Returns the new token on success, null on failure.
 */
async function tryRefreshToken(): Promise<string | null> {
  const currentToken = readToken();
  if (!currentToken) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

  try {
    const res = await fetch("/api/proxy/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: currentToken }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data?.token) {
      writeToken(data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiFetch(path: string, init: ApiInit = {}) {
  const {
    skipAuth = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    bearerToken,
    _skipRefresh = false,
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

    // On 401: try refreshing the token once, then retry the request
    if (res.status === 401 && !skipAuth && !_skipRefresh) {
      const newToken = await tryRefreshToken();
      if (newToken) {
        // Retry the original request with the new token
        clearTimeout(timeout);
        return apiFetch(path, { ...init, bearerToken: newToken, _skipRefresh: true });
      }
      // Refresh failed — clear session and redirect to login
      clearSession();
      if (typeof window !== "undefined") {
        window.location.replace("/login?expired=1");
      }
    } else if (res.status === 403 && !skipAuth) {
      // 403 = user exists but lacks permission — don't clear session
    }

    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request timed out — please check your connection and try again.`);
    }
    // Network errors (server down, no internet, DNS failure)
    if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
      throw new Error("Unable to reach the server. Please check your internet connection.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
