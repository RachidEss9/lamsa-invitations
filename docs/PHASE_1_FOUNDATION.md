# Phase 1 — shared foundation

Everything the four workspaces share lives under `src/lib/platform/` and
`src/components/platform/`. New workspaces must build on these instead of
adding their own copies.

## Workspaces

`src/lib/workspaces.ts` is the registry. Each entry carries the id, label,
route, which earlier phases produced it, and whether it is `ready`.

- Dashboard rail and mobile menu read `WORKSPACES` and render entries with
  `ready: false` as non-interactive rows (`RailEntry.disabled`) with a phase
  badge. **Never** link a workspace that has no route.
- Adding a workspace means adding an entry here first, then the route in
  `src/main.tsx` and a studio shell that composes the shared panels.

## Projects

`src/lib/platform/project.ts`

- `projectPath(id)` — the only way to build `/studio/:id`. Dashboard, invitation
  card, editor and studio all call it, so the route cannot drift.
- `invitationPath(slug)` — the guest link, which never exposes the studio route.

## Autosave

`src/lib/platform/autosave.ts` (framework-free, unit tested) and
`src/components/platform/useAutosave.ts` (React binding).

- `schedule(value)` debounces (800 ms), keeps only the latest document, and
  flips state to `unsaved`.
- `flush(value?)` saves immediately and cancels a pending timer; concurrent
  saves are serialised and a stale response never overwrites a newer state.
- A failed save keeps the document pending, reports through `onError`, and is
  retried by the next flush.
- `markSaved()` clears the flag after hydration or a version restore.
- Unmount disposes the queue, writing anything still pending.

The studio uses it as `saveState` / `scheduleSave` / `persistDesign` /
`markSaved`; its `beforeunload` guard still reads `saveState`. Do not
reintroduce local timers in a workspace.

## Library browsing

`src/lib/platform/library.ts` — `filterLibrary(items, options)` is the one
filter behind every library tab: category/group/script restriction (`matches`),
the favourites star (`favouritesOnly` + `isFavourite`), and case-insensitive
search over `text(item)`. Unit tested in `library.test.ts`.

The dashboard gallery keeps its own `filterGallery` (it filters by date and
status, not just text); that is a different concern, not a duplicate.

## Catalogues (already shared, do not fork)

| Concern | Module | Consumers |
| --- | --- | --- |
| Built-in assets | `src/lib/assets.ts` (`BUILTIN_ASSETS`) | `LibraryPanel` |
| Fonts | `src/lib/fonts.ts` (`FONT_LIBRARY`) | `FontPicker`, `TypographyStudio`, `LibraryPanel` |
| Design document | `src/lib/design.ts` | studio, guest journey, Convex validation |
| Print/PDF export | `src/lib/print.ts` (pdf-lib, dynamic import) | `PrintExportDialog` |
| Storage | Convex storage ids in `designImageUrls` | invitation records |

## Gates

Run from the project root:

```sh
bun tsc -b --noEmit        # types
bun run lint                # 0 errors (warnings may exist)
bunx vitest run             # NOT `bun test`
bun convex dev --once       # codegen + Convex checks, never without --once
bun run build               # production bundle
```

Only move to the next phase when all five pass. Browser-level flows (sign-in,
saving, published links, mobile layout) cannot be verified in this
environment and must be reported as untested.