export type AppRole = "OWNER" | "STAFF" | "PARENT";

export type NavItem = {
  href: string;
  label: string;
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
    { href: "/dashboard", label: "Dashboard" },
    { href: "/enrollment", label: "Enrollment" },
    { href: "/children", label: "Children" },
    { href: "/guardians", label: "Guardians" },
    { href: "/attendance", label: "Attendance" },
    { href: "/daily-reports", label: "Daily Reports" },
    { href: "/incidents", label: "Incidents" },
    { href: "/messages", label: "Messages" },
    { href: "/announcements", label: "Announcements" },
    { href: "/billing", label: "Billing" },
    { href: "/reports", label: "Reports" },
    { href: "/rooms", label: "Rooms" },
    { href: "/policies", label: "Policies" },
    { href: "/staff-management", label: "Staff & Users" },
    { href: "/settings", label: "Settings" },
  ],
  STAFF: [
    { href: "/staff", label: "Staff Home" },
    { href: "/attendance", label: "Attendance" },
    { href: "/daily-reports", label: "Daily Reports" },
    { href: "/incidents", label: "Incidents" },
    { href: "/children", label: "Children" },
    { href: "/messages", label: "Messages" },
    { href: "/announcements", label: "Announcements" },
    { href: "/billing", label: "Billing" },
    { href: "/settings", label: "Settings" },
  ],
  PARENT: [
    { href: "/parent", label: "Parent Home" },
    { href: "/parent/attendance", label: "Attendance" },
    { href: "/parent/billing", label: "Billing" },
    { href: "/daily-reports", label: "Daily Reports" },
    { href: "/parent/incidents", label: "Incidents" },
    { href: "/messages", label: "Messages" },
    { href: "/parent/announcements", label: "Announcements" },
    { href: "/policies", label: "Policies" },
    { href: "/settings", label: "Settings" },
  ],
};
