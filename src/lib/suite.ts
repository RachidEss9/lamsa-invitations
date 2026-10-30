import {
  makeId,
  pageSizeOf,
  toDesignPx,
  type DesignDocument,
  type DesignElement,
  type DesignPage,
  type PageSize,
} from "@/lib/design";
import {
  defaultEnvelopeGeometry,
  linerSizeFor,
  normalizeEnvelopeGeometry,
  type EnvelopeGeometry,
} from "@/lib/envelope";
import { paletteFromPage } from "@/lib/palettes";
import { TYPE_STYLE_KEYS, type TypeStyle } from "@/lib/type-styles";

/**
 * The stationery suite.
 *
 * One invitation project holds a coordinated set of pieces — the card, the
 * RSVP, the envelope, the liner — and every piece is nothing more than a named
 * group of the document's existing pages. That choice keeps a single source of
 * truth: pages keep their own geometry, elements, effects and history, the
 * canvas keeps rendering them, and an invitation saved before suites existed
 * has no suite at all and behaves exactly as it always has.
 *
 * A suite is a production aid for the owner. It never changes what a guest
 * sees unless a piece is explicitly marked guest-visible.
 */

export type PieceKind =
  | "invitation"
  | "save-the-date"
  | "rsvp"
  | "details"
  | "thank-you"
  | "menu"
  | "place-card"
  | "belly-band"
  | "envelope"
  | "liner"
  | "custom";

export interface PieceKindSpec {
  id: PieceKind;
  label: string;
  note: string;
  /** Trim size in millimetres, the way stationery is sold. */
  widthMm: number;
  heightMm: number;
  /** How many sides the piece opens with. An envelope is front and back. */
  sides: number;
  sideNames: string[];
}

export const PIECE_KINDS: PieceKindSpec[] = [
  { id: "invitation", label: "Invitation", note: "The main card guests receive", widthMm: 127, heightMm: 178, sides: 1, sideNames: ["Front"] },
  { id: "save-the-date", label: "Save the date", note: "An early announcement", widthMm: 127, heightMm: 178, sides: 1, sideNames: ["Front"] },
  { id: "rsvp", label: "RSVP card", note: "The reply slip", widthMm: 108, heightMm: 139, sides: 1, sideNames: ["Front"] },
  { id: "details", label: "Details card", note: "Travel, timings, accommodation", widthMm: 105, heightMm: 148, sides: 1, sideNames: ["Front"] },
  { id: "thank-you", label: "Thank-you card", note: "A note after the day", widthMm: 105, heightMm: 148, sides: 1, sideNames: ["Front"] },
  { id: "menu", label: "Menu", note: "Courses and place settings", widthMm: 148, heightMm: 210, sides: 1, sideNames: ["Front"] },
  { id: "place-card", label: "Place card", note: "A name at the table", widthMm: 90, heightMm: 50, sides: 1, sideNames: ["Front"] },
  { id: "belly-band", label: "Belly band", note: "A wrap that holds the suite together", widthMm: 210, heightMm: 50, sides: 1, sideNames: ["Front"] },
  { id: "envelope", label: "Outer envelope", note: "Front, back, flap and address guides", widthMm: 114, heightMm: 162, sides: 2, sideNames: ["Front", "Back"] },
  { id: "liner", label: "Envelope liner", note: "The paper inside the envelope", widthMm: 112, heightMm: 228, sides: 1, sideNames: ["Liner"] },
  { id: "custom", label: "Custom piece", note: "Your own size and purpose", widthMm: 148, heightMm: 210, sides: 1, sideNames: ["Front"] },
];

export function pieceKindSpec(kind: PieceKind): PieceKindSpec {
  return PIECE_KINDS.find((spec) => spec.id === kind) ?? PIECE_KINDS[0];
}

export function isPieceKind(value: unknown): value is PieceKind {
  return PIECE_KINDS.some((spec) => spec.id === value);
}

/** Print brief carried by each piece, in millimetres. */
export interface PiecePrint {
  unit: "mm" | "in";
  /** Bleed beyond the trim edge. */
  bleedMm: number;
  /** Safe margin kept clear of the trim. */
  safeMm: number;
  cropMarks: boolean;
}

