import { test, expect } from "@playwright/test";

/**
 * Smoke tests: verify all key pages load without server errors.
 * These don't require authentication — they check the page renders
 * (even if showing an auth gate or empty state).
 */

const PUBLIC_PAGES = [
  "/login",
  "/enroll",
];

const APP_PAGES = [
  "/dashboard",
  "/children",
  "/attendance",
  "/messages",
  "/daily-reports",
  "/records",
  "/learning-stories",
  "/billing",
  "/incidents",
  "/compliance",
  "/analytics",
  "/enrollment",
  "/settings",
  "/staff-management",
  "/calendar",
  "/announcements",
  "/parent",
  "/parent/attendance",
  "/parent/billing",
  "/parent/incidents",
];

test.describe("Public pages load", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} returns 200`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    });
  }
});

test.describe("App pages load (auth gate expected)", () => {
  for (const path of APP_PAGES) {
    test(`${path} returns 200`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    });
  }
});
