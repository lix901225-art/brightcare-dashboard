import { patchSession, readSession, clearSession, type AppSession } from "@/lib/session";

type MeResponse = {
  tenantId?: string;
  user?: {
    id?: string;
    displayName?: string | null;
  };
  roles?: string[];
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

export async function bootstrapSessionFromBackend(): Promise<AppSession | null> {
  const session = readSession();
  if (!session?.userId || !session?.tenantId) return null;

  try {
    const res = await fetch("/api/proxy/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": session.userId,
        "x-tenant-id": session.tenantId,
      },
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      clearSession();
      return null;
    }

    const data: MeResponse = await res.json();

    if (!res.ok) {
      return session;
    }

    const backendRole = pickPrimaryRole(data.roles);

    const nextSession: AppSession = {
      userId: data.user?.id || session.userId,
      tenantId: data.tenantId || session.tenantId,
      role: normalizeRole(backendRole || session.role),
      displayName: data.user?.displayName || session.displayName || "User",
      tenantName: session.tenantName || session.tenantId,
    };

    patchSession(nextSession);
    return nextSession;
  } catch {
    return session;
  }
}
