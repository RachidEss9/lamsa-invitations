import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5173";
const EMAIL = "qa3a.1793962691147@lamsa-qa.test";
const PIN = "482915";

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
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /create invitation/i }).first().click();
await page.getByRole("button", { name: /quick blank canvas/i }).click();
await page.getByRole("button", { name: /^create invitation$/i }).last().click();
await page.waitForURL(/\/studio\//, { timeout: 25000 });
await page.waitForTimeout(2500);
console.log("created", page.url());
await page.screenshot({ path: "qa/.tmp/redesign-studio.png" });
console.log(
  await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    header: document.querySelector("[data-studio-header]")?.getBoundingClientRect().height,
    text: document.body.innerText.slice(0, 200).replace(/\s+/g, " "),
  })),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.screenshot({ path: "qa/.tmp/redesign-studio-mobile.png" });
console.log(
  await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    dock: document.querySelectorAll(".studio-dock__item").length,
  })),
);
await browser.close();
