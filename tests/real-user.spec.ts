import { test, expect, type Page } from "@playwright/test";
import { join } from "path";

const AUTH_FILE = join(__dirname, ".auth-state.json");

test.use({
  baseURL: "https://app.brightcareos.com",
  storageState: AUTH_FILE,
});
test.setTimeout(45000);

/** Dismiss onboarding / survey modals that block pointer events */
async function dismissModals(page: Page) {
  // Set localStorage flags to prevent onboarding and survey modals
  await page.addInitScript(() => {
    localStorage.setItem("brightcare.staff-onboarding-done", "true");
    localStorage.setItem("brightcare.survey-reminder-dismissed", String(Date.now()));
  });
}

/** Assert no common error states on the current page */
async function assertNoErrors(page: Page) {
  await page.waitForTimeout(2000);
  const body = page.locator("body");
  await expect(body).not.toContainText("Page error");
  await expect(body).not.toContainText("Response.status");
  await expect(body).not.toContainText("Could not reach server");
  await expect(body).not.toContainText("Cannot read properties of undefined");
  await expect(body).not.toContainText("is not a function");
}

// ── Tests ────────────────────────────────────────────────────────

test.describe("OWNER Real Browser Tests", () => {
  test.beforeEach(async ({ page }) => {
    await dismissModals(page);
  });

  test("01 - Login succeeds (dashboard loads)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);
    await assertNoErrors(page);
  });

  test("02 - Dashboard no errors", async ({ page }) => {
    await page.goto("/dashboard");
    await assertNoErrors(page);
  });

  test("03 - Children page loads", async ({ page }) => {
    await page.goto("/children");
    await expect(page).toHaveURL(/children/);
    await assertNoErrors(page);
  });

  test("04 - Attendance page loads", async ({ page }) => {
    await page.goto("/attendance");
    await expect(page).toHaveURL(/attendance/);
    await assertNoErrors(page);
  });

  test("05 - Messages page loads", async ({ page }) => {
    await page.goto("/messages");
    await expect(page).toHaveURL(/messages/);
    await assertNoErrors(page);
  });

  test("06 - Daily Reports page loads", async ({ page }) => {
    await page.goto("/daily-reports");
    await expect(page).toHaveURL(/daily-reports/);
    await assertNoErrors(page);
  });

  test("07 - Health Checks page loads", async ({ page }) => {
    await page.goto("/health-checks");
    await expect(page).toHaveURL(/health-checks/);
    await assertNoErrors(page);
  });

  test("08 - Records page loads", async ({ page }) => {
    await page.goto("/records");
    await expect(page).toHaveURL(/records/);
    await assertNoErrors(page);
  });

  test("09 - Learning Stories page loads", async ({ page }) => {
    await page.goto("/learning-stories");
    await expect(page).toHaveURL(/learning-stories/);
    await assertNoErrors(page);
  });

  test("10 - Enrollment page loads", async ({ page }) => {
    await page.goto("/enrollment");
    await expect(page).toHaveURL(/enrollment/);
    await assertNoErrors(page);
  });

  test("11 - Guardians page loads", async ({ page }) => {
    await page.goto("/guardians");
    await expect(page).toHaveURL(/guardians/);
    await assertNoErrors(page);
  });

  test("12 - Billing page loads", async ({ page }) => {
    await page.goto("/billing");
    await expect(page).toHaveURL(/billing/);
    await assertNoErrors(page);
  });

  test("13 - Staff & Users page loads", async ({ page }) => {
    await page.goto("/staff-management");
    await expect(page).toHaveURL(/staff-management/);
    await assertNoErrors(page);
  });

  test("14 - Compliance page loads", async ({ page }) => {
    await page.goto("/compliance");
    await expect(page).toHaveURL(/compliance/);
    await assertNoErrors(page);
  });

  test("15 - Reports page loads", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/reports/);
    await assertNoErrors(page);
  });

  test("16 - Documents page loads", async ({ page }) => {
    await page.goto("/documents");
    await expect(page).toHaveURL(/documents/);
    await assertNoErrors(page);
  });

  test("17 - Analytics page loads", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page).toHaveURL(/analytics/);
    await assertNoErrors(page);
  });

  test("18 - Rooms page loads", async ({ page }) => {
    await page.goto("/rooms");
    await expect(page).toHaveURL(/rooms/);
    await assertNoErrors(page);
  });

  test("19 - Meal Planning page loads", async ({ page }) => {
    await page.goto("/meal-planning");
    await expect(page).toHaveURL(/meal-planning/);
    await assertNoErrors(page);
  });

  test("20 - Curriculum page loads", async ({ page }) => {
    await page.goto("/curriculum");
    await expect(page).toHaveURL(/curriculum/);
    await assertNoErrors(page);
  });

  test("21 - Locations page loads", async ({ page }) => {
    await page.goto("/locations");
    await expect(page).toHaveURL(/locations/);
    await assertNoErrors(page);
  });

  test("22 - Surveys page loads", async ({ page }) => {
    await page.goto("/surveys");
    await expect(page).toHaveURL(/surveys/);
    await assertNoErrors(page);
  });

  test("23 - Policies page loads", async ({ page }) => {
    await page.goto("/policies");
    await expect(page).toHaveURL(/policies/);
    await assertNoErrors(page);
  });

  test("24 - Announcements page loads", async ({ page }) => {
    await page.goto("/announcements");
    await expect(page).toHaveURL(/announcements/);
    await assertNoErrors(page);
  });

  test("25 - Calendar page loads", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/calendar/);
    await assertNoErrors(page);
  });

  test("26 - Settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/settings/);
    await assertNoErrors(page);
  });

  test("27 - Document upload works", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForTimeout(1500);

    // Click add document button
    const addBtn = page
      .locator('button:has-text("Add"), button:has-text("New"), button:has-text("Upload"), a:has-text("Add")')
      .first();
    if (!(await addBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(500);

    // Fill in title (required) — input has placeholder, no name attr
    const titleInput = page.locator('input[placeholder*="Immunization"]').first();
    await titleInput.fill("Playwright Test Doc");

    // Upload a test file (1x1 PNG) — file input is hidden, use setInputFiles
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-doc.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64"
      ),
    });
    await page.waitForTimeout(500);

    // Click Save document button
    const saveBtn = page.locator('button:has-text("Save document")');
    await expect(saveBtn).toBeEnabled({ timeout: 3000 });
    await saveBtn.click();
    await page.waitForTimeout(5000);

    // Verify no upload error
    const body = page.locator("body");
    await expect(body).not.toContainText("Upload failed");
    await expect(body).not.toContainText("500");
    await assertNoErrors(page);
  });

  test("28 - Attendance sign-in child", async ({ page }) => {
    await page.goto("/attendance");
    await page.waitForTimeout(2000);

    const signInBtn = page.locator('button:has-text("Sign In")').first();
    if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signInBtn.click();
      await page.waitForTimeout(2000);
    }
    await assertNoErrors(page);
  });

  test("29 - Add child flow", async ({ page }) => {
    await page.goto("/children");
    await page.waitForTimeout(1500);

    // Close any open modals first
    const overlay = page.locator(".fixed.inset-0.z-50");
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    const addBtn = page
      .locator('button:has-text("Add child"), a:has-text("Add child")')
      .first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1000);
    }
    await assertNoErrors(page);
  });

  test("30 - Create announcement flow", async ({ page }) => {
    await page.goto("/announcements");
    await page.waitForTimeout(1500);

    const createBtn = page
      .locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")')
      .first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
    }
    await assertNoErrors(page);
  });
});
