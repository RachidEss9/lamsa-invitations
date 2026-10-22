import { chromium } from '/home/daytona/codebase/node_modules/playwright-core/index.mjs';
import { install } from './serve.mjs';

const browser = await chromium.launch({ headless: true, executablePath: '/home/daytona/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.route('http://harness.local/**', await install());
await page.goto('http://harness.local/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2200);

const namesLayer = page.getByRole('button', { name: 'Names layer' });
await namesLayer.click();
await page.waitForTimeout(300);
await page.evaluate(() => { window.__dragLog = []; });

// 1) plain SE resize right after selection
const se = page.locator('span[style*="nwse-resize"]').last();
let b = await se.boundingBox();
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.mouse.down();
await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 40, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(1100);
let d = await page.evaluate(() => window.__savedDesign.pages[0].elements.find((e) => e.name === 'Names'));
console.log('A after plain resize:', JSON.stringify([d.x, d.y, d.w, d.h]));
console.log('A log:', JSON.stringify(await page.evaluate(() => window.__dragLog)));

// 2) now move it, then resize again (the failing combo from probe5)
await page.evaluate(() => { window.__dragLog = []; });
const box = await namesLayer.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 44, box.y + box.height / 2 + 30, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(1100);
d = await page.evaluate(() => window.__savedDesign.pages[0].elements.find((e) => e.name === 'Names'));
console.log('B after move:', JSON.stringify([d.x, d.y, d.w, d.h]));

b = await se.boundingBox();
console.log('B seBox:', JSON.stringify(b));
await page.evaluate(() => { window.__dragLog = []; });
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.mouse.down();
await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 40, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(1100);
d = await page.evaluate(() => window.__savedDesign.pages[0].elements.find((e) => e.name === 'Names'));
console.log('B after resize:', JSON.stringify([d.x, d.y, d.w, d.h]));
console.log('B log:', JSON.stringify(await page.evaluate(() => window.__dragLog)));
await browser.close();
