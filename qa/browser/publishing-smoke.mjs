import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5173';
const docId = process.env.QA_PUBLICATION_ID || 'ms7f9w7qvdebyyec06xsjvct9h8ht80x';
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

  // 1. signed-out deep link shows the gate, never the editor
  await page.goto(base + '/publishing/' + docId, { waitUntil: 'domcontentloaded' });
  const gate1 = await page.getByRole('heading', { name: /sign in to continue/i }).isVisible().catch(false);
  console.log('1. gate visible', gate1);
  console.log('1. editor not rendered', (await page.content()).indexOf('object-transform') === -1);

  // 2. QA account signs in with its PIN
  await page.goto(loginUrl, { waitUntil: 'networkidle' });
  const pinInput = page.locator('input[type="password"], input[name="pin"], input[autocomplete="one-time-code"], input[inputmode="numeric"]').first();
  if (await pinInput.isVisible().catch(false)) {
    await pinInput.fill(pin);
    await page.keyboard.press('Enter');
    await page.waitForURL((u) => !u.includes('/auth'), { timeout: 60000 });
    console.log('2. signed in', page.url());
  } else {
    console.log('2. no pin field');
  }

  // 3. publication editor opens with its pages
  await page.goto(base + '/publishing/' + docId, { waitUntil: 'networkidle' });
  const pageCount = await page.getByLabel('Page count').first().textContent().catch(null);
  console.log('3. page count', pageCount);
  console.log('3. document title', await page.title());

  // 4. a negative margin is refused, explained and not stored
  await page.getByRole('button', { name: /margins/i }).first().click();
  const topInput = page.locator('input[aria-label="Top (mm)"]').first();
  const bottomInput = page.locator('input[aria-label="Bottom (mm)"]').first();
  await topInput.fill('-6');
  await bottomInput.fill('-6');
  await page.getByRole('button', { name: /apply/i }).first().click();
  const refused = await page.waitForFunction(
    () => {
      const banner = document.querySelector('[data-conflict], .toast-error, .sonner-toast-error, [class*="toast-error"], [class*="alert"]');
      return banner && banner.innerText.toLowerCase().includes('margin');
    },
    { timeout: 15000 }
  ).catch(() => null);
  console.log('4. negative margins refused', Boolean(refused));
  console.log('4. top mm after refusal', await topInput.inputValue().catch(''));

  // 5. a margin that would cover the page names the limit
  await page.locator('input[aria-label="Right (mm)"]').first().fill('400');
  await page.locator('input[aria-label="Left (mm)"]').first().fill('400');
  await page.getByRole('button', { name: /apply/i }).first().click();
  const limitNotice = await page.waitForFunction(
    () => {
      const banner = document.querySelector('[data-conflict], .toast-error, .sonner-toast-error, [class*="toast-error"], [class*="alert"]');
      if (!banner) return null;
      const text = banner.innerText.toLowerCase();
      return text.includes('5') || text.includes('safe') || text.includes('live');
    },
    { timeout: 15000 }
  ).catch(() => null);
  console.log('5. safe limit offered', Boolean(limitNotice));

  // 6. the refused margins survive a reload unchanged
  await page.reload({ waitUntil: 'networkidle' });
  console.log('6. top mm after reload', await topInput.inputValue().catch(''));

  // 7. a named version can be created from the current document
  await page.locator('a[data-save-as-version], button[data-save-as-version], [href*="versions"], button:has-text("Versions")').first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  const dialog = page.locator('[role="dialog"]');
  await dialog.getByRole('button', { name: /save as version/i }).first().click();
  await dialog.getByLabel('New version name').fill('Final proof');
  await dialog.getByRole('button', { name: /save/i }).first().click();
  await page.waitForTimeout(1500);
  console.log('7. named version created', (await dialog.getByText('Final proof').count()) > 0);

  // 8. a named version can be renamed
  await dialog.getByRole('button', { name: /rename/i }).first().click();
  await dialog.getByLabel('Version name').fill('Production proof');
  await dialog.getByRole('button', { name: /save/i }).first().click();
  await page.waitForTimeout(1500);
  console.log('8. version renamed', (await dialog.getByText('Production proof').count()) > 0);

  // 9. restore asks for confirmation and can be cancelled
  await dialog.getByRole('button', { name: /restore/i }).first().click();
  const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: /restore|replace|confirm/i });
  console.log('9. restore confirmation shown', await confirmDialog.isVisible().catch(false));
  await confirmDialog.getByRole('button', { name: /cancel/i }).first().click();
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 12000 });
  console.log('9. restore cancelled ok');

  // 10. restoring a version reloads the editor into that snapshot
  await dialog.getByRole('button', { name: /restore/i }).first().click();
  await page.waitForURL(base + '/publishing/' + docId, { timeout: 20000 });
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
  console.log('10. editor reloaded after restore', page.url());

  // 11. the Arabic page exports with an image-text disclosure, no silent omission
  await page.locator('button:has([aria-label*="export pdf"]), button:has-text("Export PDF")').or(page.getByRole('button', { name: /export pdf/i })).first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  const dialogB = page.locator('[role="dialog"]');
  console.log('11. Arabic export disclosure', (await dialogB.getByText(/Arabic/i).count()) > 0);

  // 12. export stops with an explanation when the Arabic font cannot load
  console.log('12. blocked explanation present', (await dialogB.getByText(/font/i).or(dialogB.getByText(/typeface/i)).or(dialogB.getByText(/render/i)).count()) > 0);
  await dialogB.getByRole('button', { name: /close/i }).first().click();

  // 13. the 390 px layout does not scroll sideways
  const pages13 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pages13.goto(base + '/publishing/' + docId, { waitUntil: 'networkidle' });
  const overflowRight = await pages13.evaluate(() => {
    let max = 0;
    for (const el of document.querySelectorAll('body, main, .overflow, [class*="overflow"]')) {
      max = Math.max(max, el.scrollWidth - el.clientWidth);
    }
    return max;
  });
  console.log('13. 390 overflow right', overflowRight);
  await pages13.close();

  console.log('completed in', Math.round((Date.now() - startedAt) / 1000), 's');
} catch (error) {
  console.error('FAIL', error && error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
