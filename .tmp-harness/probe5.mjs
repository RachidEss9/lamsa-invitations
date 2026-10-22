import { chromium } from '/home/daytona/codebase/node_modules/playwright-core/index.mjs';
import { install } from './serve.mjs';

const browser = await chromium.launch({ headless: true, executablePath: '/home/daytona/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.route('http://harness.local/**', await install());
await page.goto('http://harness.local/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2200);

const saved = async () => { await page.waitForTimeout(1100); return page.evaluate(() => window.__savedDesign); };
const el = (d, name) => d.pages[0].elements.find((e) => e.name === name);
const namesLayer = page.getByRole('button', { name: 'Names layer' });
const step = async (label, fn) => { try { await fn(); } catch (e) { console.log(label, 'ERROR', String(e).slice(0, 120)); } const d = await saved(); const n = el(d, 'Names'); console.log(label, JSON.stringify({ x: n.x, y: n.y, w: n.w, h: n.h, rot: n.rotation, fs: n.fontSize, count: d.pages[0].elements.length })); };

await namesLayer.click();
await step('after-select', async () => {});

// inline edit replay
await namesLayer.dblclick();
const editor = page.locator('[role="textbox"]');
await editor.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
await page.keyboard.press('Control+A');
await page.keyboard.type('ليلى وعمر', { delay: 5 });
await page.keyboard.press('Enter');
await step('after-inlineEdit', async () => {});

// drag
let box = await namesLayer.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 44, box.y + box.height / 2 + 30, { steps: 8 });
await page.mouse.up();
await step('after-drag', async () => {});

// resize with hit log
const se = page.locator('span[style*="nwse-resize"]').last();
const seBox = await se.boundingBox();
const hit = await page.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return n ? n.style.cssText.slice(0, 90) : 'none'; }, [seBox.x + seBox.width / 2, seBox.y + seBox.height / 2]);
console.log('se-hit:', hit);
await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2);
await page.mouse.down();
await page.mouse.move(seBox.x + 60, seBox.y + 45, { steps: 8 });
await page.mouse.up();
await step('after-resize', async () => {});

// rotate with hit log
const rot = page.locator('span.cursor-grab').first();
const rb = await rot.boundingBox();
const hit2 = await page.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return n ? n.className.slice(0, 60) : 'none'; }, [rb.x + rb.width / 2, rb.y + rb.height / 2]);
console.log('rot-hit:', hit2);
await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
await page.mouse.down();
await page.mouse.move(rb.x + 120, rb.y + 70, { steps: 10 });
await page.mouse.up();
await step('after-rotate', async () => {});

// inspector geometry + aspect + undo, like the test
const inspector = page.locator('aside').last();
const xInput = inspector.locator('label:has-text("X") input').first();
await xInput.fill('200'); await xInput.blur();
const wInput = inspector.locator('label:has-text("W") input').first();
await wInput.fill('400'); await wInput.blur();
await step('after-geomW', async () => {});
await page.keyboard.press('Escape');
await page.keyboard.press('Control+z');
await step('after-undo', async () => {});
await page.keyboard.press('Control+Shift+z');
await step('after-redo', async () => {});
console.log('namesBox now:', JSON.stringify(await namesLayer.boundingBox()));
await browser.close();
