/**
 * Elements Library browser checks.
 *
 * Covers the two surfaces that share the catalogue — the publishing editor's
 * Elements panel and the main /library workspace — plus insertion, persistence,
 * undo/redo and favourites.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/dev/shm/pw bun qa/browser/library-elements.mjs
 *
 * The QA account is a throwaway account on a non-production deployment.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:5173";
const PUBLICATION_ID =
  process.env.QA_PUBLICATION_ID ?? "ms7f9w7qvdebyyec06xsjvct9h8ht80x";
const EMAIL = process.env.QA_EMAIL ?? "qa3a.1793962691147@lamsa-qa.test";
const PIN = process.env.QA_PIN ?? "482915";
const EDITOR = `${BASE}/publishing/${PUBLICATION_ID}`;
const TIMEOUT = 30_000;

const failures = [];
let step = 0;

async function check(name, run) {
  step += 1;
  const label = `${step}. ${name}`;
  try {
    await run();
    console.log(`PASS  ${label}`);
  } catch (error) {
    failures.push({ name: label, error });
    console.error(`FAIL  ${label}\n      ${String(error?.message ?? error).split("\n")[0]}`);
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));

async function openEditor() {
  await page.goto(EDITOR, { waitUntil: "domcontentloaded" });
  await page.locator("[data-page-id]").first().waitFor({ timeout: TIMEOUT });
  await page.waitForTimeout(900);
}

async function objectCount() {
  const label = page.getByText(/^\d+ objects$/).first();
  await label.waitFor({ timeout: TIMEOUT });
  return Number((await label.innerText()).split(" ")[0]);
}

async function waitForObjectCount(expected) {
  await page.waitForFunction(
    (count) => {
      const spans = [...document.querySelectorAll("span")];
      const label = spans.find((span) => /^\d+ objects$/.test(span.textContent ?? ""));
      return Boolean(label) && Number((label.textContent ?? "").split(" ")[0]) === count;
    },
    expected,
    { timeout: 10_000 },
  );
}

try {
  await check("QA account signs in with its PIN", async () => {
    await page.goto(EDITOR, { waitUntil: "domcontentloaded" });
    await page.evaluate((email) => {
      localStorage.setItem("lamsa.studio.email", email);
    }, EMAIL);
    await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
    const pin = page.getByLabel("Six-digit studio PIN");
    await pin.waitFor({ timeout: TIMEOUT });
    await pin.click();
    await page.keyboard.type(PIN, { delay: 40 });
    await page.getByRole("button", { name: /open studio/i }).click();
    await page.waitForTimeout(2600);
  });

  await check("the editor exposes an Elements panel", async () => {
    await openEditor();
    await page.getByRole("button", { name: "Elements", exact: true }).click();
    await page.getByLabel("Search elements").waitFor({ timeout: TIMEOUT });
    await page.getByText(/assets$/i).first().waitFor({ timeout: 5000 });
  });

  await check("search narrows the catalogue to real matches", async () => {
    const search = page.getByLabel("Search elements");
    await search.fill("rose");
    await page.waitForTimeout(500);
    const cards = page.locator('aside [role="button"][aria-label]');
    const count = await cards.count();
    assert.ok(count > 3, `expected several roses, found ${count}`);
    assert.ok(
      (await page.locator("aside [role='button']").first().getAttribute("aria-label"))?.match(/rose/i),
      "the first result should be a rose",
    );
    await search.fill("");
    await page.waitForTimeout(400);
  });

  await check("a preview opens and inserts a native object", async () => {
    const before = await objectCount();
    await page.getByLabel("Search elements").fill("garden rose");
    await page.waitForTimeout(700);
    const card = page
      .locator('aside')
      .first()
      .locator('[role="button"]')
      .filter({ hasText: "Garden rose" })
      .first();
    await card.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("heading", { name: /garden rose/i }).waitFor({ timeout: TIMEOUT });
    await dialog.getByRole("button", { name: /insert into page/i }).click();
    await page.waitForTimeout(1200);
    assert.equal(await objectCount(), before + 1, "the element should add one page object");
  });

  await check("undo and redo work on an inserted element", async () => {
    const before = await objectCount();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await waitForObjectCount(before - 1);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await waitForObjectCount(before);
    await page.waitForTimeout(4000);
  });

  await check("the inserted element survives a reload", async () => {
    await openEditor();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.getByText("Garden rose").first().waitFor({ timeout: TIMEOUT });
  });

  await check("the main Library opens with all its sections", async () => {
    await page.goto(`${BASE}/library`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Elements", exact: true }).waitFor({ timeout: TIMEOUT });
    const sections = page.getByRole("navigation", { name: "Library sections" }).getByRole("button");
    assert.equal(await sections.count(), 11);
    await page.getByLabel("Search elements").waitFor({ timeout: TIMEOUT });
    await page.getByText(/900 assets/).first().waitFor({ timeout: 5000 });
  });

  const nav = () => page.getByRole("navigation", { name: "Library sections" });

  await check("library sections are views over the same catalogue", async () => {
    await nav().getByRole("button", { name: /^Icons/ }).click();
    await page.getByText(/120 assets/).first().waitFor({ timeout: 5000 });
    await nav().getByRole("button", { name: /^Patterns/ }).click();
    await page.getByText(/assets/).first().waitFor({ timeout: 5000 });
    await page.getByLabel("Search elements").fill("chevron");
    await page.waitForTimeout(500);
    assert.ok((await page.locator('[role="button"][aria-label]').count()) > 0);
  });

  await check("favourites persist across a reload", async () => {
    await nav().getByRole("button", { name: /^Elements/ }).click();
    await page.getByLabel("Search elements").fill("garden rose");
    await page.waitForTimeout(800);
    const card = page
      .locator('section [role="button"]')
      .filter({ hasText: "Garden rose" })
      .first();
    assert.equal(await card.count(), 1, "expected the searched card in the library grid");
    await card.hover();
    const star = card.getByRole("button", { name: /favorites/ }).first();
    if ((await star.getAttribute("aria-pressed")) !== "true") {
      await star.click();
    }
    await page.waitForTimeout(1200);
    await page.reload({ waitUntil: "domcontentloaded" });
    await nav().getByRole("button", { name: /^Favorites/ }).click();
    await page.waitForTimeout(1200);
    await page.locator('button[aria-label="Remove from favorites"]').first().waitFor({
      timeout: TIMEOUT,
    });
    assert.ok((await page.locator('button[aria-label="Remove from favorites"]').count()) > 0);
  });

  await check("an upload joins My Uploads and can be removed", async () => {
    const name = `QA library upload ${Date.now()}`;
    await page.goto(`${BASE}/library?section=uploads`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "My Uploads" }).waitFor({ timeout: TIMEOUT });
    await page.getByRole("button", { name: /upload file/i }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: TIMEOUT });
    // A one-pixel PNG is enough to exercise storage, the record and thumbnails.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "qa-pixel.png",
      mimeType: "image/png",
      buffer: png,
    });
    await dialog.getByLabel("Upload name").fill(name);
    await dialog.getByRole("button", { name: /^upload$/i }).click();
    await page.getByText(name, { exact: true }).first().waitFor({ timeout: TIMEOUT });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText(name, { exact: true }).first().waitFor({ timeout: TIMEOUT });
    await page.getByLabel(`Delete ${name}`).click();
    await page.getByRole("button", { name: /^delete upload$/i }).click();
    await page.waitForTimeout(1200);
    assert.equal(await page.getByText(name, { exact: true }).count(), 0);
  });

  await check("the run produced no console errors", async () => {
    assert.deepEqual(consoleErrors, [], consoleErrors.slice(0, 3).join(" | "));
  });
} finally {
  await context.close();
  await browser.close();
}

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} of ${step} checks failed.`);
  process.exit(1);
}
console.log(`All ${step} checks passed.`);
