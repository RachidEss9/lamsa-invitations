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

// Watch the element's inline style + hit tests continuously during a SE resize drag.
await page.evaluate(() => {
  window.__trace = [];
  const id = window.__savedDesign.pages[0].elements.find((e) => e.name === 'Names').id;
  window.__id = id;
  window.addEventListener('pointermove', () => {
    const node = document.querySelector(`[aria-label="Names layer"]`);
    if (!node) return;
    const r = node.getBoundingClientRect();
    window.__trace.push([Math.round(r.x), Math.round(r.y), Math.round(r.width)]);
  }, true);
});

const se = page.locator('span[style*="nwse-resize"]').last();
const seBox = await se.boundingBox();
await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2);
await page.mouse.down();
for (let i = 1; i <= 6; i++) {
  await page.mouse.move(seBox.x + seBox.width / 2 + i * 10, seBox.y + seBox.height / 2 + i * 8);
  const s = await page.evaluate(() => {
    const d = window.__savedDesign; const n = d.pages[0].elements.find((e) => e.name === 'Names');
    return [n.x, n.y, n.w, n.h];
  });
  console.log('move', i, JSON.stringify(s));
}
await page.mouse.up();
const trace = await page.evaluate(() => window.__trace.slice(0, 20));
console.log('trace(screen x,y,w):', JSON.stringify(trace));
await browser.close();
