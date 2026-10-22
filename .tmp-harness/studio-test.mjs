import { chromium } from '/home/daytona/codebase/node_modules/playwright-core/index.mjs';
import { install } from './serve.mjs';

const browser = await chromium.launch({ headless: true, executablePath: '/home/daytona/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
await page.route('http://harness.local/**', await install());
await page.goto('http://harness.local/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2500);

const results = {};
const saved = async () => {
  await page.waitForTimeout(1100);
  return page.evaluate(() => window.__savedDesign);
};
const el = (design, name) => design.pages[0].elements.find((e) => e.name === name);
const namesLayer = page.getByRole('button', { name: 'Names layer' });
const inspector = page.locator('aside').last();
const nameField = inspector.locator('input[aria-label="Layer name"]');

// 1. selection shows that layer's properties
await namesLayer.click();
results.selection = {
  inspectorName: await nameField.inputValue(),
  canvasCount: await page.locator('main [data-element-id]').count(),
};

// 2. font size applies only to the selected layer
const sizeInput = inspector.locator('label:has-text("Size") input').first();
await sizeInput.fill('120');
await sizeInput.blur();
await page.waitForTimeout(150);
let design = await saved();
results.fontSize = {
  names: el(design, 'Names').fontSize,
  others: design.pages[0].elements.filter((e) => e.name !== 'Names' && e.kind === 'text').map((e) => e.fontSize),
  rendered: await page.locator('main [data-element-id]').evaluateAll((nodes) => nodes.map((n) => [n.querySelector('div')?.style.fontSize, n.style.width])),
};

// 3. inline text editing: double-click, Arabic text, Enter
await namesLayer.dblclick();
const editor = page.locator('[role="textbox"]');
await editor.waitFor({ state: 'visible', timeout: 5000 });
await page.keyboard.press('Meta+A');
await page.keyboard.type('ليلى وعمر', { delay: 8 });
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
design = await saved();
results.inlineEdit = {
  saved: el(design, 'Names').text,
  rendered: await page.locator(`main [data-element-id="${el(design, 'Names').id}"]`).first().innerText(),
};

// 4. drag moves the layer
const beforeDrag = el(design, 'Names');
const box = await namesLayer.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 44, box.y + box.height / 2 + 30, { steps: 10 });
await page.mouse.up();
design = await saved();
results.drag = { before: [beforeDrag.x, beforeDrag.y], after: [el(design, 'Names').x, el(design, 'Names').y] };

// 5. resize with the south-east handle
const handles = page.locator('span[style*="nwse-resize"]');
results.handleCount = await handles.count();
const se = handles.last();
const seBox = await se.boundingBox();
const beforeResize = el(design, 'Names');
await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2);
await page.mouse.down();
await page.mouse.move(seBox.x + 60, seBox.y + 45, { steps: 10 });
await page.mouse.up();
design = await saved();
results.resize = {
  before: [beforeResize.w, beforeResize.h],
  after: [el(design, 'Names').w, el(design, 'Names').h],
};

// 6. rotation via the round handle
const rotate = page.locator('span.cursor-grab').first();
const rb = await rotate.boundingBox();
await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
await page.mouse.down();
await page.mouse.move(rb.x + 120, rb.y + 70, { steps: 12 });
await page.mouse.up();
design = await saved();
const renderedTransform = await page.locator(`main [data-element-id="${el(design, 'Names').id}"]`).first().evaluate((n) => n.style.transform);
results.rotation = {
  value: el(design, 'Names').rotation,
  renderedTransform,
  selectionOutlineRotated: await page.locator('[aria-label="Names layer"]').evaluate((n) => n.style.transform),
};

// 7. inspector geometry fields
const xInput = inspector.locator('label:has-text("X") input').first();
const rotInput = inspector.locator('label:has-text("Angle") input').first();
const opInput = inspector.locator('label:has-text("Opacity") input').first();
await xInput.fill('200');
await xInput.blur();
await rotInput.fill('15');
await rotInput.blur();
await opInput.fill('65');
await opInput.blur();
design = await saved();
const geom = el(design, 'Names');
results.geometry = { x: geom.x, rotation: geom.rotation, opacity: geom.opacity };

// 8. aspect lock with the property fields
const lock = inspector.locator('text=Lock aspect while resizing').locator('..').locator('[role="switch"]');
await lock.click();
const wInput = inspector.locator('label:has-text("W") input').first();
await wInput.fill('400');
await wInput.blur();
design = await saved();
const aspectEl = el(design, 'Names');
results.aspectLock = { ratio: +(aspectEl.w / aspectEl.h).toFixed(3), w: aspectEl.w, h: aspectEl.h };

// 9. undo / redo
const beforeUndo = aspectEl.w;
await page.locator('main').click({ position: { x: 5, y: 5 } });
await page.keyboard.press('Control+z');
design = await saved();
const afterUndo = el(design, 'Names').w;
await page.keyboard.press('Control+Shift+z');
design = await saved();
results.undoRedo = { beforeUndo, afterUndo, afterRedo: el(design, 'Names').w };

// 10. copy / paste
const countBefore = design.pages[0].elements.length;
await page.keyboard.press('Control+c');
await page.keyboard.press('Control+v');
design = await saved();
results.copyPaste = { before: countBefore, after: design.pages[0].elements.length, lastSelected: await nameField.inputValue() };

// 11. delete
await page.keyboard.press('Delete');
design = await saved();
results.delete = { after: design.pages[0].elements.length };

// 12. font picker: search, pick a real Arabic family, verify it loads
try {
results.namesBox = await page.getByRole('button', { name: 'Names layer' }).boundingBox();
results.zoomLabel = await page.locator('button[title^="Fit canvas"]').innerText().catch(() => null);
await page.screenshot({ path: '/tmp/lamsa-harness/before-font.jpg', type: 'jpeg', quality: 50 });
await page.getByRole('button', { name: 'Names layer' }).click({ force: true });
await page.waitForTimeout(400);
results.inspectorText = (await inspector.innerText()).slice(0, 400);
results.inspectorButtons = await inspector.locator('button').evaluateAll((bs) => bs.map((b) => b.textContent?.trim()).slice(0, 30));
await inspector.getByRole('button', { name: /Typeface|Cormorant|Amiri|Playfair|Aa/i }).first().click();
const dialog = page.getByRole('dialog');
await dialog.locator('input[placeholder^="Search"]').fill('Amiri');
await page.waitForTimeout(400);
results.fontPicker = { cards: await dialog.locator('button:has-text("Amiri")').count() };
await dialog.locator('button:has-text("Amiri")').first().click();
await page.waitForTimeout(2500);
design = await saved();
results.fontPicker.savedFont = el(design, 'Names').font;
results.fontPicker.loaded = await page.evaluate(async () => {
  await document.fonts.ready;
  return document.fonts.check('40px Amiri');
});
results.fontPicker.renderedFamily = await page.locator(`main [data-element-id="${el(design, 'Names').id}"]`).first().evaluate((n) => getComputedStyle(n.querySelector('div')).fontFamily);

} catch (error) { results.step12Error = String(error).slice(0, 500); }
// 13. saved design equals the document on the canvas (no mutation of print source yet)
results.savedPages = design.pages.length;
results.consoleErrors = errors;
console.log(JSON.stringify(results, null, 2));
await page.screenshot({ path: '/tmp/lamsa-harness/studio-after.jpg', type: 'jpeg', quality: 55 });
await browser.close();
