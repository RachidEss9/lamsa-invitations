import { pageSizeOf, type DesignDocument, type DesignPage } from "@/lib/design";
import { safeFilename } from "@/lib/print";
import type { PieceKind } from "@/lib/suite";

/**
 * Mockup scenes: a screen-only product presentation of the owner's real pieces.
 *
 * Everything here is pure data and geometry. The pieces are the saved pages of
 * the project at their true proportions, the scenes are recipes of slots, and
 * the arrangement state lives beside the design — never inside it, so a mockup
 * can be moved, rotated or restaged without touching a single saved layer.
 */

const PX_PER_MM = 96 / 25.4;

export interface MockupPiece {
  id: string;
  name: string;
  /** Suite piece kind ("invitation", "envelope", "liner", …) or "page". */
  kind: string;
  /** The piece's visible pages, face first, in saved order. */
  pages: DesignPage[];
  /** Physical size of the face, in millimetres, from the saved page size. */
  widthMm: number;
  heightMm: number;
}

/**
 * The project's pieces as mockup objects: suite pieces when the design has a
 * suite, otherwise each visible page. Hidden pieces and pages are left out —
 * a mockup never shows what the owner hid.
 */
export function mockupPieces(design: DesignDocument): MockupPiece[] {
  const toPiece = (id: string, name: string, kind: string, pageIds: string[]) => {
    const pages = pageIds
      .map((pageId) => design.pages.find((page) => page.id === pageId))
      .filter((page): page is DesignPage => Boolean(page) && !page!.hidden);
    if (pages.length === 0) return null;
    const { width, height } = pageSizeOf(pages[0]);
    return {
      id,
      name,
      kind,
      pages,
      widthMm: width / PX_PER_MM,
      heightMm: height / PX_PER_MM,
    };
  };

  const suite = design.suite;
  if (suite) {
    const pieces = suite.pieces
      .map((piece) => toPiece(piece.id, piece.name, piece.kind, piece.pageIds))
      .filter((piece): piece is MockupPiece => piece !== null);
    if (pieces.length > 0) return pieces;
  }
  return design.pages
    .filter((page) => !page.hidden)
    .map((page) => toPiece(page.id, page.name, "page", [page.id]))
    .filter((piece): piece is MockupPiece => piece !== null);
}

/* -------------------------------------------------------------------------- */
/* Scenes                                                                     */
/* -------------------------------------------------------------------------- */

export type MockupStyle = "flat" | "flap";

export interface MockupSlot {
  id: string;
  /** Prefer a piece of this kind (suite pieces) when filling the slot. */
  prefer?: string;
  /** Which of that piece's pages to show: 0 = face, 1 = reverse/inside. */
  pageIndex?: number;
  /** Centre of the slot, as a fraction of the stage. */
  x: number;
  y: number;
  rotation: number;
  /** Width as a fraction of the stage width; height follows the real aspect. */
  w: number;
  /** Draw order within the scene. */
  z: number;
  /** Presentation hint: the reverse page reads as an envelope flap. */
  style?: MockupStyle;
}

export interface MockupScene {
  id: string;
  label: string;
  note: string;
  /** Kinds the scene composes with; missing ones get a create prompt. */
  requires?: PieceKind[];
  /** Kinds auto-selected when the scene is chosen (existing pieces only). */
  wants?: PieceKind[];
  /** The scene wants every available piece (collection, box). */
  selectAll?: boolean;
  /** The folded scene needs an inside page on the invitation. */
  needsInside?: boolean;
  /** Stage size as a multiple of the largest selected piece. */
  stage: { w: number; h: number };
  slots: MockupSlot[];
}

const slot = (
  id: string,
  values: Partial<MockupSlot> & { x: number; y: number; w: number },
): MockupSlot => ({
  rotation: 0,
  z: 1,
  ...values,
  id,
});

