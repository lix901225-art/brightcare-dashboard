export type SessionRole = "OWNER" | "STAFF" | "PARENT";

export type AppSession = {
  userId: string;
  tenantId: string;
  role: SessionRole;
  displayName: string;
  tenantName: string;
};

const STORAGE_KEY = "brightcare.session";

function normalizeRole(value: string | null | undefined): SessionRole {
  if (value === "STAFF") return "STAFF";
  if (value === "PARENT") return "PARENT";
  return "OWNER";
}

export function readSession(): AppSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSession>;
      if (parsed?.userId && parsed?.tenantId) {
        return {
          userId: parsed.userId,
          tenantId: parsed.tenantId,
          role: normalizeRole(parsed.role),
          displayName: parsed.displayName || "User",
          tenantName: parsed.tenantName || parsed.tenantId,
        };
      }
    }
  } catch (err) {
    console.warn("[session] Failed to parse stored session:", err);
  }

  const userId = localStorage.getItem("userId") || "";
  const tenantId = localStorage.getItem("tenantId") || "";
  if (!userId || !tenantId) return null;

  return {
    userId,
    tenantId,
    role: normalizeRole(localStorage.getItem("role")),
    displayName: localStorage.getItem("displayName") || "User",
    tenantName: localStorage.getItem("tenantName") || tenantId,
  };
}

export function writeSession(session: AppSession) {
  if (typeof window === "undefined") return;

  const normalized: AppSession = {
    userId: session.userId,
    tenantId: session.tenantId,
    role: normalizeRole(session.role),
    displayName: session.displayName || "User",
    tenantName: session.tenantName || session.tenantId,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  localStorage.setItem("userId", normalized.userId);
  localStorage.setItem("tenantId", normalized.tenantId);
  localStorage.setItem("role", normalized.role);
  localStorage.setItem("displayName", normalized.displayName);
  localStorage.setItem("tenantName", normalized.tenantName);

  window.dispatchEvent(new Event("storage"));
}

export function patchSession(partial: Partial<AppSession>) {
  const current = readSession();
  if (!current) return;

  writeSession({
    ...current,
    ...partial,
    role: normalizeRole(partial.role || current.role),
  });
}

export function clearSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("userId");
  localStorage.removeItem("tenantId");
  localStorage.removeItem("role");
  localStorage.removeItem("displayName");
  localStorage.removeItem("tenantName");

  window.dispatchEvent(new Event("storage"));
}
