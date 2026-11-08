/**
 * Assisted layout.
 *
 * Local, deterministic heuristics — no model call, no paid service, no fake
 * "thinking" indicator. A suggestion is a pure `page → page` transform plus a
 * plain-language rationale, so the user can preview it, apply it (one undoable
 * edit) or reject it, and can do so per page or over a selected page range.
 *
 * The heuristics only move objects the user can see: text, shapes and captions
 * are never edited by a suggestion, and nothing is applied without an explicit
 * confirmation in the panel.
 */

import type { PublicationDocument, PublicationPage, Rect } from "./model";
import { safeBox } from "./geometry";
import { frameBounds } from "./object-transform";
import { snapTargetsForPage } from "./grid";
import { selectionBounds } from "./tools";
import { patternFrames, type AlbumPattern } from "./smart-album";
import { updatePage } from "./operations";

export interface LayoutSuggestion {
  id: string;
  code: string;
  title: string;
  rationale: string;
  pageId: string;
  /** What the suggestion changes, in plain words. */
  changes: string[];
  /** Number of objects touched; 0 means "advice only". */
  affected: number;
  /** Number of deterministic alternatives (0/undefined means one). */
  variantCount?: number;
  /** The proposal, ready to preview or apply. */
  propose: (page: PublicationPage, variant?: number) => PublicationPage;
}

export interface PageLayoutIssue {
  pageId: string;
  code: "empty" | "overcrowded" | "repeated" | "off-margin" | "no-images";
  detail: string;
  severity: "warning" | "info";
}

export interface LayoutAnalysis {
  issues: PageLayoutIssue[];
  suggestions: LayoutSuggestion[];
}

function imageFrames(page: PublicationPage) {
  return page.objects.filter((object) => object.kind === "image-frame" && !object.hidden);
}

function framesFor(page: PublicationPage, pattern: AlbumPattern, gap: number): Rect[] {
  return patternFrames(pattern, page, gap).frames;
}