export const MOCKUP_SCENES: MockupScene[] = [
  {
    id: "card",
    label: "Single invitation",
    note: "One card, softly tilted on the surface.",
    wants: ["invitation"],
    stage: { w: 1.55, h: 1.45 },
    slots: [slot("card", { prefer: "invitation", x: 0.5, y: 0.5, w: 0.64, rotation: -2, z: 3 })],
  },
  {
    id: "card-envelope",
    label: "Invitation with envelope",
    note: "The card resting on its closed envelope, flap side up.",
    requires: ["envelope"],
    wants: ["invitation", "envelope"],
    stage: { w: 2, h: 1.6 },
    slots: [
      slot("envelope", { prefer: "envelope", pageIndex: 1, x: 0.6, y: 0.4, w: 0.6, rotation: -7, z: 1 }),
      slot("card", { prefer: "invitation", x: 0.42, y: 0.6, w: 0.52, rotation: 5, z: 3 }),
      slot("extra", { x: 0.8, y: 0.76, w: 0.3, rotation: 11, z: 2 }),
    ],
  },
  {
    id: "open-envelope",
    label: "Open envelope",
    note: "An open envelope with the invitation sliding out of its mouth.",
    requires: ["envelope"],
    wants: ["invitation", "envelope"],
    stage: { w: 1.9, h: 1.7 },
    slots: [
      // The envelope is the FRONT layer (z 3): the invitation slides out from
      // behind its mouth, with the opened flap drawn behind both (stage z 1).
      slot("envelope", {
        prefer: "envelope",
        pageIndex: 1,
        x: 0.5,
        y: 0.68,
        w: 0.66,
        rotation: -3,
        z: 3,
        style: "flap",
      }),
      slot("card", { prefer: "invitation", x: 0.5, y: 0.34, w: 0.46, rotation: 2, z: 2 }),
      slot("extra", { x: 0.86, y: 0.74, w: 0.24, rotation: 10, z: 1 }),
    ],
  },
  {
    id: "suite-spread",
    label: "Invitation, RSVP & details",
    note: "Three cards fanned as a set.",
    requires: ["rsvp", "details"],
    wants: ["invitation", "rsvp", "details"],
    stage: { w: 2.2, h: 1.5 },
    slots: [
      slot("rsvp", { prefer: "rsvp", x: 0.2, y: 0.66, w: 0.3, rotation: -9, z: 1 }),
      slot("details", { prefer: "details", x: 0.8, y: 0.64, w: 0.3, rotation: 8, z: 1 }),
      slot("card", { prefer: "invitation", x: 0.5, y: 0.44, w: 0.44, rotation: -1, z: 3 }),
    ],
  },
  {
    id: "collection",
    label: "Stationery collection",
    note: "Every piece laid out as a coordinated flat lay.",
    requires: ["envelope", "rsvp"],
    selectAll: true,
    stage: { w: 2.3, h: 1.9 },
    slots: [
      slot("a", { x: 0.27, y: 0.28, w: 0.3, rotation: -4, z: 1 }),
      slot("b", { x: 0.73, y: 0.3, w: 0.3, rotation: 5, z: 1 }),
      slot("c", { x: 0.28, y: 0.74, w: 0.3, rotation: 3, z: 1 }),
      slot("d", { x: 0.72, y: 0.72, w: 0.3, rotation: -6, z: 1 }),
      slot("card", { prefer: "invitation", x: 0.5, y: 0.51, w: 0.36, rotation: 0, z: 3 }),
    ],
  },
  {
    id: "folded",
    label: "Folded / gatefold",
    note:
      "The invitation's face and inside spread side by side; falls back to a single card when there is no second page.",
    wants: ["invitation"],
    needsInside: true,
    stage: { w: 2.4, h: 1.5 },
    slots: [
      slot("panel-left", { prefer: "invitation", pageIndex: 0, x: 0.27, y: 0.5, w: 0.44, z: 1 }),
      slot("panel-right", { prefer: "invitation", pageIndex: 1, x: 0.73, y: 0.5, w: 0.44, z: 1 }),
    ],
  },
  {
    id: "box",
    label: "Luxury invitation box",
    note: "The invitation presented in a box tray with the stationery around it.",
    selectAll: true,
    stage: { w: 1.9, h: 1.7 },
    slots: [
      slot("envelope", { prefer: "envelope", pageIndex: 1, x: 0.5, y: 0.5, w: 0.62, rotation: 0, z: 1 }),
      slot("left", { x: 0.24, y: 0.7, w: 0.24, rotation: -7, z: 2 }),
      slot("right", { x: 0.76, y: 0.7, w: 0.24, rotation: 7, z: 2 }),
      slot("card", { prefer: "invitation", x: 0.5, y: 0.44, w: 0.42, rotation: -1, z: 3 }),
    ],
  },
];

