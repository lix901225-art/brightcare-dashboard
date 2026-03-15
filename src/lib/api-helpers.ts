import { apiFetch } from "@/lib/api-client";

/**
 * Fetch JSON from API with automatic error handling.
 * Returns parsed JSON or throws an error with a user-friendly message.
 */
export async function fetchJSON<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await apiFetch(path, init);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      (data as { message?: string })?.message ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

/**
 * Safely fetch JSON, returning a fallback on failure.
 * Useful for non-critical data loading.
 */
export async function fetchJSONSafe<T>(
  path: string,
  fallback: T,
  init?: RequestInit
): Promise<T> {
  try {
    return await fetchJSON<T>(path, init);
  } catch {
    return fallback;
  }
}

/**
 * Format API errors for display.
 */
export function formatError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "An unexpected error occurred.";
}

/**
 * Format currency from cents to dollar string.
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format a date string as a short human-readable date.
 */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date as relative time (e.g., "5m ago", "2d ago").
 */
export function relativeTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

/**
 * Format a date/time as short time (e.g., "2:30 PM").
 */
export function formatTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Format a date/time as "Mar 15, 2:30 PM" style.
 */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Convert a date string to YYYY-MM-DD for input[type=date].
 */
export function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Calculate age from date of birth.
 */
export function calcAge(dob?: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years--;
  if (years < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${months}mo`;
  }
  return `${years}y`;
}
