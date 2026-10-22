import { chromium } from '/home/daytona/codebase/node_modules/playwright-core/index.mjs';
import { install } from './serve.mjs';

const browser = await chromium.launch({ headless: true, executablePath: '/home/daytona/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0,200)));
await page.route('http://harness.local/**', await install());
await page.goto('http://harness.local/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2200);

const saved = async () => { await page.waitForTimeout(1100); return page.evaluate(() => window.__savedDesign); };
const el = (d, name) => d.pages[0].elements.find((e) => e.name === name);
const out = {};

// select Names
await page.getByRole('button', { name: 'Names layer' }).click();
await page.waitForTimeout(200);

// --- SE handle probe
const se = page.locator('span[style*="nwse-resize"]').last();
const seBox = await se.boundingBox();
out.seBox = seBox;
out.hitAtSe = await page.evaluate(([x, y]) => {
  const n = document.elementFromPoint(x, y);
  return n ? n.tagName + '|' + n.className.slice(0, 60) + '|' + n.style.cssText.slice(0, 120) : null;
}, [seBox.x + seBox.width / 2, seBox.y + seBox.height / 2]);

const before = el(await saved(), 'Names');
out.before = [before.w, before.h, before.x, before.y];
await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2);
await page.mouse.down();
await page.mouse.move(seBox.x + seBox.width / 2 + 80, seBox.y + seBox.height / 2 + 60, { steps: 12 });
await page.mouse.up();
const after = el(await saved(), 'Names');
out.afterResize = [after.w, after.h, after.x, after.y];

// --- undo probe (Escape first so no input/canvas click ambiguity)
await page.keyboard.press('Escape');
await page.keyboard.press('Control+z');
const undone = el(await saved(), 'Names');
out.afterUndo = [undone.w, undone.h, undone.x, undone.y];
await page.keyboard.press('Control+Shift+z');
const redone = el(await saved(), 'Names');
out.afterRedo = [redone.w, redone.h, redone.x, redone.y];

// --- rotate probe
await page.getByRole('button', { name: 'Names layer' }).click();
await page.waitForTimeout(200);
const rot = page.locator('span.cursor-grab').first();
const rb = await rot.boundingBox();
out.rotBox = rb;
out.hitAtRot = await page.evaluate(([x, y]) => {
  const n = document.elementFromPoint(x, y);
  return n ? n.tagName + '|' + n.className.slice(0, 60) : null;
}, [rb.x + rb.width / 2, rb.y + rb.height / 2]);
await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
await page.mouse.down();
await page.mouse.move(rb.x + rb.width / 2 + 150, rb.y + rb.height / 2 + 100, { steps: 12 });
await page.mouse.up();
out.rotationAfter = el(await saved(), 'Names').rotation;

console.log(JSON.stringify(out, null, 2));
await browser.close();
