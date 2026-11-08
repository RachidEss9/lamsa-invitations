# LAMSA Publishing Studio — Final QA & Remediation

**Date:** 8 November 2026  
**Scope:** Phases 1–3E, final browser QA and remediation only. No new phase started.  
**Environment:** Local Vite dev server (`127.0.0.1:5173`), Convex dev deployment `oceanic-porpoise-708`, Chromium headless-shell 1248, desktop 1440×900 and mobile 390×844 / 360×800 / tablet 768×1024.  
**Readiness:** **Conditionally ready for a controlled production pilot; not a full sign-off** for Arabic archival/search use or CMYK/PDF-X print workflows. See the limitations below.

---

## 1. Verification summary

| Check | Result |
|---|---|
| Unit/integration suite | **1013 tests in 75 files passed**, 17.04 s |
| Focused rerun after final fixes | **39 tests passed** (session, preflight, PDF) |
| TypeScript | `bunx tsc -b --noEmit` — **clean** |
| ESLint | **0 errors**, 22 warnings (pre-existing hook/fast-refresh warnings) |
| Convex codegen | `bun convex dev --once` — **functions ready** |
| Production build | `bun run build` — **succeeded**, 3,057 modules, 13.56 s |
| Browser console | No page errors in final editor/auth/export runs |
| Responsive overflow | No horizontal overflow at 390, 360, 768 or 1440 px |
| Signed-out deep link | Editor content not rendered; auth gate shown; no content leakage |
| Build output | `dist/` ≈ 3.1 MB; largest JS chunks 516 kB and 435 kB before gzip |

The browser QA harness lived outside the repository because the root filesystem had under 4 MB free. `/dev/shm` was cleared between turns once; the harness was rebuilt and all final browser checks were re-run.

---

## 2. Fixed defects, by severity

### Critical / highest priority — Arabic and mixed-direction text was silently omitted

**Root cause:** the PDF exporter used built-in fonts that have no Arabic glyphs, so non-Latin runs were skipped. Preflight disclosed the limitation, but the exported PDF did not preserve the visible text.

**Remediation:** frames containing Arabic or mixed right-to-left runs are rasterized at approximately 300 dpi through the browser’s own shaping engine (`snapdom`) and embedded as transparent PNG overlays at the frame position. Latin-only frames remain selectable vector text. The whole mixed frame is rasterized, so Latin text inside a mixed frame is also non-selectable. Export/preflight copy now says exactly that, and rasterization failures are reported rather than silently omitted.

**Verification:** page 1 custom export contains the Arabic/mixed overlay `1083×500` RGBA with opaque dark text pixels (`alpha bbox 2,17,1005,175`). The PDF’s extractable text contains the three Latin frames and intentionally contains no Arabic. This is disclosed in the UI and report.

### High — Detaching a master could not be saved

**Root cause:** copied master objects referenced layer IDs belonging to the master page, not the destination page. Convex validation rejected the save.

**Remediation:** remap the page layer by name/content, clear the copied `groupId`, and hide the original via a page override. Regression expectations were updated in `masters.test.ts`.

**Verification:** detach → save → reload retained the page objects; browser reported no save error.

### High — “Assign to N” assigned the page’s current master instead of the master being inspected

**Root cause:** the panel used `page.masterId` while the user was viewing a different master.

**Remediation:** assignment now prefers `activeMasterId`, then the page master, then the first available master.

**Verification:** a duplicate master was assigned to the intended page, persisted after reload, and deleting it cleared assignments without deleting page content.

### High — Content undo after autosave restored the wrong value

**Root cause:** history stored the pre-edit state, but autosave had already moved the edited value into `base`; restoring that state verbatim left the edit in place.

**Remediation:** restored records are rebuilt as dirty overrides against the latest server base, so undo survives autosave and reload. Added regression tests for saved-base undo.

**Verification:** text edit → autosave → undo/redo → reload preserved the old/new values; `Ω` undo test passed in the browser.

### High — Multi-column text was clipped

**Root cause:** the text surface had no definite height in a multi-column layout.

**Remediation:** use `height: 100%` when `columns > 1`.

**Verification:** long multi-column text rendered in all columns and remained editable.

### Medium — Canvas hit-testing used stale layout after resize/zoom

**Root cause:** memoized pointer handlers closed over an old stage layout.

**Remediation:** pointer handlers read the current layout through `layoutRef`; the ref is updated in `useLayoutEffect` (not during render).

**Verification:** image selection and page navigation still worked after final change; `tsc` and ESLint pass, and browser smoke selected the image correctly.

### Medium — Crop/image placement history was too granular

**Root cause:** every slider tick created a history entry, so one undo jumped to an arbitrary intermediate value.

