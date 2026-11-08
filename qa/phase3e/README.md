# Phase 3E browser QA evidence

Environment: dev server at `http://127.0.0.1:5173`, Chromium headless shell
(Playwright 1.65), viewport 1600×1000 for desktop and 390×844 for mobile.

QA account: `qa3a.1793962691147@lamsa-qa.test` (PIN provided out of band).
Source publication: `ms79ddd2h9nkmb7yq375m0wwa58hpxm8` — 41 pages, facing
spreads, A4 with 3 mm bleed, Latin + Arabic stories, cropped image frames,
one master ("A — Default") with page assignments and one override.

Smart Album created during QA: `ms71ahsz1f98q9ksws3zkbn1td8hvk7v` (4 pages,
12 × 12 in, Editorial style, 2 photographs per page, bordered cover). It
remains in the library as a real, editable QA artefact.

## Screens

| File | What it shows |
| --- | --- |
| `01-history-and-undo.png` | History panel after "Duplicate page": one structure entry, undo enabled, redo disabled, page 2 / 42. |
| `02-structural-undo.png` | Same publication after undo: page 2 / 41 restored, history row still listed, redo enabled. |
| `03-align-distribute.png` | Three objects selected in Layers; selection toolbar with align, distribute, size, stack, group, lock and hide controls. |
| `04-guides-rulers.png` | Guides panel with margins + centre guide (5 guides), guides chrome on, both rulers visible (horizontal 590×22 px, vertical 22×828 px). |
| `05-preflight.png` | Preflight report on the real publication: 0 errors, 4 warnings, 50 information findings, severity filter, "estimated" marker, "Open location" per finding. |
| `06-export-settings.png` | Export dialog with print/bleed profile, page range 1–3, bleed, crop marks and master toggles. |
| `07-export-result.png` | Post-export summary: 3 pages, first page 612.28 × 858.9 pt, image/shape/text counts, Arabic limitation warning. |
| `08-album-setup.png` | Smart Album setup: 6 photographs chosen, 12 × 12 in, Editorial, 2 per page, bordered cover, live 4-page preview. |
| `09-album-created.png` | The generated album opened in the standard editor (4 pages, editable objects, masters and pages panels available). |
| `10-layout-suggestions.png` | Deterministic layout suggestions for the album, with rationale, planned changes, apply/preview/another/reject. |
| `10b-layout-preview.png` | Preview thumbnail of a suggestion before committing. |
| `11-layout-applied.png` | Album after applying a suggestion; undo enabled. |
| `11b-layout-undone.png` | Same page after undo; the applied suggestion is reversed as one edit. |
| `12-mobile-workspace.png` | 390×844 editor with the mobile Pages sheet open; document scroll width equals viewport width (390 px). |
| `13-mobile-preflight.png` | Mobile preflight: dialog fits the viewport (390 × 742.7 px) and its findings stay readable/scrollable. |

## PDFs produced in the browser

All files are real downloads from the app, not fixtures.

| File | Pages | Page box | Contents |
| --- | --- | --- | --- |
| `pdf/full-digital.pdf` | 41 | 595.28 × 841.89 pt (A4 trim) | 16 image placements (2 unique source files, original resolution), vector shapes, selectable Latin text; Arabic runs skipped by design and reported. |
| `pdf/print-bleed-marks.pdf` | 3 (range 1–3) | 612.28 × 858.9 pt (+8.5 pt bleed each side) | Crop marks drawn as 12 vector paths; mark segments cross the trim rectangle at each corner. |
| `pdf/range-1-2.pdf` | 2 (range 1–2) | 595.28 × 841.89 pt | Range mapping check (below). |
| `pdf/smart-album.pdf` | 4 | 864 × 864 pt (12 in square) | 6 photographs embedded at 1600×900 / 900×1400 / 1200×1200 px, i.e. original files rather than 320 px thumbnails; crop clipping keeps the overflow outside the page box. |

Rendered inspections (PyMuPDF): `pdf-pages/full-digital-page1.png`,
`pdf-pages/print-bleed-page1.png`, `pdf-pages/smart-album-page1.png`,
`pdf-pages/smart-album-page2.png`.

### Checks performed on the files

- Page count equals the requested page set (41 all pages, 3 and 2 for ranges,
  4 for the album).
- Physical sizes match the publication specs; bleed adds exactly the page's
  3 mm (8.5 pt) on each side and does not scale or rotate content.
- Range export `1–2` matches full-document pages 1 and 2 pixel-for-pixel at
  50 dpi (page 1 ≠ page 2), so page order and range selection agree.
- Latin text is extractable (`New text New text … Publishing Studio`); the
  Arabic story produces no text and is reported in the export result instead
  of being substituted.
- Album PDF embeds the full-size originals, not proxies.
- Crop marks are vector lines, not raster.

### Stated limitations of the pipeline

RGB without colour management; no CMYK or PDF/X claim; non-WinAnsi text is
omitted (not substituted); no registration marks; rounded corners print square.