export function sceneById(id: string): MockupScene {
  return MOCKUP_SCENES.find((scene) => scene.id === id) ?? MOCKUP_SCENES[0];
}

/**
 * The piece ids a scene should show: the current selection plus everything
 * the scene asks for that the project actually has. Selecting a scene with an
 * envelope slot pulls the real envelope into the arrangement instead of
 * leaving the invitation alone on stage.
 */
export function scenePieceIds(
  scene: MockupScene,
  pieces: MockupPiece[],
  current: string[],
): string[] {
  const chosen = new Set(
    current.filter((id) => pieces.some((piece) => piece.id === id)),
  );
  if (scene.selectAll) {
    for (const piece of pieces) chosen.add(piece.id);
  } else {
    for (const kind of scene.wants ?? []) {
      const piece = pieces.find((item) => item.kind === kind);
      if (piece) chosen.add(piece.id);
    }
  }
  if (chosen.size === 0 && pieces.length > 0) chosen.add(pieces[0].id);
  return pieces.map((piece) => piece.id).filter((id) => chosen.has(id));
}

/**
 * Kinds the scene composes with that this project does not have yet. The
 * studio offers to create each one as a real, editable piece — nothing is
 * faked or substituted with the invitation.
 */
export function missingSceneKinds(
  scene: MockupScene,
  pieces: MockupPiece[],
): PieceKind[] {
  const kinds = new Set(pieces.map((piece) => piece.kind));
  return (scene.requires ?? []).filter((kind) => !kinds.has(kind));
}

/**
 * Geometry of the opened envelope flap, drawn behind the invitation in the
 * open-envelope scene: a box whose bottom edge sits on the envelope's mouth,
 * rotated with the envelope around its centre.
 */
export function flapBoxFor(
  placement: MockupPlacement,
  piece: MockupPiece,
  stage: { widthMm: number; heightMm: number },
): { x: number; y: number; w: number; h: number; rotation: number } | null {
  const page = piece.pages[placement.pageIndex] ?? piece.pages[0];
  if (!page) return null;
  const { width, height } = pageSizeOf(page);
  const aspect = width > 0 && height > 0 ? height / width : 1;
  const wMm = placement.w * placement.scale * stage.widthMm;
  const hMm = wMm * aspect;
  const flapMm = hMm * 0.5;
  const d = hMm / 2 + flapMm / 2;
  const rad = (placement.rotation * Math.PI) / 180;
  const cx = placement.x * stage.widthMm + d * Math.sin(rad);
  const cy = placement.y * stage.heightMm - d * Math.cos(rad);
  return {
    x: cx / stage.widthMm,
    y: cy / stage.heightMm,
    w: wMm / stage.widthMm,
    h: flapMm / stage.heightMm,
    rotation: placement.rotation,
  };
}

/* -------------------------------------------------------------------------- */
/* Placement                                                                  */
/* -------------------------------------------------------------------------- */

export interface MockupPlacement {
  slotId: string;
  pieceId: string;
  /** Index of the shown page inside the piece. */
  pageIndex: number;
  /** Centre, as a fraction of the stage. */
  x: number;
  y: number;
  rotation: number;
  /** Width as a fraction of the stage width. */
  w: number;
  scale: number;
  z: number;
  style: MockupStyle;
}

export interface PlacementOverride {
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  z?: number;
}

interface RawPlacement {
  slotDef: MockupSlot;
  piece: MockupPiece;
  pageIndex: number;
}

/**
 * Fills a scene's slots from the chosen pieces.
 *
 * Four passes keep the headline slots honest instead of greedy:
 *
 *  1. Slots that ask for a kind receive exactly that kind — a box tray never
 *     swallows the invitation just because it was declared first.
 *  2. Open slots take whatever is left.
 *  3. A slot whose preferred kind does not exist in this project falls back,
 *     so a suite without a liner or RSVP still renders every chosen piece.
 *  4. Only if the scene would be empty does any slot accept anything.
 *
 * A pass-1 slot showing a later page may reuse an already-placed piece of its
 * kind, which is what lets a folded invitation show its face and inside spread
 * side by side from a single piece. Slots left without a piece are dropped —
 * never rendered as an empty placeholder.
 */
