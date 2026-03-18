export type AppRole = "OWNER" | "STAFF" | "PARENT";

export type NavItem = {
  href: string;
  label: string;
  /** i18n translation key (e.g. "nav.dashboard") — falls back to label if translation missing */
  tKey?: string;
};

export function normalizeRole(value: string | null | undefined): AppRole | null {
  if (value === "OWNER" || value === "STAFF" || value === "PARENT") return value;
  return null;
}

export function getRoleHome(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "OWNER":
      return "/dashboard";
    case "STAFF":
      return "/staff";
    case "PARENT":
      return "/parent";
    default:
      return "/login";
  }
}

export const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  OWNER: [
    { href: "/dashboard", label: "Dashboard", tKey: "nav.dashboard" },
    { href: "/enrollment", label: "Enrollment", tKey: "nav.enrollment" },
    { href: "/children", label: "Children", tKey: "nav.children" },
    { href: "/guardians", label: "Guardians", tKey: "nav.guardians" },
    { href: "/attendance", label: "Attendance", tKey: "nav.attendance" },
    { href: "/daily-reports", label: "Daily Reports", tKey: "nav.dailyReports" },
    { href: "/incidents", label: "Incidents", tKey: "nav.incidents" },
    { href: "/messages", label: "Messages", tKey: "nav.messages" },
    { href: "/announcements", label: "Announcements", tKey: "nav.announcements" },
    { href: "/calendar", label: "Calendar", tKey: "nav.calendar" },
    { href: "/billing", label: "Billing", tKey: "nav.billing" },
    { href: "/analytics", label: "Analytics", tKey: "nav.analytics" },
    { href: "/compliance", label: "Compliance", tKey: "nav.compliance" },
    { href: "/reports", label: "Reports", tKey: "nav.reports" },
    { href: "/documents", label: "Documents", tKey: "nav.documents" },
    { href: "/rooms", label: "Rooms", tKey: "nav.rooms" },
    { href: "/policies", label: "Policies", tKey: "nav.policies" },
    { href: "/locations", label: "Locations", tKey: "nav.locations" },
    { href: "/staff-management", label: "Staff & Users", tKey: "nav.staffManagement" },
    { href: "/settings", label: "Settings", tKey: "nav.settings" },
  ],
  STAFF: [
    { href: "/staff", label: "Staff Home", tKey: "nav.staffHome" },
    { href: "/attendance", label: "Attendance", tKey: "nav.attendance" },
    { href: "/daily-reports", label: "Daily Reports", tKey: "nav.dailyReports" },
    { href: "/incidents", label: "Incidents", tKey: "nav.incidents" },
    { href: "/children", label: "Children", tKey: "nav.children" },
    { href: "/messages", label: "Messages", tKey: "nav.messages" },
    { href: "/announcements", label: "Announcements", tKey: "nav.announcements" },
    { href: "/documents", label: "Documents", tKey: "nav.documents" },
    { href: "/billing", label: "Billing", tKey: "nav.billing" },
    { href: "/settings", label: "Settings", tKey: "nav.settings" },
  ],
  PARENT: [
    { href: "/parent", label: "Parent Home", tKey: "nav.parentHome" },
    { href: "/parent/attendance", label: "Attendance", tKey: "nav.attendance" },
    { href: "/parent/billing", label: "Billing", tKey: "nav.billing" },
    { href: "/daily-reports", label: "Daily Reports", tKey: "nav.dailyReports" },
    { href: "/parent/incidents", label: "Incidents", tKey: "nav.incidents" },
    { href: "/messages", label: "Messages", tKey: "nav.messages" },
    { href: "/parent/announcements", label: "Announcements", tKey: "nav.announcements" },
    { href: "/policies", label: "Policies", tKey: "nav.policies" },
    { href: "/settings", label: "Settings", tKey: "nav.settings" },
  ],
};
