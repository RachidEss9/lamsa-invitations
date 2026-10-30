/**
 * Detail Presentation Studio — the model behind the editorial close-up
 * workspace.
 *
 * Every view here is a crop of the real saved artwork. A region lives in the
 * source page's own design-unit coordinate space, so a detail view renders the
 * actual invitation through the same `DesignPageView` path the editor, the
 * public page and the print export use. Nothing in this module invents
 * decoration, texture or material: "paper" and "artwork" views are windows
 * onto what the document already contains, and the presentation page itself is
 * a restrained layout of those windows.
 */
import { pageSizeOf, visiblePages, type DesignDocument, type DesignElement, type DesignPage } from "@/lib/design";
import { safeFilename } from "@/lib/print";

/* -------------------------------------------------------------------------- */
/* Views                                                                      */
/* -------------------------------------------------------------------------- */

export type DetailViewKind = "full" | "typography" | "paper" | "artwork" | "focus";

export const DETAIL_VIEW_KINDS: { id: DetailViewKind; label: string; note: string }[] = [
  { id: "full", label: "Full Design", note: "The complete invitation, uncropped." },
  { id: "typography", label: "Typography Detail", note: "A close crop of the saved lettering." },
  {
    id: "paper",
    label: "Paper Detail",
    note: "The real sheet edge, background and texture as saved.",
  },
  {
    id: "artwork",
    label: "Artwork Detail",
    note: "Illustrations, ornaments and decorative elements as saved.",
  },
  {
    id: "focus",
    label: "Custom Focus",
    note: "Drag a rectangle over the invitation to frame your own detail.",
  },
];

/** A crop in the source page's design units. */
export interface CropRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetailView {
  id: string;
  kind: DetailViewKind;
  pageId: string;
  region: CropRegion;
  /** Optional, user written. Empty means the plate ships without a title. */
  title: string;
  caption: string;
}

let viewSeed = 0;

export function newViewId(prefix = "view"): string {
  viewSeed += 1;
  return `${prefix}-${Date.now().toString(36)}-${viewSeed}`;
}

const TITLE_MAX = 120;
const CAPTION_MAX = 280;

/* -------------------------------------------------------------------------- */
/* Region geometry                                                            */
/* -------------------------------------------------------------------------- */

/** Below this a crop is an unreadable sliver, so regions never get thinner. */
const MIN_REGION = 40;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Keeps a region inside the page it belongs to, at a usable size. */
export function clampRegion(region: CropRegion, page: DesignPage): CropRegion {
  const { width, height } = pageSizeOf(page);
  const w = clamp(Number.isFinite(region.w) ? region.w : MIN_REGION, MIN_REGION, width);
  const h = clamp(Number.isFinite(region.h) ? region.h : MIN_REGION, MIN_REGION, height);
  const x = clamp(Number.isFinite(region.x) ? region.x : 0, 0, Math.max(0, width - w));
  const y = clamp(Number.isFinite(region.y) ? region.y : 0, 0, Math.max(0, height - h));
  return { x, y, w, h };
}

/**
 * The axis-aligned box of an element, including its rotation — a rotated text
 * block still gets a crop that contains all of it.
 */
export function elementBounds(
  element: Pick<DesignElement, "x" | "y" | "w" | "h" | "rotation">,
): CropRegion {
  const rotation = ((element.rotation ?? 0) * Math.PI) / 180;
  if (!rotation) return { x: element.x, y: element.y, w: element.w, h: element.h };
  const cx = element.x + element.w / 2;
  const cy = element.y + element.h / 2;
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));
  const w = element.w * cos + element.h * sin;
  const h = element.w * sin + element.h * cos;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Grows a region by a ratio of its own size, then clamps it to the page. */
export function padRegion(region: CropRegion, page: DesignPage, ratio: number): CropRegion {
  const dx = region.w * ratio;
  const dy = region.h * ratio;
  return clampRegion(
    { x: region.x - dx, y: region.y - dy, w: region.w + dx * 2, h: region.h + dy * 2 },
    page,
  );
}

/**
 * Maps a rectangle the user dragged (in viewport pixels over the full page)
 * onto page coordinates. The viewport must be showing the whole page at the
 * page's own proportions for this to hold.
 */
export function focusRegion(
  box: { x: number; y: number; w: number; h: number },
  viewport: { width: number; height: number },
  page: DesignPage,
): CropRegion {
  const { width, height } = pageSizeOf(page);
  const sx = width / Math.max(viewport.width, 1);
  const sy = height / Math.max(viewport.height, 1);
  return clampRegion(
    { x: box.x * sx, y: box.y * sy, w: Math.max(box.w, 1) * sx, h: Math.max(box.h, 1) * sy },
    page,
  );
}

