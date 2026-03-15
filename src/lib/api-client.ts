import { clearSession, readSession } from "@/lib/session";

type ApiInit = RequestInit & {
  skipAuth?: boolean;
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
  const { skipAuth = false, ...rest } = init;

  const res = await fetch(`/api/proxy${path}`, {
    ...rest,
    headers: buildHeaders(rest, skipAuth),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    if (!skipAuth) {
      clearSession();
    }
  }

  return res;
}