**Remediation:** image-placement edits coalesce within a 1.2 s window.

**Verification:** zoom 200 → undo 100 → redo 200 → reset 100, in the browser and in regression tests.

### Medium — Unused assets could not be deleted from the studio

**Remediation:** added a confirmed delete action backed by ownership- and reference-checked `deleteAsset`; referenced assets remain protected.

**Verification:** backend tests cover the guard; browser deletion was exercised earlier in the QA session. There is no automated UI test for this panel yet.

### Low — Page thumbnails claimed “IMAGE UNAVAILABLE”

**Remediation:** compact thumbnails deliberately do not fetch images; the misleading label is suppressed via `ObjectArt placeholder="silent"`.

**Verification:** no “IMAGE UNAVAILABLE” text remains in the editor DOM.

### Low — Unlabeled image/opacity sliders

**Remediation:** slider labels are forwarded to the thumb (`Image zoom`, offsets, rotation, `Object opacity`).

### Low — Lint violations introduced by the QA fixes

**Remediation:** replaced render-time ref assignment with `useLayoutEffect`; removed unused destructured variables in history comparison.

---

## 3. Remaining limitations and gaps

1. **Arabic/mixed text is not selectable or searchable** in exported PDFs. This is the deliberate visual-preservation trade-off, not silent omission. A future full-font embedding/subsetting strategy would be required for searchable Arabic.
2. **Arabic shaping depends on the loaded Arabic webfont.** If the Amiri webfont is unavailable in the export browser, rasterization can fail; the export surfaces a warning rather than claiming success. Bundling the font locally would remove this network dependency.
3. **Named publication versions have backend support (`src/convex/publishing/versions.ts`) but no Publishing Studio UI.** This is a functional gap against the broader versioning story, not implemented in this QA pass.
4. **Invalid page margins are accepted by the inspector.** A 300 mm margin produced preflight errors and a server save error; restoring 15 mm returned the document to `SAVED`. The server protects data, but the field should clamp/validate earlier. Verified at 15 mm after reload.
5. **PDF output is RGB with no colour management.** No CMYK or PDF/X claim is made, and the export dialog states this.
6. **Page thumbnails intentionally show compact placeholders, not artwork.** This is a design choice; it should not be mistaken for failed image loading.
7. **No browser-automation suite is committed to the repository.** The final Playwright checks are reproducible scripts but were kept outside the repo because of disk constraints. Stale-closure behavior and asset-deletion UI therefore lack automated regression coverage.
8. **Cross-owner access was reviewed statically, not attempted with a second live account.** All publishing endpoint files call `requireUserId` / owned-publication/asset helpers, and existing Convex tests cover ownership. Storage-URL authorization was not independently penetration-tested.
9. **PDF visual appearance was not inspected pixel-for-pixel.** PDF geometry, page count, text extraction and image/mask objects were inspected; page renders/screenshots were captured as evidence but the available file tool returns image bytes rather than a visual preview. Do not read “verified” as a visual design sign-off.
10. **Git is unavailable in this environment.** All changes are present in the working tree but uncommitted and undeployed.

---

## 4. Arabic PDF investigation and result

- **Problem observed:** a page with Latin and Arabic/mixed frames exported Latin text but omitted Arabic from the PDF.
- **Options considered:** (a) leave text out with a warning — rejected; (b) embed a full Arabic font and hope built-in shaping/encoding works — not reliable; (c) preserve the browser’s rendered text as a high-resolution image overlay — selected; (d) preserve entire page as an image — rejected because it would needlessly rasterize Latin-only pages.
- **Result:** Latin-only frames remain vector/selectable. Arabic and mixed frames are rendered at ≈300 dpi and embedded as transparent PNG overlays, with the frame’s placement and clipping preserved. Export and preflight disclose that those frames are images and their text cannot be selected or searched.
- **Evidence:** `page1-custom.pdf`, `page1-custom.png`, `arabic-fallback-p1-render.png`, `baseline-page1-render.png`.

---

## 5. Export evidence

| File | Result |
|---|---|
| `page1-custom.pdf` | 1 page, media box **612.28 × 858.90 pt** (A4 + 3 mm bleed each side), 39,618 bytes. Extractable text: `'New text\nNew text\n New text\n'`. Images: Arabic overlay 1083×500 RGBA and page image 900×1400 RGB. |
| `pages-2-4-custom.pdf` | 3 pages, each **595.28 × 841.89 pt**, 16,152 bytes. Each page has master text `'New text\n'` and 1 image — page range and master inclusion confirmed. |
| Smart Album export (during QA) | 2 pages, each **864 × 864 pt**, 41,984 bytes; page 1 has 1 image and page 2 has 2 images. Created from a 3-photo Smart Album with Editorial/2-per-page settings. |

