import { patchSession, readSession, clearSession, type AppSession } from "@/lib/session";

type MeResponse = {
  id?: string;
  userId?: string;
  tenantId?: string;
  displayName?: string | null;
  phone?: string | null;
  roles?: string[];
  role?: "OWNER" | "STAFF" | "PARENT" | null;
};

function normalizeRole(role: string | null | undefined): "OWNER" | "STAFF" | "PARENT" {
  if (role === "STAFF") return "STAFF";
  if (role === "PARENT") return "PARENT";
  return "OWNER";
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

    const nextSession: AppSession = {
      userId: data.userId || session.userId,
      tenantId: data.tenantId || session.tenantId,
      role: normalizeRole(data.role || session.role),
      displayName: data.displayName || session.displayName || "User",
      tenantName: session.tenantName || session.tenantId,
    };

    patchSession(nextSession);
    return nextSession;
  } catch {
    return session;
  }
}
