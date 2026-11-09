# LAMSA Publishing Studio — Final QA & Remediation

**Date:** 9 November 2026  
**Scope:** Phases 1–3E, final browser QA and remediation only. No new phase started.  
**Environment:** Local Vite dev server (`127.0.0.1:5173`), Convex dev deployment `oceanic-porpoise-708`, Chromium headless-shell 1248, desktop 1440×900 and mobile 390×844 / 360×800 / tablet 768×1024.  
**Readiness:** **Conditionally ready for a controlled production pilot; not a full sign-off** for Arabic archival/search use or CMYK/PDF-X print workflows. See the limitations below.

---

## 1. Verification summary

| Check | Result |
|---|---|
| Unit/integration suite | **1019 tests in 76 files passed**, 19.49 s |
| Browser regression suite | **14 checks passed** (`qa/browser/publishing-smoke.mjs`) |
| TypeScript | `bunx tsc -b --noEmit` — **clean** |
| ESLint | **0 errors**, 34 warnings (pre-existing hook/fast-refresh warnings) |
| Convex codegen | `bun convex dev --once` — **functions ready** |
| Production build | `bun run build` — **succeeded**, 3,057 modules, 13.56 s |
| Browser console | No page errors in final editor/auth/export runs |
| Responsive overflow | No horizontal overflow at 390, 360, 768 or 1440 px |
| Signed-out deep link | Editor content not rendered; auth gate shown; no content leakage |
| Build output | `dist/` ≈ 3.1 MB; largest JS chunks 516 kB and 435 kB before gzip |

The browser suite is now committed at `qa/browser/publishing-smoke.mjs` and run with `bun run qa:browser`. Its Chromium build lives in `/dev/shm` (`PLAYWRIGHT_BROWSERS_PATH=/dev/shm/pw`) because the root filesystem is small; the suite itself, the `playwright` devDependency and the assertions are in the repository.

---

## 2. Fixed defects, by severity

### Critical / highest priority — Arabic and mixed-direction text was silently omitted

**Root cause:** the PDF exporter used built-in fonts that have no Arabic glyphs, so non-Latin runs were skipped. Preflight disclosed the limitation, but the exported PDF did not preserve the visible text.

**Remediation:** frames containing Arabic or mixed right-to-left runs are rasterized at approximately 300 dpi through the browser’s own shaping engine (`snapdom`) and embedded as transparent PNG overlays at the frame position. Latin-only frames remain selectable vector text. The whole mixed frame is rasterized, so Latin text inside a mixed frame is also non-selectable. Export/preflight copy now says exactly that, and rasterization failures are reported rather than silently omitted.

**Verification:** page 1 custom export contains the Arabic/mixed overlay `1083×500` RGBA with opaque dark text pixels (`alpha bbox 2,17,1005,175`). The PDF’s extractable text contains the three Latin frames and intentionally contains no Arabic. This is disclosed in the UI and report.

### High — Named versions had a backend but no interface

**Root cause:** `createVersion` / `listVersions` / `getVersion` / `restoreVersion` existed in `src/convex/publishing/versions.ts` and the `publicationVersions` tables were migrated, but no studio component used them. Version history in the studio was the invitation-scoped `designVersions` panel from `Studio.tsx`, a different product.

**Remediation:** added `VersionsDialog` and an entry in the Document menu of the publishing toolbar. It lists each version with number, creation date/time, page count and image count, creates a version from the current document (flushing pending autosave first), renames a version through a new `renameVersion` mutation that touches only the label, and restores behind an explicit confirmation that names what will be replaced. Restore reloads the editor into the restored snapshot instead of leaving a session built on stale document versions.

**Verification:** browser suite checks 7–10 — create, rename, cancel restore, restore; the restored version remains listed after the reload. Renaming is label-only by design so it is safe on a version the current work was built on.

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

### Medium — Impossible page margins could be typed into the inspector

**Root cause:** the margin `NumberField` clamped with `min={0}`, so `-5` silently became `0`, and oversized margins were committed until preflight (or the server) objected.

**Remediation:** margins now validate before commit against the shared rule in `src/lib/publishing/margins.ts`: negative, non-finite, and margins that would leave no live area are refused. The field keeps the last valid value, marks `aria-invalid`, and explains the reason and the largest acceptable value in the document’s own unit (e.g. “Top margin must stay under 252 mm so the page keeps a live area”). Escape clears the message. The server still validates types only; preflight remains the guard for documents written by other clients.