function moveImagesToFrames(
  page: PublicationPage,
  rects: Rect[],
): PublicationPage {
  const targets = new Map<string, Rect>();
  imageFrames(page).forEach((object, index) => {
    const rect = rects[index];
    if (rect) targets.set(object.id, rect);
  });
  if (targets.size === 0) return page;
  return {
    ...page,
    objects: page.objects.map((object) => {
      const rect = targets.get(object.id);
      if (!rect) return object;
      return {
        ...object,
        frame: { ...object.frame, x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    }),
  };
}

function snapFrames(page: PublicationPage, document: PublicationDocument): PublicationPage {
  const targets = snapTargetsForPage(page.spec, document.grid, document.guides, page.id, page.side);
  return {
    ...page,
    objects: page.objects.map((object) => {
      if (object.kind !== "image-frame" || object.locked) return object;
      const bounds = frameBounds(object.frame);
      const snap = (value: number, candidates: number[]): number => {
        let best = value;
        let distance = 4;
        for (const candidate of candidates) {
          const delta = Math.abs(candidate - value);
          if (delta < distance) {
            best = candidate;
            distance = delta;
          }
        }
        return best;
      };
      const x = snap(bounds.x, targets.x);
      const y = snap(bounds.y, targets.y);
      if (x === bounds.x && y === bounds.y) return object;
      return {
        ...object,
        frame: {
          ...object.frame,
          x: object.frame.x + (x - bounds.x),
          y: object.frame.y + (y - bounds.y),
        },
      };
    }),
  };
}

function insideSafeArea(page: PublicationPage): PublicationPage {
  const safe = safeBox(page.spec, page.side);
  return {
    ...page,
    objects: page.objects.map((object) => {
      if (object.kind !== "image-frame" || object.locked) return object;
      const bounds = frameBounds(object.frame);
      // A deliberate full-bleed image is not "outside" anything: only nudge
      // pictures that stick out on one or two edges and still sit on the page.
      const crossesOneEdge =
        (bounds.x < safe.x || bounds.y < safe.y ||
          bounds.x + bounds.width > safe.x + safe.width ||
          bounds.y + bounds.height > safe.y + safe.height);
      const fullyOutside =
        bounds.x + bounds.width < safe.x ||
        bounds.y + bounds.height < safe.y ||
        bounds.x > safe.x + safe.width ||
        bounds.y > safe.y + safe.height;
      if (!crossesOneEdge || fullyOutside) return object;
      const width = Math.min(bounds.width, safe.width);
      const height = Math.min(bounds.height, safe.height);
      const x = Math.min(Math.max(bounds.x, safe.x), safe.x + safe.width - width);
      const y = Math.min(Math.max(bounds.y, safe.y), safe.y + safe.height - height);
      return {
        ...object,
        frame: { ...object.frame, x: object.frame.x + (x - bounds.x), y: object.frame.y + (y - bounds.y) },
      };
    }),
  };
}

/** A short, stable signature of a page's image composition. */
export function layoutSignature(page: PublicationPage): string {
  return imageFrames(page)
    .map((object) => {
      const bounds = frameBounds(object.frame);
      return [Math.round(bounds.x / 4), Math.round(bounds.y / 4), Math.round(bounds.width / 4), Math.round(bounds.height / 4)].join(":");
    })
    .join("|");
}

export function analyzeLayout(document: PublicationDocument): LayoutAnalysis {
  const issues: PageLayoutIssue[] = [];
  const suggestions: LayoutSuggestion[] = [];
  const signatures = new Map<string, string[]>();

  document.pages.forEach((page, index) => {
    const images = imageFrames(page);
    if (page.objects.length === 0) {
      issues.push({
        pageId: page.id,
        code: "empty",
        detail: `${page.name || `Page ${index + 1}`} has no objects.`,
        severity: "info",
      });
    }
    if (images.length === 0 && page.objects.length > 0) {
      issues.push({
        pageId: page.id,
        code: "no-images",
        detail: `${page.name || `Page ${index + 1}`} is a text or shape page; image layouts do not apply.`,
        severity: "info",
      });
    }
    if (images.length >= 2) {
      const boxes = images.map((object) => frameBounds(object.frame));
      const area = boxes.reduce((sum, box) => sum + box.width * box.height, 0);
      const safe = safeBox(page.spec, page.side);
      if (area > safe.width * safe.height * 0.98) {
        issues.push({
          pageId: page.id,
          code: "overcrowded",
          detail: `${page.name || `Page ${index + 1}`} has ${images.length} pictures covering almost the whole safe area.`,
          severity: "warning",
        });
      }
      const signature = layoutSignature(page);
      signatures.set(signature, [...(signatures.get(signature) ?? []), page.id]);
    }

    if (images.length > 0) {
      const variants: AlbumPattern[] =
        images.length === 1
          ? ["single-margin", "full-bleed", "image-caption"]
          : images.length === 2
            ? ["two-side", "two-stacked"]
            : images.length === 3
              ? ["three-composition", "hero-support", "editorial-asym"]
              : ["four-grid"];
      const initial = index % variants.length;
      const rects = framesFor(page, variants[initial]!, 18);
      const before = images.map((object) => frameBounds(object.frame));
      const changed = before.some((box, position) => {
        const rect = rects[position];
        if (!rect) return false;
        return (
          Math.abs(box.x - rect.x) > 2 ||
          Math.abs(box.y - rect.y) > 2 ||
          Math.abs(box.width - rect.width) > 2 ||
          Math.abs(box.height - rect.height) > 2
        );
      });
      if (changed) {
        suggestions.push({
          id: `${page.id}:compose`,
          code: "compose",
          pageId: page.id,
          title: `Recompose ${images.length === 1 ? "the picture" : `the ${images.length} pictures`}`,
          rationale: `A ${variants[initial]!.replace(/-/g, " ")} composition gives this page a deliberate structure instead of arbitrary placement.`,
          changes: [`Move and resize ${images.length} image frame${images.length === 1 ? "" : "s"}`, "Keep every other object where it is"],
          affected: images.length,
          variantCount: variants.length,
          propose: (current, variant = initial) =>
            moveImagesToFrames(
              current,
              framesFor(current, variants[variant % variants.length]!, 18),
            ),
        });
      }

      const safe = safeBox(page.spec, page.side);
      const outside = images.filter((object) => {
        const bounds = frameBounds(object.frame);
        const fullBleed =
          bounds.x <= 0.5 &&
          bounds.y <= 0.5 &&
          bounds.x + bounds.width >= page.spec.trim.width - 0.5 &&
          bounds.y + bounds.height >= page.spec.trim.height - 0.5;
        if (fullBleed) return false;
        return (
          bounds.x < safe.x - 1 ||
          bounds.y < safe.y - 1 ||
          bounds.x + bounds.width > safe.x + safe.width + 1 ||
          bounds.y + bounds.height > safe.y + safe.height + 1
        );
      });
      if (outside.length > 0) {
        suggestions.push({
          id: `${page.id}:safe`,
          code: "safe-area",
          pageId: page.id,
          title: "Bring pictures inside the margins",
          rationale:
            "These pictures cross the safe-area edge without being a deliberate full bleed, so trimming could cut them.",
          changes: [`Nudge ${outside.length} image frame${outside.length === 1 ? "" : "s"} inside the safe area`],
          affected: outside.length,
          propose: (current) => insideSafeArea(current),
        });
      }

      const snapped = snapFrames(page, document);
      if (snapped !== page) {
        suggestions.push({
          id: `${page.id}:snap`,
          code: "snap",
          pageId: page.id,
          title: "Snap to the grid",
          rationale:
            "A picture sits within a few points of a column or guide; snapping makes the margin intentional.",
          changes: ["Align image edges to the nearest column, guide or safe-area edge"],
          affected: images.length,
          propose: (current) => snapFrames(current, document),
        });
      }
    }

    if (index === 0 && images.length === 1) {
      const bounds = frameBounds(images[0]!.frame);
      const trim = page.spec.trim;
      const bleed = page.spec.bleed;
      const fullBleed =
        bounds.x <= 0.5 && bounds.y <= 0.5 &&
        bounds.width >= trim.width + bleed * 2 - 1 &&
        bounds.height >= trim.height + bleed * 2 - 1;
      if (!fullBleed) {
        suggestions.push({
          id: `${page.id}:cover`,
          code: "cover",
          pageId: page.id,
          title: "Make the cover a full bleed",
          rationale:
            "A first page holding a single photograph reads as a cover; running it into the bleed removes the white edge after trimming.",
          changes: ["Extend the cover photograph into the bleed"],
          affected: 1,
          propose: (current) => {
            const frame = imageFrames(current)[0];
            if (!frame) return current;
            return {
              ...current,
              objects: current.objects.map((object) =>
                object.id === frame.id
                  ? {
                      ...object,
                      frame: {
                        ...object.frame,
                        x: -current.spec.bleed,
                        y: -current.spec.bleed,
                        width: current.spec.trim.width + current.spec.bleed * 2,
                        height: current.spec.trim.height + current.spec.bleed * 2,
                      },
                    }
                  : object,
              ),
            };
          },
        });
      }
    }
  });

  for (const [signature, pageIds] of signatures) {
    if (signature && pageIds.length > 1) {
      issues.push({
        pageId: pageIds[1]!,
        code: "repeated",
        detail: `${pageIds.length} pages share the same picture composition.`,
        severity: "info",
      });
    }
  }

  return { issues, suggestions };
}

/** Applies a suggestion to one page and returns the derived document. */
export function applySuggestion(
  document: PublicationDocument,
  suggestion: LayoutSuggestion,
): PublicationDocument {
  return updatePage(document, suggestion.pageId, (page) => suggestion.propose(page));
}

/** Suggestions for a page range, used by "apply to selection". */
export function suggestionsForPages(
  analysis: LayoutAnalysis,
  pageIds: readonly string[],
): LayoutSuggestion[] {
  const wanted = new Set(pageIds);
  return analysis.suggestions.filter((suggestion) => wanted.has(suggestion.pageId));
}

/** Union bounds of a page's images, for a compact preview caption. */
export function imageBounds(page: PublicationPage): Rect | null {
  return selectionBounds(
    page,
    imageFrames(page).map((object) => object.id),
  );
}
