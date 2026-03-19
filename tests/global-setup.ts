import { chromium } from "@playwright/test";
import { join } from "path";

const BASE = "https://app.brightcareos.com";
const PHONE = "6041111111";
const PASSWORD = "Test1234!";
export const AUTH_FILE = join(__dirname, ".auth-state.json");

async function globalSetup() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="tel"], input[name="phone"]', {
    timeout: 15000,
  });
  await page.fill('input[type="tel"], input[name="phone"]', PHONE);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 20000,
  });

  await ctx.storageState({ path: AUTH_FILE });
  await browser.close();
}

export default globalSetup;

// Allow running directly via tsx
if (require.main === module || !module.parent) {
  globalSetup().then(() => console.log("Auth state saved to", AUTH_FILE));
}