/**
 * Zoom factor for a plate: how many screen pixels one design unit occupies.
 * The viewport width divided by the region width, so the region exactly fills
 * the plate.
 */
export function cropScale(region: CropRegion, viewportWidth: number): number {
  return viewportWidth / Math.max(region.w, 1);
}

/** Where the page's origin sits inside the plate for a given zoom. */
export function cropOffset(region: CropRegion, scale: number): { left: number; top: number } {
  return { left: -region.x * scale, top: -region.y * scale };
}

/* -------------------------------------------------------------------------- */
/* Deriving views from the real page                                          */
/* -------------------------------------------------------------------------- */

const isDrawable = (element: DesignElement): boolean =>
  Boolean(!element.hidden && element.w > 0 && element.h > 0);

function makeView(page: DesignPage, kind: DetailViewKind, region: CropRegion): DetailView {
  return { id: newViewId(kind), kind, pageId: page.id, region, title: "", caption: "" };
}

export function fullView(page: DesignPage): DetailView {
  const { width, height } = pageSizeOf(page);
  return makeView(page, "full", { x: 0, y: 0, w: width, h: height });
}

/**
 * The largest text blocks on the page, padded with a little of the real sheet
 * around them. The region comes from the saved layout box, so it is exact for
 * Arabic and English alike — no text measuring, no re-typesetting.
 */
export function typographyViews(page: DesignPage, limit = 3): DetailView[] {
  return page.elements
    .filter((element) => element.kind === "text" && isDrawable(element))
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, Math.max(limit, 0))
    .map((element) => makeView(page, "typography", padRegion(elementBounds(element), page, 0.16)));
}

/**
 * Illustrations, ornaments and decorative shapes. A layer that covers nearly
 * the whole sheet is the page's ground rather than artwork on top of it, so it
 * is left out.
 */
export function artworkViews(page: DesignPage, limit = 3): DetailView[] {
  const { width, height } = pageSizeOf(page);
  const sheetArea = width * height;
  return page.elements
    .filter((element) => element.kind !== "text" && isDrawable(element))
    .filter((element) => element.w * element.h < sheetArea * 0.85)
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, Math.max(limit, 0))
    .map((element) => makeView(page, "artwork", padRegion(elementBounds(element), page, 0.14)));
}

/**
 * A corner of the sheet: the trim edge, the saved background and any texture
 * or frame that already lives on the page. Square, so it reads as a swatch.
 */
export function paperView(page: DesignPage): DetailView {
  const { width, height } = pageSizeOf(page);
  const side = Math.min(width, height) * 0.4;
  return makeView(page, "paper", clampRegion({ x: width - side, y: 0, w: side, h: side }, page));
}

