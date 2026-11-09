import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5173";
const EMAIL = "qa3a.1793962691147@lamsa-qa.test";
const PIN = "482915";
const ID = "k570me27gs06nb9059b3yqncs98hjtnv";
const OUT = "qa/.tmp";

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
await page.waitForTimeout(3000);
for (const [path, name] of [
  [`/studio/${ID}`, "studio"],
  [`/invitations/${ID}`, "editor"],
]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  console.log("route", path, "url", page.url(), "title", await page.title());
  console.log(
    "body",
    await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      height: document.documentElement.scrollHeight,
      text: document.body.innerText.slice(0, 260).replace(/\s+/g, " "),
    })),
  );
  await page.screenshot({ path: `${OUT}/audit-${name}.png`, fullPage: false });
  if (name === "studio") {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/audit-studio-mobile.png`, fullPage: false });
    await page.setViewportSize({ width: 1440, height: 960 });
  }
}
await browser.close();
