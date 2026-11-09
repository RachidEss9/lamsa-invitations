/**
 * Publishing Studio browser smoke suite.
 *
 * Runs against a dev server that is already serving the app (Freebuff starts
 * it): set QA_BASE_URL to override the default. The suite signs in with the
 * QA account, then checks the flows that a release cannot regress:
 *
 *   1. a signed-out deep link never renders the editor,
 *   2. the editor opens with real pages,
 *   3. an impossible margin is refused, explained, and the last valid value
 *      survives a reload,
 *   4. named versions can be created, renamed, cancelled and restored,
 *   5. the Arabic page exports with its image-text disclosure intact,
 *   6. the mobile layout does not scroll sideways.
 *
 * Usage:
 *   PLAYWRIGHT_BROWSERS_PATH=/dev/shm/pw bun qa/browser/publishing-smoke.mjs
 *
 * The QA account below is a throwaway account on a non-production deployment.
 * Override with QA_EMAIL / QA_PIN / QA_PUBLICATION_ID.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:5173";
const PUBLICATION_ID =
  process.env.QA_PUBLICATION_ID ?? "ms7f9w7qvdebyyec06xsjvct9h8ht80x";
const EMAIL = process.env.QA_EMAIL ?? "qa3a.1793962691147@lamsa-qa.test";
const PIN = process.env.QA_PIN ?? "482915";
const EDITOR = `${BASE}/publishing/${PUBLICATION_ID}`;
const TIMEOUT = 25_000;

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
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

async function openEditor() {
  await page.goto(EDITOR, { waitUntil: "domcontentloaded" });
  await page.locator("[data-page-id]").first().waitFor({ timeout: TIMEOUT });
  // Let the first reactive save settle before the test edits anything.
  await page.waitForTimeout(800);
}

try {
  await check("signed-out deep link shows the gate, never the editor", async () => {
    await page.goto(EDITOR, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /continue with email/i }).waitFor({
      timeout: TIMEOUT,
    });
    assert.equal(await page.locator("[data-page-id]").count(), 0);
  });

  await check("QA account signs in with its PIN", async () => {
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

  await check("publication editor opens with its pages", async () => {
    await openEditor();
    const pages = await page.locator("[data-page-id]").count();
    assert.ok(pages > 0, "expected at least one rendered page");
    await page.getByRole("button", { name: /document/i }).waitFor({ timeout: TIMEOUT });
  });

  await check("a negative margin is refused, explained and not stored", async () => {
    const top = page.getByLabel("top (mm)").first();
    await top.waitFor({ timeout: TIMEOUT });
    const before = await top.inputValue();
    await top.fill("-5");
    await top.press("Enter");
    await page
      .getByRole("alert")
      .filter({ hasText: /can’t be negative/i })
      .waitFor({ timeout: 5000 });
    assert.equal(await top.inputValue(), before, "field should return to the last valid value");
  });

  await check("a margin that would cover the page names the limit", async () => {
    const top = page.getByLabel("top (mm)").first();
    await top.fill("400");
    await top.press("Enter");
    await page
      .getByRole("alert")
      .filter({ hasText: /must stay under .* so the page keeps a live area/i })
      .waitFor({ timeout: 5000 });
    assert.equal(await top.inputValue(), "15", "15 mm is the stored margin");
  });

  await check("the refused margins survive a reload unchanged", async () => {
    await openEditor();
    const top = page.getByLabel("top (mm)").first();
    await top.waitFor({ timeout: TIMEOUT });
    assert.equal(await top.inputValue(), "15");
  });

  const stamp = new Date().toISOString().slice(0, 19).replace("T", " ");
  const versionName = `QA smoke ${stamp}`;
  const renamed = `${versionName} renamed`;

  await check("a named version can be created from the current document", async () => {
    await page.getByRole("button", { name: /document/i }).click();
    await page.getByRole("menuitem", { name: /named versions/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("heading", { name: /named versions/i }).waitFor({
      timeout: TIMEOUT,
    });
    await dialog.getByPlaceholder(/client review/i).fill(versionName);
    await dialog.getByRole("button", { name: /save version/i }).click();
    await dialog.getByText(versionName, { exact: true }).first().waitFor({ timeout: 15000 });
  });

  await check("a named version can be renamed", async () => {
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: `Rename ${versionName}` }).click();
    const field = dialog.getByLabel("Version name", { exact: true });
    await field.fill(renamed);
    await dialog.getByRole("button", { name: /save name/i }).click();
    await dialog.getByText(renamed, { exact: true }).first().waitFor({ timeout: 15000 });
  });

  await check("restore asks for confirmation and can be cancelled", async () => {
    const dialog = page.getByRole("dialog");
    const row = dialog.locator("li", { hasText: renamed });
    await row.getByRole("button", { name: /^restore$/i }).click();
    await row.getByRole("button", { name: /keep current/i }).click();
    await row.getByRole("button", { name: /^restore$/i }).waitFor();
  });

  await check("restoring a version reloads the editor into that snapshot", async () => {
    const dialog = page.getByRole("dialog");
    const row = dialog.locator("li", { hasText: renamed });
    await row.getByRole("button", { name: /^restore$/i }).click();
    await row.getByRole("button", { name: /restore this version/i }).click();
    await page.locator("[data-page-id]").first().waitFor({ timeout: TIMEOUT });
    await page.getByRole("button", { name: /document/i }).click();
    await page.getByRole("menuitem", { name: /named versions/i }).click();
    await page
      .getByRole("dialog")
      .getByText(renamed, { exact: true })
      .first()
      .waitFor({ timeout: TIMEOUT });
    await page.keyboard.press("Escape");
  });

  await check("the Arabic page exports with an image-text disclosure, no silent omission", async () => {
    await page.getByRole("button", { name: /document/i }).click();
    await page.getByRole("menuitem", { name: /export pdf/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^current page$/i }).click();
    const download = page.waitForEvent("download", { timeout: 120000 }).catch(() => null);
    await dialog.getByRole("button", { name: /^export pdf$/i }).click();
    const result = dialog.locator("[data-export-result]");
    await result.waitFor({ timeout: 120000 });
    const summary = await result.innerText();
    assert.match(
      summary,
      /preserved as an? images?, not selectable/i,
      `expected a raster-text disclosure, got: ${summary}`,
    );
    assert.match(summary, /not selectable in the PDF/i);
    await download;
    await page.keyboard.press("Escape");
  });

  await check("export stops with an explanation when the Arabic font cannot load", async () => {
    // A separate context with no font cache, and the webfont host blocked.
    const offline = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const offlinePage = await offline.newPage();
    await offlinePage.addInitScript(
      (email) => localStorage.setItem("lamsa.studio.email", email),
      EMAIL,
    );
    await offlinePage.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    try {
      await offlinePage.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
      const pin = offlinePage.getByLabel("Six-digit studio PIN");
      await pin.waitFor({ timeout: TIMEOUT });
      await pin.click();
      await offlinePage.keyboard.type(PIN, { delay: 40 });
      await offlinePage.getByRole("button", { name: /open studio/i }).click();
      await offlinePage.waitForTimeout(2600);
      await offlinePage.goto(EDITOR, { waitUntil: "domcontentloaded" });
      await offlinePage.locator("[data-page-id]").first().waitFor({ timeout: TIMEOUT });
      await offlinePage.getByRole("button", { name: /document/i }).click();
      await offlinePage.getByRole("menuitem", { name: /export pdf/i }).click();
      const dialog = offlinePage.getByRole("dialog");
      await dialog.getByRole("button", { name: /^current page$/i }).click();
      await dialog.getByRole("button", { name: /^export pdf$/i }).click();
      await dialog.getByText(/did not load/i).waitFor({ timeout: 120000 });
      assert.equal(
        await dialog.locator("[data-export-result]").count(),
        0,
        "no PDF should be reported as written",
      );
    } finally {
      await offline.close();
    }
  });

  await check("the 390 px layout does not scroll sideways", async () => {
    await openEditor();
    await page.getByRole("dialog").waitFor({ state: "detached" }).catch(() => {});
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    assert.ok(
      overflow.scrollWidth <= overflow.innerWidth,
      `scrollWidth ${overflow.scrollWidth} > ${overflow.innerWidth}`,
    );
  });

  await check("the run produced no console errors", async () => {
    assert.deepEqual(consoleErrors, []);
  });
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} of ${step} checks failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${step} checks passed.`);
}