/** The derived views for a kind. `focus` is user-drawn, so it derives nothing. */
export function detailViewsFor(
  kind: DetailViewKind,
  page: DesignPage,
  limit = 3,
): DetailView[] {
  switch (kind) {
    case "full":
      return [fullView(page)];
    case "typography":
      return typographyViews(page, limit);
    case "artwork":
      return artworkViews(page, limit);
    case "paper":
      return [paperView(page)];
    case "focus":
      return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Composition                                                                */
/* -------------------------------------------------------------------------- */

export type PresentationAlign = "start" | "center" | "end";

export interface PresentationStyle {
  layoutId: string;
  backgroundId: string;
  /** Page padding around the composition, 0–100. */
  margin: number;
  /** Space between plates, 0–100. */
  gap: number;
  /** Plate width inside its grid cell, 0–100. */
  size: number;
  align: PresentationAlign;
  showTitles: boolean;
}

export interface PresentationDoc {
  views: DetailView[];
  style: PresentationStyle;
}

export const DEFAULT_PRESENTATION_STYLE: PresentationStyle = {
  layoutId: "spread",
  backgroundId: "ivory",
  margin: 42,
  gap: 34,
  size: 100,
  align: "center",
  showTitles: true,
};

export interface PresentationLayout {
  id: string;
  label: string;
  note: string;
  columns: number;
  /** Opens the composition with one wide plate. */
  heroFirst: boolean;
}

export const PRESENTATION_LAYOUTS: PresentationLayout[] = [
  { id: "folio", label: "Folio", note: "One generous plate per row.", columns: 1, heroFirst: false },
  {
    id: "spread",
    label: "Spread",
    note: "An opening plate over paired details.",
    columns: 2,
    heroFirst: true,
  },
  {
    id: "diptych",
    label: "Diptych",
    note: "Two equal plates in quiet balance.",
    columns: 2,
    heroFirst: false,
  },
  { id: "triptych", label: "Triptych", note: "Three fine columns.", columns: 3, heroFirst: false },
  {
    id: "gallery",
    label: "Gallery",
    note: "A wide plate above a three-up row.",
    columns: 3,
    heroFirst: true,
  },
];

export function layoutById(id: string): PresentationLayout {
  return PRESENTATION_LAYOUTS.find((layout) => layout.id === id) ?? PRESENTATION_LAYOUTS[0];
}

/**
 * How many columns a plate occupies at its position. The hero only fires when
 * the composition is actually wider than one row of the layout, so a spread of
 * two views stays a balanced diptych.
 */
export function spanFor(layout: PresentationLayout, index: number, total: number): number {
  if (layout.columns <= 1) return 1;
  if (layout.heroFirst && index === 0 && total > layout.columns) return layout.columns;
  return 1;
}

export interface PresentationBackdrop {
  id: string;
  label: string;
  css: string;
  ink: string;
  sub: string;
}

/** Flat, restrained grounds only — no gradients, no simulated paper. */
export const PRESENTATION_BACKDROPS: PresentationBackdrop[] = [
  { id: "ivory", label: "Ivory", css: "#f6f1e7", ink: "#221d16", sub: "rgba(34,29,22,0.55)" },
  { id: "chalk", label: "Chalk", css: "#fbfaf7", ink: "#1f1b15", sub: "rgba(31,27,21,0.55)" },
  { id: "stone", label: "Stone", css: "#e7e1d5", ink: "#2a241b", sub: "rgba(42,36,27,0.62)" },
  { id: "ink", label: "Ink", css: "#1b1815", ink: "#f0e9dc", sub: "rgba(240,233,220,0.62)" },
];

export function backdropById(id: string): PresentationBackdrop {
  return PRESENTATION_BACKDROPS.find((backdrop) => backdrop.id === id) ?? PRESENTATION_BACKDROPS[0];
}

/** A finished starting point: the sheet, its lettering, its artwork, its edge. */
export function defaultPresentation(design: DesignDocument): PresentationDoc {
  const page = visiblePages(design)[0];
  if (!page) return { views: [], style: { ...DEFAULT_PRESENTATION_STYLE } };
  return {
    views: [
      fullView(page),
      ...typographyViews(page, 1),
      ...artworkViews(page, 1),
      paperView(page),
    ],
    style: { ...DEFAULT_PRESENTATION_STYLE },
  };
}

export function addView(doc: PresentationDoc, view: DetailView): PresentationDoc {
  return { ...doc, views: [...doc.views, view] };
}

export function removeView(doc: PresentationDoc, id: string): PresentationDoc {
  return { ...doc, views: doc.views.filter((view) => view.id !== id) };
}

/** Moves a view to a new index in the composition (clamped). */
export function moveView(doc: PresentationDoc, id: string, toIndex: number): PresentationDoc {
  const from = doc.views.findIndex((view) => view.id === id);
  if (from < 0) return doc;
  const next = [...doc.views];
  const [moved] = next.splice(from, 1);
  next.splice(clamp(toIndex, 0, next.length), 0, moved);
  return { ...doc, views: next };
}

export function updateView(
  doc: PresentationDoc,
  id: string,
  patch: Partial<Pick<DetailView, "title" | "caption" | "region" | "pageId">>,
): PresentationDoc {
  return {
    ...doc,
    views: doc.views.map((view) => (view.id === id ? { ...view, ...patch } : view)),
  };
}

export function withStyle(doc: PresentationDoc, patch: Partial<PresentationStyle>): PresentationDoc {
  return { ...doc, style: { ...doc.style, ...patch } };
}

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "lamsa.detail-presentations";

function storage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function clampNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.round(clamp(parsed, 0, 100));
}

function normalizeView(raw: unknown, pages: Map<string, DesignPage>): DetailView | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<DetailView>;
  const page = typeof candidate.pageId === "string" ? pages.get(candidate.pageId) : undefined;
  // A view into a page that no longer exists cannot be drawn honestly.
  if (!page) return null;
  const kind = DETAIL_VIEW_KINDS.some((entry) => entry.id === candidate.kind)
    ? (candidate.kind as DetailViewKind)
    : "focus";
  const region = candidate.region as CropRegion | undefined;
  const safeRegion: CropRegion =
    region && typeof region === "object"
      ? clampRegion(
          {
            x: Number(region.x) || 0,
            y: Number(region.y) || 0,
            w: Number(region.w) || MIN_REGION,
            h: Number(region.h) || MIN_REGION,
          },
          page,
        )
      : fullView(page).region;
  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : newViewId(kind),
    kind,
    pageId: page.id,
    region: safeRegion,
    title: typeof candidate.title === "string" ? candidate.title.slice(0, TITLE_MAX) : "",
    caption: typeof candidate.caption === "string" ? candidate.caption.slice(0, CAPTION_MAX) : "",
  };
}

