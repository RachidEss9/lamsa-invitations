# LAMSA — Phase 2 plan: Digital Experiences document

Status: **planning only**. Nothing in this document is implemented yet.

## What Phase 2 must deliver

A section-based document for web experiences that reuses the existing design
document rather than creating a parallel model.

## Decisions

1. **Reuse `DesignDocument`.** `src/lib/design.ts` already models pages,
   elements, typography, motion cues and `sections[]`. Digital Experiences
   edits that same document through the same studio shell. No new document
   type, no second schema, no migration.
2. **Sections stay the grouping unit.** `DesignSection` (`sections.ts`) is what
   the guest journey renders between pages, and `sectionsOf` is the existing
   accessor. A section-based canvas means selecting, reordering and editing
   `DesignSection`s, not inventing a new container.
3. **One canvas.** The canvas is `StudioCanvas`, driven by
   `canvas-interaction.ts` + `canvas-transform.ts` (both unit tested). Section
   mode reuses the same drag, resize and snap maths; it changes what is
   selected, not how handles behave.
4. **Autosave is not re-implemented.** All edits go through
   `scheduleSave` / `persistDesign` from Phase 1's shared queue.

## Build order inside Phase 2

1. Section model affordances: selection, ordering and page↔section mapping on
   top of `sections.ts` (`sectionsOf`, `page.section`), with unit tests.
2. Sections panel: list, rename, reorder, add/remove — composed from existing
   studio panels, filtered through `filterLibrary`.
3. Canvas: selection and movement scoped to a section's elements.
4. Inspector: reuse existing typography/materials/effects inspectors.
5. Preview: the guest journey already renders sections; verify against it.

## Explicitly out of scope

- No new database, no new Convex tables; sections live inside `design`.
- No new export path; PDF export (`lib/print.ts`) stays page-based.
- No presentation/opening revival: `OpeningSettings` stays neutralized.

## Exit gates (all must pass before Phase 3)

`tsc -b --noEmit` · `bun run lint` (0 errors) · `bunx vitest run` ·
`bun convex dev --once` · `bun run build` · plus a real authoring workflow
and a published link check — reported as untested where no browser is
available.