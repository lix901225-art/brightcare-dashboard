/**
 * Shared badge styling utilities for consistent color coding across the app.
 * Each function returns Tailwind class strings for border + background + text.
 */

const COLORS = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  slateMuted: "border-slate-300 bg-slate-100 text-slate-500",
} as const;

/** Child enrollment status badge */
export function childStatusBadge(status?: string | null): string {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return COLORS.emerald;
    case "WAITLIST":
      return COLORS.amber;
    case "WITHDRAWN":
      return COLORS.rose;
    case "INACTIVE":
      return COLORS.slateMuted;
    default:
      return COLORS.slate;
  }
}

/** Invoice / billing status badge */
export function invoiceStatusBadge(status: string): string {
  switch (status.toUpperCase()) {
    case "PAID":
      return COLORS.emerald;
    case "PARTIALLY_PAID":
      return COLORS.amber;
    case "OVERDUE":
      return COLORS.rose;
    case "DRAFT":
      return COLORS.slate;
    case "SENT":
    case "ISSUED":
      return COLORS.sky;
    case "VOID":
    case "CANCELLED":
      return COLORS.slateMuted;
    default:
      return COLORS.slate;
  }
}

/** Invoice status badge with overdue override (for detail page) */
export function invoiceStatusBadgeOverdue(status: string, isOverdue: boolean): string {
  if (isOverdue) return COLORS.rose;
  switch (status.toUpperCase()) {
    case "PAID":
      return COLORS.emerald;
    case "ISSUED":
      return COLORS.sky;
    case "DRAFT":
      return COLORS.slate;
    case "VOID":
      return COLORS.slateMuted + " line-through";
    default:
      return COLORS.slate;
  }
}

/** Incident severity badge */
export function severityBadge(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return COLORS.rose;
    case "high":
      return COLORS.amber;
    case "medium":
      return COLORS.yellow;
    case "low":
      return COLORS.sky;
    default:
      return COLORS.slate;
  }
}

/** Attendance status badge */
export function attendanceBadge(status?: string | null): string {
  switch ((status || "").toUpperCase()) {
    case "PRESENT":
      return COLORS.emerald;
    case "ABSENT":
      return COLORS.rose;
    case "CHECKED_IN":
      return COLORS.sky;
    case "CHECKED_OUT":
      return COLORS.violet;
    default:
      return COLORS.slate;
  }
}

/** Daily report mood badge */
export function moodBadge(mood?: string | null): string {
  switch ((mood || "").toLowerCase()) {
    case "happy":
      return COLORS.emerald;
    case "content":
      return COLORS.sky;
    case "tired":
      return COLORS.amber;
    case "fussy":
    case "upset":
      return COLORS.rose;
    default:
      return COLORS.slate;
  }
}

/** Guardian role chip */
export function guardianChipClass(kind: "primary" | "emergency" | "pickup" | "portal" | "missing"): string {
  switch (kind) {
    case "primary":
      return COLORS.sky;
    case "emergency":
      return COLORS.amber;
    case "pickup":
      return COLORS.emerald;
    case "portal":
      return COLORS.violet;
    case "missing":
      return COLORS.rose;
  }
}

/** Generic color by semantic level */
export function levelBadge(level: "success" | "warning" | "danger" | "info" | "muted"): string {
  switch (level) {
    case "success":
      return COLORS.emerald;
    case "warning":
      return COLORS.amber;
    case "danger":
      return COLORS.rose;
    case "info":
      return COLORS.sky;
    case "muted":
      return COLORS.slate;
  }
}
