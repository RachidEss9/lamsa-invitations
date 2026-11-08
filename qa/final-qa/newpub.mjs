import { open, BASE } from "/dev/shm/qa/lib.mjs";

const { browser, page, errors } = await open();
await page.goto(BASE + "/publishing", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /new publication/i }).click();
await page.waitForTimeout(400);
const dialog = page.getByRole("dialog");
await dialog.locator("input").first().fill("Final QA Studio 2026");
await dialog.getByRole("button", { name: /create & open/i }).click();
await page.waitForTimeout(4000);
console.log("URL", page.url());
console.log((await page.locator("body").innerText()).slice(0, 600));
console.log("ERR", errors.slice(0, 4));
await browser.close();
