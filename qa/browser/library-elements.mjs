import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5173';
const section = process.env.QA_LIBRARY_SECTION || 'elements';
const pin = process.env.QA_PIN || '482915';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
  args: [
    '--headless',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--no-zygote',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
  ],
});

const page = await browser.newPage();
const startedAt = Date.now();

await page.setDefaultTimeout(90000);
const loginUrl = base + '/dashboard?login=qa';

try {
  console.log('start', new Date().toISOString());
  await page.goto(loginUrl, { waitUntil: 'networkidle' });

  if (page.url().includes('/auth')) {
    const pinInput = page.locator('input[type="password"], input[name="pin"], input[autocomplete="one-time-code"], input[inputmode="numeric"]').first();
    if (await pinInput.isVisible().catch(false)) {
      await pinInput.fill(pin);
      await page.keyboard.press('Enter');
      await page.waitForURL((u) => !u.includes('/auth'), { timeout: 60000 });
      console.log('unlocked with PIN');
    }
  }

  console.log('current url', page.url());
  console.log('title', await page.title());

  // 1. open the searchable elements library
  await page.goto(base + '/library/' + section, { waitUntil: 'networkidle' });
  const heading = await page.getByRole('heading', { name: new RegExp(section, 'i') }).first().textContent().catch('');
  console.log('1. library heading', heading);

  // 2. search box is present and filters results
  const search = page.getByRole('textbox', { name: /search|catalog|find/i }).or(page.locator('input[aria-label*="search"], input[type="search"]').first());
  if (await search.isVisible().catch(false)) {
    await search.fill('leaf');
    await page.waitForTimeout(800);
    const resultCount = await page.locator('[role="listitem"], [role="option"], article, li').count();
    console.log('2. search visible, items after "leaf"', resultCount);
  } else {
    console.log('2. no search input found');
  }

  // 3. category tabs/pills exist
  const categories = page.getByRole('tablist').or(page.locator('[role="group"], .category-pills, [class*="category"]')).first();
  const catCount = await categories.locator('button, a, [role="tab"]').count().catch(0);
  console.log('3. category controls found', catCount);

  // 4. at least one insertable element is present
  const insertTargets = await page.locator('[role="button"], button:not([disabled]), .element-card, [class*="element"]').count().catch(0);
  console.log('4. insertable elements found', insertTargets);

  // 5. library remains usable on a narrow viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (document.body.style.overflowX = 'visible'));
  const overflowRight = await page.evaluate(() => {
    let max = 0;
    for (const el of document.querySelectorAll('body, main, .overflow, [class*="overflow"]')) {
      max = Math.max(max, el.scrollWidth - el.clientWidth);
    }
    return max;
  });
  console.log('5. 390 overflow right', overflowRight);

  console.log('completed in', Math.round((Date.now() - startedAt) / 1000), 's');
} catch (error) {
  console.error('FAIL', error && error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
