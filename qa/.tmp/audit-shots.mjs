import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5173";
const EMAIL = "qa3a.1793962691147@lamsa-qa.test";
const PIN = "482915";
const OUT = "qa/.tmp/audit";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
await page.addInitScript((email) => localStorage.setItem("lamsa.studio.email", email), EMAIL);
await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
const pin = page.getByLabel("Six-digit studio PIN");
await pin.waitFor({ timeout: 25000 });
await pin.click();
await page.keyboard.type(PIN, { delay: 30 });
await page.getByRole("button", { name: /open studio/i }).click();
await page.waitForTimeout(2800);
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}-dashboard.png`, fullPage: false });
const links = await page.locator('a[href^="/invitations/"], a[href^="/studio/"]').evaluateAll((nodes) =>
  [...new Set(nodes.map((node) => node.getAttribute("href")))].slice(0, 8),
);
console.log("project links", links);
const invitation = links.find((href) => href?.startsWith("/invitations/"));
const studio = links.find((href) => href?.startsWith("/studio/"));
if (invitation) {
  await page.goto(`${BASE}${invitation}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}-invitation-editor.png`, fullPage: true });
  console.log("invitation title", await page.title());
}
if (studio) {
  await page.goto(`${BASE}${studio}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2800);
  await page.screenshot({ path: `${OUT}-invitation-studio.png`, fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}-invitation-studio-mobile.png`, fullPage: false });
}
await page.setViewportSize({ width: 1440, height: 960 });
await page.goto(`${BASE}/publishing/ms7f9w7qvdebyyec06xsjvct9h8ht80x`, { waitUntil: "domcontentloaded" });
await page.locator("[data-page-id]").first().waitFor({ timeout: 25000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}-publishing.png`, fullPage: false });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}-publishing-mobile.png`, fullPage: false });
await browser.close();
