# LAMSA — Phases 3–5: Print Lab, Shape Maker and Press

Status: **shipped**. All four workspaces in `src/lib/workspaces.ts` now open.

## What each workspace is

| Workspace | Route | Phase | Surface |
| --- | --- | --- | --- |
| Digital Experiences | `/dashboard` | 2 | The studio and the guest journey |
| Print Lab | `/print`, `/print/:id` | 3 | Imposition on real stock |
| Shape Maker | `/shapes`, `/shapes/:id` | 4 | Cut and fold die lines |
| Press | `/press`, `/press/:id` | 5 | Openings on press stock |

Every lab opens with the host's own projects (`WorkspacePicker`) because a lab
works on an existing invitation: its suite, its page sizes and its paper are
already in that document.

## Decisions

1. **No new database, no second document.** Print Lab reads `design.suite`
   pieces and their print briefs; Press writes through `resizePage` and the
   existing `invitations.saveDesign` mutation; Shape Maker stores nothing at
   all. Nothing was added to the Convex schema.
2. **Millimetres are the unit of record.** `lib/print.ts` already measured
   paper, bleed, crop marks and imposition. The new modules only decide, never
   re-measure: `print-lab.ts` picks the better turn of a sheet, `cut-folds.ts`
   draws a blank at 1:1, `press.ts` pairs pages into openings.
3. **One shell, three surfaces.** `WorkspaceShell` and `WorkspacePanel` keep the
   labs visually identical to the studio without forking its layout.
4. **Every button does something.** Export opens the existing print window,
   re-cutting writes and saves, the SVG button downloads a real cut file, and a
   lab with no projects says so instead of offering an empty canvas.

## New modules

- `src/lib/print-lab.ts` — `planPiece`, `bestImposition`, `runFor`,
  `sheetWaste`, `SHEET_STOCKS`.
- `src/lib/cut-folds.ts` — `buildShape`, `shapeToSvg`, `cutLengthMm`,
  `foldLengthMm`, `SHAPE_TEMPLATES`.
- `src/lib/press.ts` — `PRESS_FORMATS`, `spreadPairs`, `applyPressFormat`,
  `columnMeasureMm`, `sheetCount`.

Each has unit tests next to it; the geometry and the sheet arithmetic are
asserted with real numbers rather than snapshots.

## Exit gates

`tsc -b --noEmit` · `bun run lint` (0 errors) · `bunx vitest run` (408 tests) ·
`bun run build` — all pass after each workspace.

Not tested here: the in-browser authoring workflow and the published-link
check, because this environment has no headless browser. The numeric and
geometry behaviour those workflows depend on is covered by the unit tests
above.