**Verification:** unit tests in `margins.test.ts` (6 cases) plus browser checks 4–6: `-5` is refused and reverts, `400` names the limit, and 15 mm survives a reload.

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
2. **Arabic shaping still depends on the Arabic webfont.** The export now checks that a declared Amiri (or Noto Naskh) face actually reached `status: "loaded"` before capture and aborts with a clear message otherwise, so a blocked webfont can no longer ship missing-glyph boxes. It cannot work offline; bundling the font locally would remove that dependency.
3. **Server-side margin validation is type-only.** The inspector prevents impossible margins in the studio, but a document written by another client could still store one; preflight reports it as `page/invalid-margins` or `page/margins-collapse`. No database-level guard was added.
4. **Named-version deletion does not exist.** Versions can be created, renamed and restored, not deleted. Repeated QA runs therefore leave version rows; there is no pruning UI.
5. **PDF output is RGB with no colour management.** No CMYK or PDF/X claim is made, and the export dialog states this.
6. **Page thumbnails intentionally show compact placeholders, not artwork.** This is a design choice; it should not be mistaken for failed image loading.
7. **The browser suite covers the release-critical paths, not every workflow.** It signs in, checks the signed-out gate, editor load, margin refusal/reload, version create/rename/cancel/restore, Arabic export disclosure, export failure with a blocked font, and 390 px overflow. Master detach, crop history, Layout Assist and Smart Album were exercised manually in this pass but are not in the committed suite.
8. **Cross-owner access was reviewed statically, not attempted with a second live account.** Creating a second verified account needs a real email round-trip, which this environment cannot do. All publishing endpoint files call `requireUserId` / owned-publication/asset helpers, and existing Convex tests cover ownership. Storage-URL authorization was not independently penetration-tested.
9. **Visual design was not reviewed by eye.** The bundled screenshots and page renders were checked programmatically (not blank, ink bounds, Arabic-vs-baseline pixel difference confined to the headline block), but the available tooling returns image bytes rather than a rendered preview. Pixel-for-pixel layout, typography and mobile aesthetics still need a human or screenshot-capable review.
10. **Git is unavailable in this environment.** All changes are present in the working tree but uncommitted and undeployed.

---

## 4. Arabic PDF investigation and result

- **Problem observed:** a page with Latin and Arabic/mixed frames exported Latin text but omitted Arabic from the PDF.
- **Options considered:** (a) leave text out with a warning — rejected; (b) embed a full Arabic font and hope built-in shaping/encoding works — not reliable; (c) preserve the browser’s rendered text as a high-resolution image overlay — selected; (d) preserve entire page as an image — rejected because it would needlessly rasterize Latin-only pages.
- **Result:** Latin-only frames remain vector/selectable. Arabic and mixed frames are rendered at ≈300 dpi and embedded as transparent PNG overlays, with the frame’s placement and clipping preserved. Export and preflight disclose that those frames are images and their text cannot be selected or searched.
- **Font availability:** before capture, the rasterizer waits for `document.fonts` to settle (capped at 6 s) and then requires a *declared face* for `Amiri` or `Noto Naskh Arabic` with `status === "loaded"`. `FontFaceSet.check()` alone was rejected because it returns true for an unknown family. A missing face throws `ArabicFontUnavailableError`, which the export dialog shows instead of writing a PDF.
- **Evidence:** `page1-custom.pdf`, `page1-custom.png`, `arabic-fallback-p1-render.png`, `baseline-page1-render.png`. Browser checks 11–12 prove the normal path (image-text disclosure present) and the blocked-webfont path (export stops, no PDF reported).

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
- Named versions: create, rename, cancel restore, restore with reload (committed suite).
- Margin refusal: negative value, page-covering value, value retained after reload (committed suite).
- Arabic export with webfont blocked: clear failure message, no PDF (committed suite).

### Committed browser suite

`qa/browser/publishing-smoke.mjs` drives Chromium through `playwright` against the running dev server. It prints one PASS/FAIL line per check and exits non-zero on failure.

```
PLAYWRIGHT_BROWSERS_PATH=/dev/shm/pw bun run qa:browser
```

Overridable with `QA_BASE_URL`, `QA_PUBLICATION_ID`, `QA_EMAIL`, `QA_PIN`. The QA account and publication are throwaway non-production records.

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
- `src/components/publishing/VersionsDialog.tsx` *(new)*
- `src/components/publishing/EditorToolbar.tsx`
- `src/convex/publishing/versions.ts` (added `renameVersion`)
- `src/lib/publishing/margins.ts` *(new)*
- `src/lib/publishing/margins.test.ts` *(new)*
- `qa/browser/publishing-smoke.mjs` *(new)*
- `package.json` (added `playwright` devDependency and `qa:browser` script)

---

## 10. Readiness assessment

**Conditional go for a controlled pilot.** Core editing, masters, layers, page structure, preflight, export, undo, Smart Album and authentication all work in the tested environment. The Arabic PDF is no longer silently lossy: it is visually preserved and the selectable-text limitation is disclosed.

The named-version UI and margin validation that previously blocked the pilot are in place, and the Arabic export can no longer fail silently: it either preserves the text as an image with an explicit disclosure or stops with a readable error.

**Do not represent this as fully production-ready** until a human visual pass of exported PDFs, the desktop studio and the mobile layout is completed, and until someone accepts that Arabic is image text rather than searchable text. CMYK/PDF-X is still out of scope. Cross-account access remains verified statically rather than with a second live account. Git/deployment remains outstanding because version control is managed outside this session.
