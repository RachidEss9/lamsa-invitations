import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5173";
const EMAIL = "qa3a.1793962691147@lamsa-qa.test";
const PIN = "482915";
const PUB = "ms7f9w7qvdebyyec06xsjvct9h8ht80x";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
page.on("pageerror", (error) => errors.push(String(error)));
await page.addInitScript((email) => localStorage.setItem("lamsa.studio.email", email), EMAIL);
await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
const pin = page.getByLabel("Six-digit studio PIN");
await pin.waitFor({ timeout: 25000 });
await pin.click();
await page.keyboard.type(PIN, { delay: 30 });
await page.getByRole("button", { name: /open studio/i }).click();
await page.waitForTimeout(3000);
await page.goto(`${BASE}/publishing/${PUB}`, { waitUntil: "domcontentloaded" });
await page.locator("[data-page-id]").first().waitFor({ timeout: 25000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "qa/.tmp/redesign-publishing.png" });
console.log(
  await page.evaluate(() => {
    const box = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
    };
    return {
      width: document.documentElement.scrollWidth,
      header: box("[data-studio-header]"),
      sidebar: box(".studio-sidebar"),
      canvas: box(".studio-canvas-column"),
      inspector: box(".studio-inspector"),
      status: box(".studio-statusbar"),
      title: document.querySelector("[data-studio-header]")?.textContent?.replace(/\s+/g, " ").slice(0, 100),
    };
  }),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
await page.screenshot({ path: "qa/.tmp/redesign-publishing-mobile.png" });
console.log(
  await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    dock: document.querySelectorAll(".studio-dock__item").length,
    headerHeight: document.querySelector("[data-studio-header]")?.getBoundingClientRect().height,
  })),
);
console.log("errors", errors.slice(0, 5));
await browser.close();
