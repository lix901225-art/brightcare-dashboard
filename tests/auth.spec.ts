import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/login/);
    // Should show some form of login UI
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("unauthenticated /dashboard returns 200 (client-side auth gate)", async ({ page }) => {
    const res = await page.goto("/dashboard");
    // Page loads (Next.js serves it), auth check is client-side
    expect(res?.status()).toBe(200);
  });

  test("public /enroll page accessible without login", async ({ page }) => {
    await page.goto("/enroll");
    await expect(page).toHaveURL(/enroll/);
    const heading = await page.textContent("h1");
    expect(heading).toContain("Enroll");
  });

  test("public /invite page accessible without login", async ({ page }) => {
    await page.goto("/invite/invalid-token");
    await expect(page).toHaveURL(/invite/);
  });
});