export function resolvePlacements(
  scene: MockupScene,
  pieces: MockupPiece[],
  selectedIds: string[],
  overrides: Record<string, PlacementOverride> = {},
): MockupPlacement[] {
  const chosen = selectedIds
    .map((id) => pieces.find((piece) => piece.id === id))
    .filter((piece): piece is MockupPiece => Boolean(piece));
  const remaining = [...chosen];
  const chosenKinds = new Set(chosen.map((piece) => piece.kind));

  const hasPage = (piece: MockupPiece, slotDef: MockupSlot) =>
    piece.pages.length > (slotDef.pageIndex ?? 0);
  const takeWhere = (slotDef: MockupSlot, ok: (piece: MockupPiece) => boolean) => {
    const index = remaining.findIndex(
      (piece) => hasPage(piece, slotDef) && ok(piece),
    );
    return index < 0 ? null : (remaining.splice(index, 1)[0] ?? null);
  };

  const filled: RawPlacement[] = [];
  const fill = (slotDef: MockupSlot, piece: MockupPiece) => {
    // An envelope shows its flap side unless a slot explicitly asks for the
    // address side, so it reads as an envelope wherever it lands.
    const wanted =
      slotDef.pageIndex ?? (piece.kind === "envelope" ? 1 : 0);
    filled.push({
      slotDef,
      piece,
      pageIndex: Math.min(wanted, piece.pages.length - 1),
    });
  };

  const preferSlots = scene.slots.filter((item) => item.prefer);
  const plainSlots = scene.slots.filter((item) => !item.prefer);

  // 1. Preferred kinds only (with face/inside reuse for folds).
  for (const slotDef of preferSlots) {
    const needed = slotDef.pageIndex ?? 0;
    if (needed > 0) {
      const reused = filled.find(
        (item) =>
          item.piece.kind === slotDef.prefer && item.piece.pages.length > needed,
      );
      if (reused) {
        fill(slotDef, reused.piece);
        continue;
      }
    }
    const piece = takeWhere(slotDef, (item) => item.kind === slotDef.prefer);
    if (piece) fill(slotDef, piece);
  }

  // 2. Open slots take what remains.
  for (const slotDef of plainSlots) {
    const piece = takeWhere(slotDef, () => true);
    if (piece) fill(slotDef, piece);
  }

  // 3. Preferred kind absent from the project entirely → fall back.
  for (const slotDef of preferSlots) {
    if (filled.some((item) => item.slotDef.id === slotDef.id)) continue;
    if (chosenKinds.has(slotDef.prefer!)) continue;
    const piece = takeWhere(slotDef, () => true);
    if (piece) fill(slotDef, piece);
  }

  // 4. Nothing rendered at all → let every slot try.
  if (filled.length === 0) {
    for (const slotDef of [...preferSlots, ...plainSlots]) {
      const piece = takeWhere(slotDef, () => true);
      if (piece) fill(slotDef, piece);
    }
  }

  let result: MockupPlacement[] = filled.map((item) => ({
    slotId: item.slotDef.id,
    pieceId: item.piece.id,
    pageIndex: item.pageIndex,
    x: item.slotDef.x,
    y: item.slotDef.y,
    rotation: item.slotDef.rotation,
    w: item.slotDef.w,
    scale: 1,
    z: item.slotDef.z,
    style: item.slotDef.style ?? "flat",
  }));

  // A scene that ends up with a single piece (a one-piece project, or a fold
  // with no second page) reads better centred than parked in one slot.
  if (result.length === 1 && scene.slots.length > 1) {
    result[0] = {
      ...result[0],
      x: 0.5,
      y: 0.5,
      w: Math.max(result[0].w, 0.5),
      z: 3,
    };
  }

  // The authored defaults must never clip: fit each piece's rotated bounding
  // box onto the stage before the owner's own overrides are applied.
  result = fitPlacementsToStage(result, scene, chosen);

  // Overrides win — the owner's arrangement, including off-centre drags, is
  // exactly what was saved.
  result = result.map((placement) => {
    const override = overrides[placement.slotId];
    if (!override) return placement;
    return {
      ...placement,
      x: override.x ?? placement.x,
      y: override.y ?? placement.y,
      rotation: override.rotation ?? placement.rotation,
      scale: override.scale ?? placement.scale,
      z: override.z ?? placement.z,
    };
  });

  return result.sort((a, b) => a.z - b.z || a.slotId.localeCompare(b.slotId));
}

