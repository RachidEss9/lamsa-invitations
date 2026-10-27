import { chromium } from "playwright-core";
import fs from "node:fs";

const EXEC =
  "/home/daytona/.cache/qa/chrome-headless-shell-linux64/chrome-headless-shell";
const BASE = "http://localhost:5173";
const OUT = "/home/daytona/codebase/.qa-shots";
fs.mkdirSync(OUT, { recursive: true });

const logs = [];
const browser = await chromium.launch({
  executablePath: EXEC,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36",
});

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  logs.push(`shot ${name}`);
}

async function stageOf(page) {
  return page
    .locator("[data-interactive-opening]")
    .getAttribute("data-stage")
    .catch(() => null);
}

async function openPage(query) {
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") logs.push(`[console.error] ${msg.text()}`);
  });
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));
  await page.goto(`${BASE}/qa-opening.html${query}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  return page;
}

/* ---------- 1. guest sequence, plain built-in artwork ---------- */
{
  const page = await openPage("");
  logs.push(`initial stage=${await stageOf(page)}`);
  await shot(page, "01-sealed");

  // No autoplay: verify nothing moved while idle.
  await page.waitForTimeout(1800);
  logs.push(`after idle stage=${await stageOf(page)}`);
  await shot(page, "02-sealed-idle");

  // Tap the seal.
  await page.getByRole("button", { name: "Tap the seal to begin" }).tap();
  await page.waitForTimeout(350);
  await shot(page, "03-seal-midbreak");
  await page.waitForTimeout(1500);
  logs.push(`after seal stage=${await stageOf(page)}`);
  await shot(page, "04-unsealed");

  // Lift the flap — capture mid-swing.
  await page.getByRole("button", { name: "Lift the flap" }).tap();
  await page.waitForTimeout(500);
  await shot(page, "05-flap-midlift");
  await page.waitForTimeout(1600);
  logs.push(`after flap stage=${await stageOf(page)}`);
  await shot(page, "06-open-card-in-pocket");

  // Pull the card out.
  await page
    .getByRole("button", { name: /Pull the invitation out|Open the invitation/ })
    .tap();
  await page.waitForTimeout(450);
  await shot(page, "07-card-middraw");
  await page.waitForTimeout(1600);
  logs.push(`after pull stage=${await stageOf(page)}`);
  await shot(page, "08-presented");

  // Hand-off.
  await page.getByRole("button", { name: "Tap to open the invitation" }).tap();
  await page.waitForTimeout(500);
  logs.push(`done count=${await page.locator("[data-qa-done]").textContent()}`);
  await shot(page, "09-after-handoff");

  // Impatient: hammer the seal from a reload.
  const page2 = await openPage("");
  for (let i = 0; i < 4; i++) {
    await page2.getByRole("button", { name: "Tap the seal to begin" }).tap({ force: true });
  }
  await page2.waitForTimeout(2200);
  logs.push(`hammer stage=${await stageOf(page2)}`);
  await shot(page2, "10-hammered");
  await page2.close();
  await page.close();
}

/* ---------- 2. drag interactions (mouse emulates pointer) ---------- */
{
  const page = await openPage("");
  await page.getByRole("button", { name: "Tap the seal to begin" }).tap();
  await page.waitForTimeout(2200);
  const flap = page.getByRole("button", { name: "Lift the flap" });
  const box = await flap.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.45, { steps: 8 });
    await shot(page, "11-flap-drag-mid");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1800);
    logs.push(`after drag stage=${await stageOf(page)}`);
    await shot(page, "12-flap-after-drag");
  }
  // Short drag → spring back.
  const page2 = await openPage("");
  await page2.getByRole("button", { name: "Tap the seal to begin" }).tap();
  await page2.waitForTimeout(2200);
  const flap2 = page2.getByRole("button", { name: "Lift the flap" });
  const box2 = await flap2.boundingBox();
  if (box2) {
    await page2.mouse.move(box2.x + box2.width / 2, box2.y + box2.height * 0.7);
    await page2.mouse.down();
    await page2.mouse.move(box2.x + box2.width / 2, box2.y + box2.height * 0.62, { steps: 5 });
    await page2.mouse.up();
    await page2.waitForTimeout(900);
    logs.push(`short drag stage=${await stageOf(page2)}`);
    await shot(page2, "13-short-drag-springback");
  }
  await page2.close();
  await page.close();
}

/* ---------- 3. uploaded assets resolve into their layers ---------- */
{
  const page = await openPage("?layers=1");
  await page.waitForTimeout(500);
  await shot(page, "14-layers-sealed");
  const layerCount = await page.locator("[data-layer-image]").count();
  const layerStates = await page.$$eval("[data-layer-image]", (els) =>
    els.map((el) => ({
      src: (el.getAttribute("src") || "").slice(0, 40),
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
      opacity: getComputedStyle(el).opacity,
    })),
  );
  logs.push(`layer images=${layerCount} states=${JSON.stringify(layerStates)}`);
  await page.getByRole("button", { name: "Tap the seal to begin" }).tap();
  await page.waitForTimeout(2200);
  await shot(page, "15-layers-unsealed");
  await page.getByRole("button", { name: "Lift the flap" }).tap();
  await page.waitForTimeout(2400);
  await shot(page, "16-layers-open");
  await page.close();
}

/* ---------- 4. OpeningStage path (studio preview / public journey) ---------- */
{
  const page = await openPage("?mode=stage");
  await page.waitForTimeout(500);
  await shot(page, "17-stage-sealed");
  logs.push(
    `stage-path data-stage=${await page
      .locator("[data-interactive-opening]")
      .getAttribute("data-stage")
      .catch(() => "n/a")}`,
  );
  await page.getByRole("button", { name: "Tap the seal to begin" }).tap();
  await page.waitForTimeout(2400);
  await page.getByRole("button", { name: "Lift the flap" }).tap();
  await page.waitForTimeout(2600);
  await shot(page, "18-stage-open");
  logs.push(
    `stage-path after flap=${await page
      .locator("[data-interactive-opening]")
      .getAttribute("data-stage")
      .catch(() => "n/a")}`,
  );
  await page.close();
}

/* ---------- 5. reduced motion hands straight over ---------- */
{
  const page = await openPage("?rm=1");
  await page.waitForTimeout(900);
  logs.push(`reduced-motion done count=${await page.locator("[data-qa-done]").textContent()}`);
  await shot(page, "19-reduced-motion");
  await page.close();
}

/* ---------- 6. small phone (360×640) and pinned editor stills ---------- */
{
  const small = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await small.newPage();
  await page.goto(`${BASE}/qa-opening.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await shot(page, "20-small-phone-sealed");
  const hintBox = await page.locator("[data-hint]").boundingBox().catch(() => null);
  logs.push(`small phone hint box=${JSON.stringify(hintBox)}`);
  const sealBox = await page
    .getByRole("button", { name: "Tap the seal to begin" })
    .boundingBox()
    .catch(() => null);
  logs.push(`small phone seal box=${JSON.stringify(sealBox)}`);
  await small.close();

  const stills = ["sealed", "unsealed", "open", "presented"];
  for (const s of stills) {
    const p = await openPage(`?stage=${s}`);
    await shot(p, `21-still-${s}`);
    await p.close();
  }
}

console.log(logs.join("\n"));
await browser.close();