function normalizeStyle(raw: unknown): PresentationStyle {
  const candidate = (raw ?? {}) as Partial<PresentationStyle>;
  const align: PresentationAlign =
    candidate.align === "start" || candidate.align === "center" || candidate.align === "end"
      ? candidate.align
      : DEFAULT_PRESENTATION_STYLE.align;
  return {
    layoutId: PRESENTATION_LAYOUTS.some((layout) => layout.id === candidate.layoutId)
      ? (candidate.layoutId as string)
      : DEFAULT_PRESENTATION_STYLE.layoutId,
    backgroundId: PRESENTATION_BACKDROPS.some((item) => item.id === candidate.backgroundId)
      ? (candidate.backgroundId as string)
      : DEFAULT_PRESENTATION_STYLE.backgroundId,
    margin: clampNumber(candidate.margin, DEFAULT_PRESENTATION_STYLE.margin),
    gap: clampNumber(candidate.gap, DEFAULT_PRESENTATION_STYLE.gap),
    size: clampNumber(candidate.size, DEFAULT_PRESENTATION_STYLE.size),
    align,
    showTitles:
      typeof candidate.showTitles === "boolean"
        ? candidate.showTitles
        : DEFAULT_PRESENTATION_STYLE.showTitles,
  };
}

/**
 * Turns anything coming back from storage into a presentation this design can
 * actually render: unknown layouts fall back, regions are re-clamped to their
 * page, views into deleted pages are dropped.
 */
export function normalizePresentation(raw: unknown, design: DesignDocument): PresentationDoc {
  const pages = new Map(design.pages.map((page) => [page.id, page]));
  const source = (raw ?? {}) as Partial<PresentationDoc>;
  const rawViews = Array.isArray(source.views) ? source.views : null;
  const seen = new Set<string>();
  const views: DetailView[] = [];
  for (const entry of rawViews ?? []) {
    const view = normalizeView(entry, pages);
    if (!view) continue;
    if (seen.has(view.id)) continue;
    seen.add(view.id);
    views.push(view);
  }
  return { views, style: normalizeStyle(source.style) };
}

/** Reads a saved presentation for this invitation, or null when there is none. */
export function loadPresentation(
  designKey: string,
  design: DesignDocument,
): PresentationDoc | null {
  try {
    const store = storage();
    if (!store) return null;
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const saved = parsed?.[designKey];
    if (!saved || typeof saved !== "object") return null;
    return normalizePresentation(saved, design);
  } catch {
    return null;
  }
}

/** Saves a presentation on this device, next to (never inside) the design. */
export function savePresentation(designKey: string, doc: PresentationDoc): void {
  try {
    const store = storage();
    if (!store) return;
    let parsed: Record<string, unknown> = {};
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (raw) parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    parsed[designKey] = doc;
    store.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Persistence is a convenience; the workspace still runs without it.
  }
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

export type PresentationFormat = "png" | "jpeg";

/** Screen exports are labelled `…-presentation`, never the print PDF's name. */
export function presentationExportName(title: string, format: PresentationFormat): string {
  return `${safeFilename(title)}-presentation.${format === "jpeg" ? "jpg" : "png"}`;
}

/** Target width for a high-resolution export, in output pixels. */
export const PRESENTATION_EXPORT_WIDTH = 2400;

/**
 * Capture scale for a stage of `nodeWidth` px: enlarges the live preview to
 * the export width, capped so the canvas never outruns the browser.
 */
export function exportScale(nodeWidth: number, target = PRESENTATION_EXPORT_WIDTH): number {
  return Math.min(6, Math.max(1, target / Math.max(nodeWidth, 1)));
}

export function exportDimensions(
  nodeWidth: number,
  nodeHeight: number,
  scale: number,
): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(nodeWidth * scale)),
    height: Math.max(1, Math.round(nodeHeight * scale)),
  };
}
