import { chromium } from '/home/daytona/codebase/node_modules/playwright-core/index.mjs';
import { install } from './serve.mjs';

const browser = await chromium.launch({ headless: true, executablePath: '/home/daytona/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.route('http://harness.local/**', await install());
await page.goto('http://harness.local/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const layer = document.querySelector('[aria-label="Names layer"]');
  const r = layer.getBoundingClientRect();
  const mid = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
  const wrap = document.querySelector('main > div div[class*="overflow-hidden"]');
  const mainBox = document.querySelector('main')?.getBoundingClientRect();
  const strip = [...document.querySelectorAll('div')].find(d => d.className.includes('overflow-x-auto') && d.className.includes('border-t'));
  return {
    layer: { x: r.x, y: r.y, w: r.width, h: r.height },
    midTag: mid ? mid.tagName + '.' + mid.className.slice(0,80) : null,
    strip: strip ? strip.getBoundingClientRect() : null,
    mainBox,
    vh: innerHeight, vw: innerWidth,
    scrollH: document.documentElement.scrollHeight,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
