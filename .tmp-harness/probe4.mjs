import { chromium } from '/home/daytona/codebase/node_modules/playwright-core/index.mjs';
import { install } from './serve.mjs';

const browser = await chromium.launch({ headless: true, executablePath: '/home/daytona/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('console', (m) => { if (m.text().startsWith('[probe]')) console.log(m.text()); });
await page.route('http://harness.local/**', await install());
await page.goto('http://harness.local/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2200);

await page.getByRole('button', { name: 'Names layer' }).click();
await page.waitForTimeout(200);

await page.evaluate(() => {
  const log = (t, e) => console.log(`[probe] ${t} button=${e.button} id=${e.pointerId} target=${(e.target.className||'').slice(0,30)} @${Math.round(e.clientX)},${Math.round(e.clientY)}`);
  for (const t of ['pointerdown', 'pointermove', 'pointerup']) {
    window.addEventListener(t, (e) => log(t, e), true);
  }
});

const rot = page.locator('span.cursor-grab').first();
const rb = await rot.boundingBox();
console.log('[probe] rotBox', JSON.stringify(rb));
await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
await page.mouse.down();
await page.mouse.move(rb.x + rb.width / 2 + 150, rb.y + rb.height / 2 + 100, { steps: 3 });
await page.mouse.up();
await page.waitForTimeout(1200);
const rotation = await page.evaluate(() => {
  const d = window.__savedDesign;
  return d.pages[0].elements.find((e) => e.name === 'Names').rotation;
});
console.log('[probe] rotation after drag =', rotation);
await browser.close();