export const DEFAULT_PIECE_PRINT: PiecePrint = {
  unit: "mm",
  bleedMm: 3,
  safeMm: 5,
  cropMarks: false,
};

export function defaultPiecePrint(kind: PieceKind): PiecePrint {
  // Envelopes are printed flat and trimmed by the maker, so they default to
  // no bleed; cards and bands are guillotined and ask for a bleed band.
  if (kind === "envelope") {
    return { ...DEFAULT_PIECE_PRINT, bleedMm: 0, safeMm: 6 };
  }
  if (kind === "belly-band") {
    return { ...DEFAULT_PIECE_PRINT, bleedMm: 3, safeMm: 4 };
  }
  return { ...DEFAULT_PIECE_PRINT };
}

export function normalizePiecePrint(value: unknown): PiecePrint {
  const raw = (value ?? {}) as Partial<PiecePrint>;
  const bleed = Number(raw.bleedMm);
  const safe = Number(raw.safeMm);
  return {
    unit: raw.unit === "in" ? "in" : "mm",
    bleedMm: Number.isFinite(bleed) ? Math.min(20, Math.max(0, bleed)) : DEFAULT_PIECE_PRINT.bleedMm,
    safeMm: Number.isFinite(safe) ? Math.min(50, Math.max(0, safe)) : DEFAULT_PIECE_PRINT.safeMm,
    cropMarks: Boolean(raw.cropMarks),
  };
}

export interface SuitePiece {
  id: string;
  name: string;
  kind: PieceKind;
  /** Membership only: order is the document's own page order. */
  pageIds: string[];
  print: PiecePrint;
  /** Envelope geometry, only on an envelope piece. */
  envelope?: EnvelopeGeometry;
  /**
   * Whether the public invitation may show this piece. Undefined reads as
   * "yes" for the main invitation and "no" for everything a host adds later,
   * so production pieces never leak to guests by default.
   */
  guestVisible?: boolean;
}

export interface DesignSuite {
  version: 1;
  activePieceId: string;
  pieces: SuitePiece[];
}

