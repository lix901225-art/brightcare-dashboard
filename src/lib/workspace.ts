export type AppRole = "OWNER" | "STAFF" | "PARENT";

export type NavItem = {
  href: string;
  label: string;
  /** i18n translation key (e.g. "nav.dashboard") — falls back to label if translation missing */
  tKey?: string;
};

export type NavGroup = {
  /** Group label shown in sidebar — null means no header (top-level items) */
  title: string | null;
  /** i18n key for the group title */
  tKey?: string;
  /** If true, group is collapsible (default open if current route matches) */
  collapsible?: boolean;
  items: NavItem[];
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

/** Flat list for backward compatibility (used by mobile nav, etc.) */
export const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  OWNER: [
    { href: "/dashboard", label: "Dashboard", tKey: "nav.dashboard" },
    { href: "/children", label: "Children", tKey: "nav.children" },
    { href: "/attendance", label: "Attendance", tKey: "nav.attendance" },
    { href: "/messages", label: "Messages", tKey: "nav.messages" },
    { href: "/daily-reports", label: "Daily Reports", tKey: "nav.dailyReports" },
    { href: "/health-checks", label: "Health Checks", tKey: "nav.healthChecks" },
    { href: "/records", label: "Records", tKey: "nav.records" },
    { href: "/enrollment", label: "Enrollment", tKey: "nav.enrollment" },
    { href: "/guardians", label: "Guardians", tKey: "nav.guardians" },
    { href: "/billing", label: "Billing", tKey: "nav.billing" },
    { href: "/staff-management", label: "Staff & Users", tKey: "nav.staffManagement" },
    { href: "/compliance", label: "Compliance", tKey: "nav.compliance" },
    { href: "/reports", label: "Reports", tKey: "nav.reports" },
    { href: "/documents", label: "Documents", tKey: "nav.documents" },
    { href: "/analytics", label: "Analytics", tKey: "nav.analytics" },
    { href: "/rooms", label: "Rooms", tKey: "nav.rooms" },
    { href: "/meal-planning", label: "Meal Planning", tKey: "nav.mealPlanning" },
    { href: "/curriculum", label: "Curriculum", tKey: "nav.curriculum" },
    { href: "/locations", label: "Locations", tKey: "nav.locations" },
    { href: "/surveys", label: "Surveys", tKey: "nav.surveys" },
    { href: "/policies", label: "Policies", tKey: "nav.policies" },
    { href: "/announcements", label: "Announcements", tKey: "nav.announcements" },
    { href: "/calendar", label: "Calendar", tKey: "nav.calendar" },
    { href: "/settings", label: "Settings", tKey: "nav.settings" },
  ],
  STAFF: [
    { href: "/dashboard", label: "Dashboard", tKey: "nav.dashboard" },
    { href: "/attendance", label: "Attendance", tKey: "nav.attendance" },
    { href: "/health-checks", label: "Health Checks", tKey: "nav.healthChecks" },
    { href: "/daily-reports", label: "Daily Reports", tKey: "nav.dailyReports" },
    { href: "/children", label: "Children", tKey: "nav.children" },
    { href: "/messages", label: "Messages", tKey: "nav.messages" },
    { href: "/records", label: "Records", tKey: "nav.records" },
    { href: "/settings", label: "Settings", tKey: "nav.settings" },
  ],
  PARENT: [
    { href: "/parent", label: "Home", tKey: "nav.parentHome" },
    { href: "/children", label: "My Children", tKey: "nav.children" },
    { href: "/parent/attendance", label: "Attendance", tKey: "nav.attendance" },
    { href: "/messages", label: "Messages", tKey: "nav.messages" },
    { href: "/daily-reports", label: "Daily Reports", tKey: "nav.dailyReports" },
    { href: "/parent/billing", label: "Billing", tKey: "nav.billing" },
    { href: "/parent/incidents", label: "Incidents", tKey: "nav.incidents" },
    { href: "/parent/health-checks", label: "Health Checks", tKey: "nav.healthChecks" },
    { href: "/parent/update-info", label: "Update Info", tKey: "nav.updateInfo" },
    { href: "/parent/surveys", label: "Surveys", tKey: "nav.surveys" },
    { href: "/settings", label: "Settings", tKey: "nav.settings" },
  ],
};