/**
 * Shrinks and centres authored slot positions until every piece's rotated
 * bounding box sits fully inside the stage.
 *
 * A portrait invitation beside a landscape envelope overflows a fixed slot
 * box — the arithmetic is simple: the rotated bounds grow linearly with the
 * piece width, so the largest width that fits is a one-line solve. Slot
 * positions are adjusted only when they actually overflow; the owner's saved
 * overrides are applied afterwards and are never rewritten.
 */
function fitPlacementsToStage(
  placements: MockupPlacement[],
  scene: MockupScene,
  chosen: MockupPiece[],
): MockupPlacement[] {
  if (placements.length === 0 || chosen.length === 0) return placements;
  const maxW = Math.max(1, ...chosen.map((piece) => piece.widthMm));
  const maxH = Math.max(1, ...chosen.map((piece) => piece.heightMm));
  const stageW = maxW * scene.stage.w;
  const stageH = maxH * scene.stage.h;
  const byId = new Map(chosen.map((piece) => [piece.id, piece]));

  return placements.map((placement) => {
    const piece = byId.get(placement.pieceId);
    const page = piece?.pages[placement.pageIndex] ?? piece?.pages[0];
    if (!piece || !page) return placement;
    const { width, height } = pageSizeOf(page);
    const aspect = width > 0 && height > 0 ? height / width : 1;
    const rad = (placement.rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    // Rotated bounds per unit of card width (millimetres).
    const perW = cos + aspect * sin;
    const perH = sin + aspect * cos;
    const wMm = Math.min(placement.w * stageW, stageW / perW, stageH / perH);
    const w = wMm / stageW;
    const halfX = (wMm * perW) / (2 * stageW);
    const halfY = (wMm * perH) / (2 * stageH);
    return {
      ...placement,
      w,
      x: Math.min(1 - halfX, Math.max(halfX, placement.x)),
      y: Math.min(1 - halfY, Math.max(halfY, placement.y)),
    };
  });
}

/** Keeps a dragged piece on the stage instead of letting it escape. */
export function clampPlacement(placement: MockupPlacement): MockupPlacement {
  return {
    ...placement,
    x: Math.min(1.15, Math.max(-0.15, placement.x)),
    y: Math.min(1.15, Math.max(-0.15, placement.y)),
    scale: Math.min(2.5, Math.max(0.3, placement.scale)),
  };
}

/** Stage size in millimetres for a scene and the pieces in it. */
export function stageSizeFor(
  scene: MockupScene,
  pieces: MockupPiece[],
): { widthMm: number; heightMm: number } {
  const maxW = Math.max(1, ...pieces.map((piece) => piece.widthMm));
  const maxH = Math.max(1, ...pieces.map((piece) => piece.heightMm));
  return { widthMm: maxW * scene.stage.w, heightMm: maxH * scene.stage.h };
}

/* -------------------------------------------------------------------------- */
/* Presentation options                                                       */
/* -------------------------------------------------------------------------- */

export interface MockupSurface {
  id: string;
  label: string;
  /** CSS background — always a surface simulation, never artwork. */
  css: string;
}

export const MOCKUP_SURFACES: MockupSurface[] = [
  { id: "ivory", label: "Ivory paper", css: "#f6f2ea" },
  { id: "linen", label: "Warm linen", css: "linear-gradient(135deg, #efe9df 0%, #e3dccf 100%)" },
  { id: "stone", label: "Cool stone", css: "linear-gradient(160deg, #eceae6 0%, #dcd9d3 100%)" },
  { id: "blush", label: "Blush silk", css: "linear-gradient(140deg, #f3e4e0 0%, #e7d0cb 100%)" },
  { id: "charcoal", label: "Charcoal", css: "linear-gradient(150deg, #2b2926 0%, #1b1a18 100%)" },
];

export function surfaceById(id: string): MockupSurface {
  return MOCKUP_SURFACES.find((surface) => surface.id === id) ?? MOCKUP_SURFACES[0];
}

/* -------------------------------------------------------------------------- */
/* Saved arrangements                                                         */
/* -------------------------------------------------------------------------- */

export interface MockupState {
  sceneId: string;
  surfaceId: string;
  /** Selected pieces, in slot-filling order. */
  pieceIds: string[];
  /** Light strength 0–100 (shadow depth). */
  light: number;
  /** Stage tilt in degrees. */
  tilt: number;
  /** Simulated paper edge, 0–3. */
  thickness: number;
  seal: boolean;
  ribbon: boolean;
  overrides: Record<string, PlacementOverride>;
}

const STORAGE_KEY = "lamsa.mockups";

export function defaultMockupState(pieces: MockupPiece[]): MockupState {
  return {
    sceneId: "card",
    surfaceId: "ivory",
    pieceIds: pieces.map((piece) => piece.id),
    light: 55,
    tilt: 0,
    thickness: 1,
    seal: false,
    ribbon: false,
    overrides: {},
  };
}

function numberOr(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Validates a stored arrangement; anything malformed falls back cleanly. */
export function normalizeMockupState(
  raw: unknown,
  pieces: MockupPiece[],
): MockupState | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const ids = Array.isArray(value.pieceIds) ? value.pieceIds : [];
  const known = new Set(pieces.map((piece) => piece.id));
  const pieceIds = ids.filter(
    (id): id is string => typeof id === "string" && known.has(id),
  );
  if (pieceIds.length === 0) return null;

  const overrides: Record<string, PlacementOverride> = {};
  if (value.overrides && typeof value.overrides === "object") {
    for (const [key, entry] of Object.entries(
      value.overrides as Record<string, unknown>,
    )) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      overrides[key] = {
        x: typeof item.x === "number" ? numberOr(item.x, 0.5, -0.15, 1.15) : undefined,
        y: typeof item.y === "number" ? numberOr(item.y, 0.5, -0.15, 1.15) : undefined,
        rotation:
          typeof item.rotation === "number"
            ? numberOr(item.rotation, 0, -180, 180)
            : undefined,
        scale:
          typeof item.scale === "number" ? numberOr(item.scale, 1, 0.3, 2.5) : undefined,
        z: typeof item.z === "number" ? numberOr(item.z, 1, 0, 60) : undefined,
      };
    }
  }

  const sceneId =
    typeof value.sceneId === "string" &&
    MOCKUP_SCENES.some((scene) => scene.id === value.sceneId)
      ? value.sceneId
      : "card";

  return {
    sceneId,
    surfaceId:
      typeof value.surfaceId === "string" &&
      MOCKUP_SURFACES.some((surface) => surface.id === value.surfaceId)
        ? value.surfaceId
        : "ivory",
    pieceIds,
    light: numberOr(value.light, 55, 0, 100),
    tilt: numberOr(value.tilt, 0, -14, 14),
    thickness: numberOr(value.thickness, 1, 0, 3),
    seal: Boolean(value.seal),
    ribbon: Boolean(value.ribbon),
    overrides,
  };
}

export function loadMockupState(designId: string, pieces: MockupPiece[]): MockupState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const entry = (raw as Record<string, unknown>)[designId];
    return normalizeMockupState(entry, pieces);
  } catch {
    return null;
  }
}

export function writeMockupState(designId: string, state: MockupState): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    const map = raw && typeof raw === "object" ? raw : {};
    (map as Record<string, unknown>)[designId] = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // A lost arrangement is a convenience, never design data.
  }
}

export function clearMockupState(designId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (raw && typeof raw === "object") delete (raw as Record<string, unknown>)[designId];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  } catch {
    // Nothing to clean up.
  }
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Mockup images are presentation files and never stand in for print output:
 * they carry their own suffix so a downloaded mockup can never be mistaken for
 * the printable artwork or the print-ready PDF.
 */
export function mockupExportName(title: string, format: "png" | "jpeg"): string {
  return `${safeFilename(title)}-mockup.${format === "jpeg" ? "jpg" : "png"}`;
}
