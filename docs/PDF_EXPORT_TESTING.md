# PDF Export — Browser Verification Procedure

## Environment limitation

No headless browser (Chromium/Firefox) is available in this environment:

- Disk: 3.9 GB total, ~87% used, ~540 MB free.
- Playwright `chrome-headless-shell` download fails: the Playwright CDN returns `NoSuchBucket` (404) for `chromium-headless-shell-linux-x64-1248`.
- ~~`@vitejs/plugin-react` 6.1.2 requires `vite ^8.0.0`; the production build failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.~~ **Fixed:** the plugin was downgraded to `5.2.0` (peer `vite ^4–^8`), and `bun run build` now succeeds.
- No `chromium`, `firefox`, `google-chrome` binaries are installed; `chromium`/`firefox` are snap-only in the package repositories and cannot be installed here.
- `xvfb-run` exists but needs a browser binary, which is absent.

What **is** verified without a browser (automated, 31 tests passing):

- Print geometry: A4, A5, landscape, custom sizes, bleed, printable area, artwork rect.
- Page selection: all-pages vs current-page scope, hidden-page fallback.
- Cover stripping: reveal covers removed from print output, revealed content kept.
- Filename sanitisation: ASCII and Arabic titles.
- Reveal presets: 8 presets, 4 categories, valid effects/directions.
- Font resolution: legacy font-pair ids resolve to library families; unknown ids fall back to Cormorant Garamond.
- Font-apply data flow: patching `font` on a text element preserves text, size, weight, align, colour, spacing, leading, rotation, position, opacity, animation.

What **cannot** be verified without a browser:

- The `snapdom` DOM-to-canvas capture path (rasterising the actual React canvas at 150/200/300 DPI).
- Whether the downloaded PDF visually contains the correct artwork, fonts, Arabic shaping, images, bleed, crop marks.
- Whether the print dialog's preview thumbnail renders correctly.

## Manual test procedure (run on a machine with a browser)

Prerequisites: a working LAMSA studio session with a saved invitation that has at least one page with text and (optionally) an image and an Arabic/RTL design.

### 1. Open an existing invitation

1. Log in to the studio.
2. Open an existing invitation from the dashboard (or create a new one from a template).
3. Open the Canvas studio (`/studio/{invitationId}`).

### 2. Load fonts and images

1. In the Canvas studio, confirm the design renders with the correct typeface (check the names layer uses the selected font).
2. If the invitation has an uploaded image, confirm it appears on the canvas.
3. Open the FontPicker from the Inspector (select a text layer, click the typeface dropdown). Confirm the library shows 90+ families with previews.

### 3. Open the print export dialog

1. Click **Export** (FileText icon) in the studio header.
2. Confirm the dialog opens with the **Print-ready PDF** title.
3. Confirm the left panel shows Paper / Margins & bleed / Output sections.
4. Confirm the right panel shows the preview thumbnail and the page selector strip.

### 4. Export A4 portrait

1. Paper size: **A4**.
2. Orientation: **Portrait**.
3. Margins: 6 mm all sides.
4. Bleed: **3 mm**.
5. Crop marks: **on** (should be enabled now that bleed > 0).
6. Fit: **Fit inside**.
7. Pages: **All pages**.
8. Resolution: **300 DPI**.
9. Include page background: **on**.
10. Show print guides: **on** (preview only).
11. Click **Download PDF**.
12. Confirm a file downloads named `{invitation-title}-print.pdf`.
13. Open the PDF and verify:
    - Page size is A4 (210 × 297 mm).
    - The card is centred on the page with margins visible.
    - Text is rendered in the correct typeface.
    - Arabic text (if any) is rendered right-to-left and shaped correctly.
    - Crop marks appear at the four corners, outside the trim area.
    - The bleed band extends 3 mm beyond the trim on all sides.
    - Page order matches the studio page order.

### 5. Export A5 landscape

1. Paper size: **A5**.
2. Orientation: **Landscape**.
3. Bleed: **5 mm**.
4. Crop marks: **on**.
5. Fit: **Fill page**.
6. Click **Download PDF**.
7. Open the PDF and verify:
    - Page size is A5 landscape (210 × 148 mm).
    - The card fills the printable area (may extend beyond the card edges — that's expected for "fill").
    - Crop marks are present.

### 6. Export custom size

1. Paper size: **Custom**.
2. Width: 127 mm, Height: 177.8 mm (5 × 7 inches).
3. Units: **mm**.
4. Bleed: **0 mm**.
5. Crop marks: **off** (disabled because bleed = 0).
6. Click **Download PDF**.
7. Verify the PDF page is 127 × 177.8 mm.

### 7. Verify the original design is unchanged

1. Before exporting, note the canvas zoom level, the selected element, the design state ("All changes saved" / "Unsaved changes").
2. After exporting, confirm:
    - The canvas zoom is unchanged.
    - The selected element is unchanged.
    - The save state is unchanged (PDF export does not trigger a design save).
    - The invitation's published status is unchanged.
    - The public link still shows the same digital invitation.

### 8. Verify print shows revealed content, not covers

1. On a page with a reveal (cover + hidden target), open the print dialog.
2. In the preview thumbnail, confirm the cover is gone and the revealed content is visible.
3. Export and open the PDF — confirm the revealed content is shown, not the cover.

## Automated tests added

- `src/lib/print.test.ts` — 15 tests: geometry, pages, filenames.
- `src/lib/font-apply.test.ts` — 9 tests: font resolution, font-apply property preservation.
- `src/lib/reveal.test.ts` — 7 tests: reveal presets, cover/target creation.

Run with: `npx vitest run`

## Remaining browser-dependent verification

The `snapdom` capture + `pdf-lib` composition path can only be verified in a browser. To complete this:

1. On a machine with Node.js and a Chromium-based browser, install Playwright: `npm i -D playwright && npx playwright install chromium`.
2. Write a Playwright test that:
    - Logs in to the studio.
    - Opens an invitation with Arabic + image content.
    - Opens the print dialog.
    - Sets A4 portrait, 3 mm bleed, crop marks on, 300 DPI, all pages.
    - Clicks Download PDF.
    - Reads the downloaded file from the filesystem.
    - Opens it with `pdf-lib` or `pdfjs-dist` and verifies page count, media box size, embedded images, and text content.
3. Repeat for A5 landscape, custom size, and a multi-page invitation.

Alternatively, a manual tester can follow the procedure above and visually inspect the downloaded PDFs.