export function isGuestVisible(piece: SuitePiece): boolean {
  if (piece.guestVisible != null) return piece.guestVisible;
  return piece.kind === "invitation";
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

export function suiteOf(design: DesignDocument): SuitePiece[] {
  return design.suite?.pieces ?? [];
}

export function pieceById(
  design: DesignDocument,
  pieceId: string | null | undefined,
): SuitePiece | null {
  if (!pieceId) return null;
  return suiteOf(design).find((piece) => piece.id === pieceId) ?? null;
}

/** The piece the studio is working on. */
export function activePiece(design: DesignDocument): SuitePiece | null {
  const suite = design.suite;
  if (!suite || suite.pieces.length === 0) return null;
  return pieceById(design, suite.activePieceId) ?? suite.pieces[0] ?? null;
}

/** A piece's pages, in document order. */
export function piecePages(
  design: DesignDocument,
  piece: SuitePiece | null | undefined,
): DesignPage[] {
  if (!piece) return [];
  const ids = new Set(piece.pageIds);
  return design.pages.filter((page) => ids.has(page.id));
}

export function pieceForPage(
  design: DesignDocument,
  pageId: string,
): SuitePiece | null {
  return suiteOf(design).find((piece) => piece.pageIds.includes(pageId)) ?? null;
}

/** The document index range a piece occupies, or null when it owns no pages. */
export function pieceRange(
  design: DesignDocument,
  pieceId: string | null | undefined,
): { start: number; end: number } | null {
  const piece = pieceById(design, pieceId);
  if (!piece) return null;
  const indices = design.pages
    .map((page, index) => (piece.pageIds.includes(page.id) ? index : -1))
    .filter((index) => index >= 0);
  if (indices.length === 0) return null;
  return { start: indices[0], end: indices[indices.length - 1] + 1 };
}

/** Physical trim size of a piece, read from its first page. */
export function pieceTrimMm(
  design: DesignDocument,
  piece: SuitePiece | null | undefined,
): { widthMm: number; heightMm: number } {
  const page = piecePages(design, piece)[0];
  const size = pageSizeOf(page ?? undefined);
  const mmPerPx = 25.4 / 96;
  return { widthMm: size.width * mmPerPx, heightMm: size.height * mmPerPx };
}

/**
 * The page ids the public invitation may show. No suite means every page is
 * still public, so an invitation saved before suites existed is untouched.
 */
export function guestVisiblePageIds(design: DesignDocument): Set<string> | null {
  const suite = design.suite;
  if (!suite) return null;
  const ids = new Set<string>();
  for (const piece of suite.pieces) {
    if (!isGuestVisible(piece)) continue;
    for (const pageId of piece.pageIds) ids.add(pageId);
  }
  return ids;
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Repairs a suite against the document's real pages. Membership is the only
 * contract: every page belongs to exactly one piece, every piece owns at least
 * one page, and the active piece always exists. Anything unreadable is dropped
 * rather than allowed to hide a host's artwork.
 */
export function normalizeSuite(
  value: unknown,
  pages: DesignPage[],
): DesignSuite | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<DesignSuite>;
  if (!Array.isArray(raw.pieces) || raw.pieces.length === 0) return undefined;

  const claimed = new Set<string>();
  const pieces: SuitePiece[] = [];

  for (const candidate of raw.pieces) {
    if (!candidate || typeof candidate !== "object") continue;
    const piece = candidate as Partial<SuitePiece>;
    const pageIds = (Array.isArray(piece.pageIds) ? piece.pageIds : [])
      .filter((id): id is string => typeof id === "string" && pages.some((page) => page.id === id))
      .filter((id) => {
        if (claimed.has(id)) return false;
        claimed.add(id);
        return true;
      });
    if (pageIds.length === 0) continue;
    const kind: PieceKind = isPieceKind(piece.kind) ? piece.kind : "custom";
    const entry: SuitePiece = {
      id: typeof piece.id === "string" && piece.id ? piece.id : makeId("piece"),
      name: (typeof piece.name === "string" && piece.name.trim()) || pieceKindSpec(kind).label,
      kind,
      pageIds,
      print: normalizePiecePrint(piece.print),
      envelope: kind === "envelope" ? normalizeEnvelopeGeometry(piece.envelope) : undefined,
      guestVisible: piece.guestVisible,
    };
    pieces.push(entry);
  }

  if (pieces.length === 0) return undefined;

  // A page with no piece would be invisible to the suite and could not be
  // reached from the piece selector, so it joins the active piece.
  const orphans = pages.filter((page) => !claimed.has(page.id)).map((page) => page.id);
  if (orphans.length > 0) {
    const host =
      pieces.find((piece) => piece.id === raw.activePieceId) ?? pieces[0];
    host.pageIds = [...host.pageIds, ...orphans];
  }

  const activePieceId = pieces.some((piece) => piece.id === raw.activePieceId)
    ? (raw.activePieceId as string)
    : pieces[0].id;

  return { version: 1, activePieceId, pieces };
}

/* -------------------------------------------------------------------------- */
/* Building                                                                   */
/* -------------------------------------------------------------------------- */

/** Gives a document a suite without changing a single page. */
export function withSuite(design: DesignDocument): DesignDocument {
  if (design.suite && design.suite.pieces.length > 0) return design;
  const piece: SuitePiece = {
    id: makeId("piece"),
    name: pieceKindSpec("invitation").label,
    kind: "invitation",
    pageIds: design.pages.map((page) => page.id),
    print: defaultPiecePrint("invitation"),
    guestVisible: true,
  };
  return {
    ...design,
    suite: { version: 1, activePieceId: piece.id, pieces: [piece] },
  };
}

function clonePage(page: DesignPage, name: string): DesignPage {
  const elements: DesignElement[] = page.elements.map((element) => ({
    ...element,
    id: makeId(element.kind),
    groupId: element.groupId ? makeId("group") : undefined,
    reveal: element.reveal
      ? { ...element.reveal, interactionId: makeId("interaction") }
      : undefined,
  }));
  const idMap = new Map<string, string>();
  page.elements.forEach((element, index) => idMap.set(element.id, elements[index].id));
  return {
    ...page,
    id: makeId("page"),
    name,
    elements: elements.map((element) =>
      element.reveal
        ? {
            ...element,
            reveal: {
              ...element.reveal,
              targetId: idMap.get(element.reveal.targetId) ?? "",
            },
          }
        : element,
    ),
  };
}

function uniqueName(design: DesignDocument, wanted: string): string {
  const taken = new Set(suiteOf(design).map((piece) => piece.name));
  if (!taken.has(wanted)) return wanted;
  let index = 2;
  while (taken.has(`${wanted} ${index}`)) index += 1;
  return `${wanted} ${index}`;
}

export interface PieceResult {
  design: DesignDocument;
  pieceId: string;
  /** Index of the piece's first page, so the studio can open it. */
  pageIndex: number;
  error?: undefined;
}

export interface PieceError {
  design: undefined;
  pieceId: undefined;
  pageIndex: undefined;
  error: string;
}

/**
 * Adds a coordinated piece. Its paper comes from the piece being worked on so
 * the suite reads as one set, while its own dimensions come from the kind.
 */
export function addPiece(
  design: DesignDocument,
  kind: PieceKind,
  options: { name?: string; afterPieceId?: string } = {},
): PieceResult | PieceError {
  const spec = pieceKindSpec(kind);
  const base = withSuite(design);
  const current =
    pieceById(base, options.afterPieceId) ?? activePiece(base) ?? base.suite!.pieces[0];
  const home = current ? piecePages(base, current)[0] : base.pages[0];
  const background = home?.background ?? "#fbfaf7";

  let widthMm = spec.widthMm;
  let heightMm = spec.heightMm;
  let envelope: EnvelopeGeometry | undefined;
  if (kind === "envelope") {
    envelope = defaultEnvelopeGeometry(widthMm, heightMm);
  }
  if (kind === "liner") {
    // Cut to the envelope it lines when the suite already has one.
    const envelopePiece = suiteOf(base).find((piece) => piece.kind === "envelope");
    const geometry = envelopePiece?.envelope ?? defaultEnvelopeGeometry();
    const liner = linerSizeFor(geometry);
    widthMm = liner.widthMm;
    heightMm = liner.heightMm;
  }

  const width = Math.round(toDesignPx(widthMm, "mm"));
  const height = Math.round(toDesignPx(heightMm, "mm"));
  const margin = Math.round(toDesignPx(kind === "envelope" ? 6 : 5, "mm"));
  const sideNames =
    spec.sideNames.length > 0 ? spec.sideNames : [spec.label];

  const pages: DesignPage[] = Array.from({ length: Math.max(1, spec.sides) }).map(
    (_, index) => {
      const sideName = sideNames[index] ?? sideNames[sideNames.length - 1];
      return {
        id: makeId("page"),
        name: spec.sides > 1 ? `${spec.label} · ${sideName}` : `${spec.label} · ${sideName}`,
        background,
        elements: [],
        width,
        height,
        margin,
      };
    },
  );

  const piece: SuitePiece = {
    id: makeId("piece"),
    name: uniqueName(base, (options.name ?? spec.label).trim() || spec.label),
    kind,
    pageIds: pages.map((page) => page.id),
    print: defaultPiecePrint(kind),
    envelope,
    guestVisible: kind === "invitation",
  };

  const suite = base.suite!;
  // The new piece lands right after the one being worked on, so the suite list
  // reads in the order the host is thinking in.
  const suiteIndex = suite.pieces.findIndex((item) => item.id === current.id);
  const pieces = [...suite.pieces];
  pieces.splice(suiteIndex >= 0 ? suiteIndex + 1 : pieces.length, 0, piece);

  return {
    design: {
      ...base,
      pages: [...base.pages, ...pages],
      suite: { ...suite, activePieceId: piece.id, pieces },
    },
    pieceId: piece.id,
    pageIndex: base.pages.length,
  };
}

/** A full copy of a piece: new pages, new layers, new ids, same artwork. */
export function duplicatePiece(
  design: DesignDocument,
  pieceId: string,
): PieceResult | PieceError {
  const source = pieceById(design, pieceId);
  if (!source) return { design: undefined, pieceId: undefined, pageIndex: undefined, error: "That piece no longer exists." };
  const base = withSuite(design);
  const original = pieceById(base, pieceId)!;
  const pages = piecePages(base, original).map((page) =>
    clonePage(page, page.name),
  );
  if (pages.length === 0) {
    return { design: undefined, pieceId: undefined, pageIndex: undefined, error: "That piece has no pages to duplicate." };
  }

  const copy: SuitePiece = {
    ...original,
    id: makeId("piece"),
    name: uniqueName(base, `${original.name} copy`),
    pageIds: pages.map((page) => page.id),
    envelope: original.envelope ? { ...original.envelope } : undefined,
    print: { ...original.print },
  };

  // Insert the copy's pages directly after the original so pieces stay
  // contiguous and the page list reads in suite order.
  const lastOriginalId = original.pageIds[original.pageIds.length - 1];
  const at = base.pages.findIndex((page) => page.id === lastOriginalId) + 1;
  const pagesOut = [...base.pages];
  pagesOut.splice(at >= 1 ? at : base.pages.length, 0, ...pages);

  const suite = base.suite!;
  const suiteIndex = suite.pieces.findIndex((item) => item.id === pieceId);
  const pieces = [...suite.pieces];
  pieces.splice(suiteIndex >= 0 ? suiteIndex + 1 : pieces.length, 0, copy);

  return {
    design: {
      ...base,
      pages: pagesOut,
      suite: { ...suite, activePieceId: copy.id, pieces },
    },
    pieceId: copy.id,
    pageIndex: at >= 1 ? at : base.pages.length,
  };
}

export function renamePiece(
  design: DesignDocument,
  pieceId: string,
  name: string,
): DesignDocument {
  const trimmed = name.trim();
  if (!trimmed) return design;
  const suite = design.suite;
  if (!suite) return design;
  let changed = false;
  const pieces = suite.pieces.map((piece) => {
    if (piece.id !== pieceId || piece.name === trimmed) return piece;
    changed = true;
    return { ...piece, name: trimmed };
  });
  return changed ? { ...design, suite: { ...suite, pieces } } : design;
}

export function setGuestVisible(
  design: DesignDocument,
  pieceId: string,
  visible: boolean,
): DesignDocument {
  const suite = design.suite;
  if (!suite) return design;
  let changed = false;
  const pieces = suite.pieces.map((piece) => {
    if (piece.id !== pieceId || Boolean(piece.guestVisible) === visible) return piece;
    changed = true;
    return { ...piece, guestVisible: visible };
  });
  return changed ? { ...design, suite: { ...suite, pieces } } : design;
}

export function updatePiecePrint(
  design: DesignDocument,
  pieceId: string,
  print: Partial<PiecePrint>,
): DesignDocument {
  const suite = design.suite;
  if (!suite) return design;
  let changed = false;
  const pieces = suite.pieces.map((piece) => {
    if (piece.id !== pieceId) return piece;
    changed = true;
    return { ...piece, print: normalizePiecePrint({ ...piece.print, ...print }) };
  });
  return changed ? { ...design, suite: { ...suite, pieces } } : design;
}

export function updateEnvelopeGeometry(
  design: DesignDocument,
  pieceId: string,
  geometry: Partial<EnvelopeGeometry>,
): DesignDocument {
  const suite = design.suite;
  if (!suite) return design;
  let changed = false;
  const pieces = suite.pieces.map((piece) => {
    if (piece.id !== pieceId || piece.kind !== "envelope") return piece;
    changed = true;
    const merged = normalizeEnvelopeGeometry({
      ...(piece.envelope ?? defaultEnvelopeGeometry()),
      ...geometry,
      flap: { ...(piece.envelope ?? defaultEnvelopeGeometry()).flap, ...(geometry.flap ?? {}) },
      guides: {
        ...(piece.envelope ?? defaultEnvelopeGeometry()).guides,
        ...(geometry.guides ?? {}),
      },
    })!;
    return { ...piece, envelope: merged };
  });
  return changed ? { ...design, suite: { ...suite, pieces } } : design;
}

/**
 * Removes a piece and its pages. The last piece is never removed: a document
 * always keeps one piece, exactly as it always kept one page.
 */
export function deletePiece(
  design: DesignDocument,
  pieceId: string,
): { design: DesignDocument; removedPageIds: string[]; pageIndex: number; error?: string } {
  const suite = design.suite;
  if (!suite) return { design, removedPageIds: [], pageIndex: 0, error: "This invitation has no stationery suite yet." };
  if (suite.pieces.length <= 1) {
    return { design, removedPageIds: [], pageIndex: 0, error: "A suite needs at least one piece." };
  }
  const piece = pieceById(design, pieceId);
  if (!piece) return { design, removedPageIds: [], pageIndex: 0, error: "That piece no longer exists." };

  const removedPageIds = [...piece.pageIds];
  const removed = new Set(removedPageIds);
  const pages = design.pages.filter((page) => !removed.has(page.id));
  const pieces = suite.pieces.filter((item) => item.id !== pieceId);
  const activePieceId =
    suite.activePieceId === pieceId ? pieces[0].id : suite.activePieceId;
  const nextActive = pieces.find((item) => item.id === activePieceId) ?? pieces[0];
  const firstKeptId = pages.find((page) => nextActive.pageIds.includes(page.id))?.id;
  const pageIndex = Math.max(
    0,
    pages.findIndex((page) => page.id === firstKeptId),
  );

  return {
    design: {
      ...design,
      pages,
      suite: { ...suite, activePieceId: nextActive.id, pieces },
    },
    removedPageIds,
    pageIndex,
  };
}

/** Moves a piece up or down in the suite, keeping its pages together. */
export function movePiece(
  design: DesignDocument,
  pieceId: string,
  direction: -1 | 1,
): DesignDocument {
  const suite = design.suite;
  if (!suite) return design;
  const index = suite.pieces.findIndex((piece) => piece.id === pieceId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= suite.pieces.length) return design;

  const pieces = [...suite.pieces];
  [pieces[index], pieces[target]] = [pieces[target], pieces[index]];

  // Rebuild the page list in suite order so ranges stay contiguous.
  const byId = new Map(design.pages.map((page) => [page.id, page]));
  const ordered: DesignPage[] = [];
  const seen = new Set<string>();
  for (const piece of pieces) {
    for (const pageId of piece.pageIds) {
      const page = byId.get(pageId);
      if (page && !seen.has(pageId)) {
        seen.add(pageId);
        ordered.push(page);
      }
    }
  }
  for (const page of design.pages) {
    if (!seen.has(page.id)) ordered.push(page);
  }

  return { ...design, pages: ordered, suite: { ...suite, pieces } };
}

/* -------------------------------------------------------------------------- */
/* Page ↔ suite bookkeeping                                                   */
/* -------------------------------------------------------------------------- */

/** A page added from the canvas joins the piece being worked on. */
export function addPageToSuite(
  design: DesignDocument,
  pageId: string,
  pieceId?: string,
): DesignDocument {
  const suite = design.suite;
  if (!suite) return design;
  const piece = pieceId
    ? suite.pieces.find((item) => item.id === pieceId) ?? activePiece(design)
    : activePiece(design);
  if (!piece || piece.pageIds.includes(pageId)) return design;
  const pieces = suite.pieces.map((item) =>
    item.id === piece.id ? { ...item, pageIds: [...item.pageIds, pageId] } : item,
  );
  return { ...design, suite: { ...suite, pieces } };
}

/** Deleting a page leaves the suite consistent; the page id is forgotten. */
export function removePageFromSuite(
  design: DesignDocument,
  pageId: string,
): DesignDocument {
  const suite = design.suite;
  if (!suite) return design;
  const pieces = suite.pieces
    .map((piece) => ({ ...piece, pageIds: piece.pageIds.filter((id) => id !== pageId) }))
    .filter((piece, index, list) => piece.pageIds.length > 0 || list.length === 1);
  if (pieces.length === 0) return design;
  const activePieceId = pieces.some((piece) => piece.id === suite.activePieceId)
    ? suite.activePieceId
    : pieces[0].id;
  return { ...design, suite: { ...suite, activePieceId, pieces } };
}

/** Switches the studio to a piece by opening its first page. */
export function selectPiece(
  design: DesignDocument,
  pieceId: string,
): { pageIndex: number; design: DesignDocument } | null {
  const piece = pieceById(design, pieceId);
  if (!piece || !design.suite) return null;
  const range = pieceRange(design, pieceId);
  if (!range) return null;
  return {
    pageIndex: range.start,
    design: {
      ...design,
      suite: { ...design.suite, activePieceId: pieceId },
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Coordinated styles                                                         */
/* -------------------------------------------------------------------------- */

export type SharedStyleAspect = "background" | "palette" | "typography" | "ornaments" | "elements";

export const SHARED_STYLE_ASPECTS: {
  id: SharedStyleAspect;
  label: string;
  note: string;
}[] = [
  { id: "background", label: "Background", note: "The paper colour of every chosen piece" },
  { id: "palette", label: "Palette", note: "Ink and accent colours, remapped role for role" },
  { id: "typography", label: "Typography", note: "Typeface, weight and rhythm, scaled to each size" },
  { id: "ornaments", label: "Borders & ornaments", note: "Frames, motifs and rules, copied in" },
  { id: "elements", label: "Selected layers", note: "The layers you have selected on this piece" },
];

export interface ShareStyleOptions {
  sourcePieceId: string;
  targetPieceIds: string[];
  aspects: SharedStyleAspect[];
  /** Layer ids on the source piece, used by the `elements` aspect. */
  elementIds?: string[];
}

function scaledCopy(
  element: DesignElement,
  from: PageSize,
  to: PageSize,
): DesignElement {
  const scale = Math.min(to.width / from.width, to.height / from.height);
  const offsetX = (to.width - from.width * scale) / 2;
  const offsetY = (to.height - from.height * scale) / 2;
  const next: DesignElement = {
    ...element,
    id: makeId(element.kind),
    groupId: element.groupId ? makeId("group") : undefined,
    // A reveal points at a layer that does not exist on the other piece.
    reveal: undefined,
    x: offsetX + element.x * scale,
    y: offsetY + element.y * scale,
    w: element.w * scale,
    h: element.h * scale,
  };
  if (element.fontSize != null) next.fontSize = Math.max(4, element.fontSize * scale);
  if (element.strokeWidth != null) next.strokeWidth = Math.max(0.1, element.strokeWidth * scale);
  if (element.radius != null) next.radius = element.radius * scale;
  if (element.textBorderWidth != null) next.textBorderWidth = Math.max(0.1, element.textBorderWidth * scale);
  if (element.textPadding != null) next.textPadding = element.textPadding * scale;
  return next;
}

const isOrnament = (element: DesignElement) =>
  element.kind === "motif" ||
  Boolean(element.frameArt) ||
  (element.kind === "shape" && element.shape === "frame");

/**
 * Shares chosen aspects of one piece with others.
 *
 * Every aspect is opt-in and the targets are chosen explicitly, so nothing a
 * host did not ask for is touched: backgrounds replace backgrounds, the
 * palette remaps colours by role, typography copies lettering only, and
 * ornaments or selected layers are added as new layers — never a replacement
 * for what is already there. Returns the same document when there is nothing
 * to do, so the studio's history treats it as no change at all.
 */
export function shareStyles(
  design: DesignDocument,
  options: ShareStyleOptions,
): DesignDocument {
  const aspects = new Set(options.aspects);
  if (aspects.size === 0) return design;
  const source = pieceById(design, options.sourcePieceId);
  if (!source) return design;
  const sourcePages = piecePages(design, source);
  const leadSource = sourcePages[0];
  if (!leadSource) return design;

  const targets = suiteOf(design).filter(
    (piece) => piece.id !== source.id && options.targetPieceIds.includes(piece.id),
  );
  if (targets.length === 0) return design;

  const sourceSize = pageSizeOf(leadSource);
  const sourcePalette = paletteFromPage(leadSource);
  const sourceText = leadSource.elements.filter((element) => element.kind === "text");
  // The piece's own house face: the most used typeface on its first page.
  const sourceFont =
    sourceText
      .map((element) => element.font)
      .filter(Boolean)
      .sort(
        (a, b) =>
          sourceText.filter((element) => element.font === a).length -
          sourceText.filter((element) => element.font === b).length,
      )
      .pop() ?? sourceText[0]?.font;

  const picked = new Set(options.elementIds ?? []);
  const carried =
    picked.size > 0
      ? leadSource.elements.filter((element) => picked.has(element.id))
      : [];

  let changed = false;
  const pages = design.pages.map((page) => {
    const owner = suiteOf(design).find((piece) => piece.pageIds.includes(page.id));
    if (!owner || owner.id === source.id || !targets.some((piece) => piece.id === owner.id)) {
      return page;
    }
    const size = pageSizeOf(page);
    let background = page.background;
    let elements = page.elements;

    if (aspects.has("background") && leadSource.background !== page.background) {
      background = leadSource.background;
      changed = true;
    }

    if (aspects.has("palette")) {
      const own = paletteFromPage(page);
      const map = (value: string | undefined) => {
        if (!value) return value;
        const lowered = value.toLowerCase();
        if (own.ink && lowered === own.ink.toLowerCase()) return sourcePalette.ink;
        if (own.accent && lowered === own.accent.toLowerCase()) return sourcePalette.accent;
        if (own.paper && lowered === own.paper.toLowerCase()) return sourcePalette.paper;
        return value;
      };
      const next = elements.map((element) => ({
        ...element,
        color: map(element.color),
        fill: map(element.fill),
        stroke: map(element.stroke),
        textBackground: map(element.textBackground),
        textBorder: map(element.textBorder),
      }));
      if (next.some((element, index) => element !== elements[index])) {
        elements = next;
        changed = true;
      }
    }

    if (aspects.has("typography")) {
      // Colour belongs to the palette aspect, never to typography, so the two
      // can be chosen independently without fighting each other.
      const next = elements.map((element) => {
        if (element.kind !== "text") return element;
        const origin =
          sourceText.find(
            (candidate) => candidate.name.trim() === element.name.trim(),
          ) ?? null;
        const style: TypeStyle = {};
        if (origin) {
          for (const key of TYPE_STYLE_KEYS) {
            if (key === "color") continue;
            const value = origin[key];
            if (value !== undefined) (style as Record<string, unknown>)[key] = value;
          }
        } else if (sourceFont) {
          style.font = sourceFont;
        }
        // Sizes travel with the style, scaled to the piece's own paper so a
        // 5 × 7 heading does not overflow an A6 reply card.
        if (origin && origin.fontSize != null) {
          style.fontSize = Math.max(
            4,
            (origin.fontSize * size.width) / sourceSize.width,
          );
        }
        return { ...element, ...style };
      });
      if (next.some((element, index) => element !== elements[index])) {
        elements = next;
        changed = true;
      }
    }

    const additions: DesignElement[] = [];
    if (aspects.has("ornaments")) {
      for (const element of leadSource.elements) {
        if (!isOrnament(element)) continue;
        additions.push(scaledCopy(element, sourceSize, size));
      }
    }
    if (aspects.has("elements") && carried.length > 0) {
      for (const element of carried) {
        additions.push(scaledCopy(element, sourceSize, size));
      }
    }
    if (additions.length > 0) {
      elements = [...elements, ...additions];
      changed = true;
    }

    return { ...page, background, elements };
  });

  if (!changed) return design;
  return { ...design, pages };
}
