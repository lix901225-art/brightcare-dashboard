import { patchSession, readSession, clearSession, type AppSession } from "@/lib/session";
import { readToken } from "@/lib/token-store";

type MeResponse = {
  id?: string;
  userId?: string;
  tenantId?: string;
  displayName?: string | null;
  phone?: string | null;
  roles?: string[];
  role?: string | null;
  // Also support nested shape from MeController (fallback)
  user?: {
    id?: string;
    displayName?: string | null;
  };
};

function pickPrimaryRole(roles?: string[]): "OWNER" | "STAFF" | "PARENT" | null {
  if (!roles || roles.length === 0) return null;
  if (roles.includes("OWNER")) return "OWNER";
  if (roles.includes("STAFF")) return "STAFF";
  if (roles.includes("PARENT")) return "PARENT";
  return null;
}

function normalizeRole(role: string | null | undefined): "OWNER" | "STAFF" | "PARENT" {
  if (role === "OWNER") return "OWNER";
  if (role === "PARENT") return "PARENT";
  return "STAFF";
}

/**
 * @param bearerToken Track B: optional Auth0 access token. When provided,
 *   sends Authorization header alongside legacy x-user-id/x-tenant-id.
 */
export async function bootstrapSessionFromBackend(
  bearerToken?: string | null,
): Promise<AppSession | null> {
  const session = readSession();
  if (!session?.userId || !session?.tenantId) return null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-id": session.userId,
      "x-tenant-id": session.tenantId,
    };

    // Track B: attach Bearer token when available (coexists with legacy headers)
    // Priority: explicit param (Auth0 access token) > stored JWT > none
    const token = bearerToken || readToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/proxy/me", {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 401) {
      clearSession();
      return null;
    }

    // 403 = authenticated but lacks permission — keep session intact
    if (res.status === 403) {
      return session;
    }

    const data: MeResponse = await res.json();

    if (!res.ok) {
      return session;
    }

    const backendRole = pickPrimaryRole(data.roles);

    const nextSession: AppSession = {
      userId: data.userId || data.user?.id || data.id || session.userId,
      tenantId: data.tenantId || session.tenantId,
      role: normalizeRole(backendRole || session.role),
      displayName: data.displayName || data.user?.displayName || session.displayName || "User",
      tenantName: session.tenantName || session.tenantId,
    };

    patchSession(nextSession);
    return nextSession;
  } catch {
    return session;
  }
}