The Smart Album test publication `ms743t2apxzf1dbhm4bf7kefnn8ht4vk` was intentionally left in the QA workspace as evidence; the main QA publication remains `ms7f9w7qvdebyyec06xsjvct9h8ht80x` with 32 pages.

---

## 6. Security and data integrity

- Signed-out direct navigation to the editor URL renders the private-studio gate, not the editor: **0 editor SVGs** and no occurrence of page text/assets in the document body. Signing in with the QA PIN returns to the requested publishing URL.
- Every publishing endpoint file that declares a query/mutation/action references the user or ownership helpers. Asset deletion additionally checks that the asset is unused and owned.
- QA did not delete existing publications, versions or assets. Master tests duplicated/deleted only the duplicate QA master; page content survived.
- Page 1’s layout-assistance test temporarily applied a full-bleed composition. The frame was restored to 15 mm / 15 mm / 180 × 267 mm and verified after reload. A marker-text scan found no `QA`, `Ω`, `UNDO` or `KEEP` artifact text.
- No new production dependency or paid service was added.

---

## 7. Responsive and performance observations

| Viewport | Horizontal overflow | Result |
|---|---|---|
| 390×844 | none (`scrollWidth 390`) | Panels available in mobile navigation; zero page errors |
| 360×800 | none (`scrollWidth 360`) | Zero page errors |
| 768×1024 | none (`scrollWidth 768`) | Spread view active |
| 1440×900 | none (`scrollWidth 1440`) | Full desktop chrome |

Local desktop measurements (not production claims): TTFB 14 ms, DOMContentLoaded 212 ms, load 219 ms, FCP 336 ms, editor ready (first page SVG visible) **1.65 s**, next-page navigation **242 ms**, 32 thumbnails. Screenshots: `mobile-390x844.jpg`, `desktop-1440x900.jpg`.

The production bundle contains 516 kB and 435 kB raw JS chunks (gzip ≈180 kB and ≈161 kB); lazy loading is in use, but the editor/Studio chunks remain the main performance watch item.

---

## 8. Browser workflows exercised

- Master create, edit, image crop, assign, duplicate, detach, reload.
- Page add/duplicate/delete with undo/redo; guides add/persist/clear.
- Text edit, autosave, undo/redo and reload; crop slider coalescing.
- Multi-column text; stale canvas hit-testing after layout changes.
- Preflight counts and filters, error navigation, margin recovery.
- Export page 1 with bleed/crop marks/masters; page 2 masters; page range 2–4; 864 pt Smart Album.
- Layout suggestions: apply full-bleed changed the image frame, undo restored it, redo re-applied; suggestions display deterministic copy and apply closings without errors.
- Smart Album variants/preview: 3 chosen photos produced 3 pages initially; 4-per-page produced 2 pages; Mosaic/Editorial previews updated; created a real 2-page album.
- Auth gate and return-to-requested-URL flow.

---

## 9. Key files changed

- `src/lib/publishing/text-raster.ts`
- `src/lib/publishing/pdf.ts`
- `src/lib/publishing/pdf.test.ts`
- `src/lib/publishing/arabic-render.test.ts`
- `src/lib/publishing/preflight.ts`
- `src/components/publishing/ExportDialog.tsx`
- `src/lib/publishing/masters.ts`
- `src/lib/publishing/masters.test.ts`
- `src/components/publishing/MastersPanel.tsx`
- `src/lib/publishing/session.ts`
- `src/lib/publishing/session.test.ts`
- `src/hooks/publishing/usePublishingEditor.ts`
- `src/components/publishing/ObjectArt.tsx`
- `src/components/publishing/PageThumb.tsx`
- `src/components/publishing/AssetsPanel.tsx`
- `src/components/publishing/HistoryPanel.tsx`
- `src/pages/publishing/PublishingEditor.tsx`
- `src/components/publishing/EditorCanvas.tsx`
- `src/components/publishing/ImagePanel.tsx`
- `src/components/publishing/Inspector.tsx`
- `src/components/ui/slider.tsx`

---

## 10. Readiness assessment

**Conditional go for a controlled pilot.** Core editing, masters, layers, page structure, preflight, export, undo, Smart Album and authentication all work in the tested environment. The Arabic PDF is no longer silently lossy: it is visually preserved and the selectable-text limitation is disclosed.

**Do not represent this as fully production-ready** until the named-version UI is exposed (or intentionally deferred), Arabic search/selectability requirements are accepted, margin validation is tightened, and a visual pass of exported PDFs and the mobile layout is completed by a person or a screenshot-capable reviewer. Git/deployment remains outstanding because version control is managed outside this session.