/** Grouped navigation for desktop sidebar */
export const NAV_GROUPS_BY_ROLE: Record<AppRole, NavGroup[]> = {
  OWNER: [
    {
      title: null,
      items: [
        { href: "/dashboard", label: "Dashboard", tKey: "nav.dashboard" },
        { href: "/children", label: "Children", tKey: "nav.children" },
        { href: "/attendance", label: "Attendance", tKey: "nav.attendance" },
        { href: "/messages", label: "Messages", tKey: "nav.messages" },
        { href: "/daily-reports", label: "Daily Reports", tKey: "nav.dailyReports" },
        { href: "/health-checks", label: "Health Checks", tKey: "nav.healthChecks" },
      ],
    },
    {
      title: null,
      items: [
        { href: "/records", label: "Records", tKey: "nav.records" },
        { href: "/learning-stories", label: "Learning Stories", tKey: "nav.learningStories" },
      ],
    },
    {
      title: "Management",
      tKey: "nav.management",
      collapsible: true,
      items: [
        { href: "/enrollment", label: "Enrollment", tKey: "nav.enrollment" },
        { href: "/guardians", label: "Guardians", tKey: "nav.guardians" },
        { href: "/billing", label: "Billing", tKey: "nav.billing" },
        { href: "/staff-management", label: "Staff & Users", tKey: "nav.staffManagement" },
        { href: "/compliance", label: "Compliance", tKey: "nav.compliance" },
        { href: "/reports", label: "Reports", tKey: "nav.reports" },
        { href: "/documents", label: "Documents", tKey: "nav.documents" },
        { href: "/analytics", label: "Analytics", tKey: "nav.analytics" },
        { href: "/rooms", label: "Rooms", tKey: "nav.rooms" },
        { href: "/meal-planning", label: "Meal Planning", tKey: "nav.mealPlanning" },
        { href: "/curriculum", label: "Curriculum", tKey: "nav.curriculum" },
        { href: "/locations", label: "Locations", tKey: "nav.locations" },
        { href: "/surveys", label: "Surveys", tKey: "nav.surveys" },
        { href: "/policies", label: "Policies", tKey: "nav.policies" },
        { href: "/announcements", label: "Announcements", tKey: "nav.announcements" },
        { href: "/calendar", label: "Calendar", tKey: "nav.calendar" },
        { href: "/settings", label: "Settings", tKey: "nav.settings" },
      ],
    },
  ],
  STAFF: [
    {
      title: null,
      items: [
        { href: "/dashboard", label: "Dashboard", tKey: "nav.dashboard" },
        { href: "/attendance", label: "Attendance", tKey: "nav.attendance" },
        { href: "/daily-reports", label: "Daily Reports", tKey: "nav.dailyReports" },
        { href: "/children", label: "Children", tKey: "nav.children" },
        { href: "/messages", label: "Messages", tKey: "nav.messages" },
        { href: "/records", label: "Records", tKey: "nav.records" },
        { href: "/settings", label: "Settings", tKey: "nav.settings" },
      ],
    },
  ],
  PARENT: [
    {
      title: null,
      items: [
        { href: "/parent", label: "Home", tKey: "nav.parentHome" },
        { href: "/children", label: "My Children", tKey: "nav.children" },
        { href: "/parent/attendance", label: "Attendance", tKey: "nav.attendance" },
        { href: "/messages", label: "Messages", tKey: "nav.messages" },
        { href: "/daily-reports", label: "Daily Reports", tKey: "nav.dailyReports" },
        { href: "/learning-stories", label: "Learning Stories", tKey: "nav.learningStories" },
        { href: "/parent/billing", label: "Billing", tKey: "nav.billing" },
        { href: "/parent/incidents", label: "Incidents", tKey: "nav.incidents" },
        { href: "/parent/health-checks", label: "Health Checks", tKey: "nav.healthChecks" },
        { href: "/parent/update-info", label: "Update Info", tKey: "nav.updateInfo" },
        { href: "/parent/surveys", label: "Surveys", tKey: "nav.surveys" },
        { href: "/settings", label: "Settings", tKey: "nav.settings" },
      ],
    },
  ],
};
