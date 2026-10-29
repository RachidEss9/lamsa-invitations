import { pageSizeOf, type DesignDocument, type DesignPage } from "@/lib/design";
import { safeFilename } from "@/lib/print";

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
    stage: { w: 1.55, h: 1.45 },
    slots: [slot("card", { x: 0.5, y: 0.5, w: 0.64, rotation: -2, z: 3 })],
  },
  {
    id: "card-envelope",
    label: "Invitation with envelope",
    note: "The card resting on its closed envelope.",
    stage: { w: 2, h: 1.6 },
    slots: [
      slot("envelope", { prefer: "envelope", x: 0.6, y: 0.4, w: 0.6, rotation: -7, z: 1 }),
      slot("card", { x: 0.42, y: 0.6, w: 0.52, rotation: 5, z: 3 }),
      slot("extra", { x: 0.8, y: 0.76, w: 0.3, rotation: 11, z: 2 }),
    ],
  },
  {
    id: "open-envelope",
    label: "Open envelope",
    note: "The envelope's flap side behind the card sliding out of it.",
    stage: { w: 1.9, h: 1.7 },
    slots: [
      slot("envelope", {
        prefer: "envelope",
        pageIndex: 1,
        x: 0.5,
        y: 0.66,
        w: 0.66,
        rotation: -3,
        z: 1,
        style: "flap",
      }),
      slot("card", { x: 0.52, y: 0.36, w: 0.5, rotation: 3, z: 3 }),
      slot("extra", { x: 0.78, y: 0.8, w: 0.26, rotation: 9, z: 2 }),
    ],
  },
  {
    id: "suite-spread",
    label: "Invitation, RSVP & details",
    note: "Three cards fanned as a set.",
    stage: { w: 2.2, h: 1.5 },
    slots: [
      slot("rsvp", { x: 0.2, y: 0.66, w: 0.3, rotation: -9, z: 1 }),
      slot("details", { x: 0.8, y: 0.64, w: 0.3, rotation: 8, z: 1 }),
      slot("card", { x: 0.5, y: 0.44, w: 0.44, rotation: -1, z: 3 }),
    ],
  },
  {
    id: "collection",
    label: "Stationery collection",
    note: "Every piece laid out as a coordinated flat lay.",
    stage: { w: 2.3, h: 1.9 },
    slots: [
      slot("a", { x: 0.27, y: 0.28, w: 0.3, rotation: -4, z: 1 }),
      slot("b", { x: 0.73, y: 0.3, w: 0.3, rotation: 5, z: 1 }),
      slot("c", { x: 0.28, y: 0.74, w: 0.3, rotation: 3, z: 1 }),
      slot("d", { x: 0.72, y: 0.72, w: 0.3, rotation: -6, z: 1 }),
      slot("card", { x: 0.5, y: 0.51, w: 0.36, rotation: 0, z: 3 }),
    ],
  },
  {
    id: "folded",
    label: "Folded / gatefold",
    note:
      "The piece's face and inside spread side by side; falls back to a single card when there is no second page.",
    stage: { w: 2.4, h: 1.5 },
    slots: [
      slot("panel-left", { pageIndex: 0, x: 0.27, y: 0.5, w: 0.44, z: 1 }),
      slot("panel-right", { pageIndex: 1, x: 0.73, y: 0.5, w: 0.44, z: 1 }),
    ],
  },
  {
    id: "box",
    label: "Luxury invitation box",
    note: "The card presented inside a lined box tray.",
    stage: { w: 1.9, h: 1.7 },
    slots: [
      slot("envelope", { prefer: "liner", x: 0.5, y: 0.48, w: 0.66, rotation: 0, z: 1 }),
      slot("card", { x: 0.5, y: 0.52, w: 0.5, rotation: -1, z: 3 }),
    ],
  },
];

export function sceneById(id: string): MockupScene {
  return MOCKUP_SCENES.find((scene) => scene.id === id) ?? MOCKUP_SCENES[0];
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

/**
 * Fills a scene's slots from the chosen pieces.
 *
 * Slots that prefer a kind take those pieces first (so an envelope lands on
 * the envelope slot even if it was selected last), the rest fill in selection
 * order, and slots left without a piece are dropped — a two-piece project
 * simply renders a two-piece scene instead of a placeholder.
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

  const take = (slotDef: MockupSlot): MockupPiece | null => {
    if (remaining.length === 0) return null;
    const needed = slotDef.pageIndex ?? 0;
    // A slot that shows a specific page only accepts pieces that have it, so
    // an unfinished fold never consumes a piece and then renders nothing.
    const fits = (piece: MockupPiece) => piece.pages.length > needed;
    let index = -1;
    if (slotDef.prefer) {
      index = remaining.findIndex(
        (piece) => piece.kind === slotDef.prefer && fits(piece),
      );
    }
    if (index < 0) index = remaining.findIndex(fits);
    if (index < 0) return null;
    return remaining.splice(index, 1)[0] ?? null;
  };

  const ordered = [
    ...scene.slots.filter((item) => item.prefer),
    ...scene.slots.filter((item) => !item.prefer),
  ];

  const placements: MockupPlacement[] = [];
  for (const slotDef of ordered) {
    const piece = take(slotDef);
    if (!piece) continue;
    const pageIndex = Math.min(slotDef.pageIndex ?? 0, piece.pages.length - 1);
    const override = overrides[slotDef.id] ?? {};
    placements.push({
      slotId: slotDef.id,
      pieceId: piece.id,
      pageIndex,
      x: override.x ?? slotDef.x,
      y: override.y ?? slotDef.y,
      rotation: override.rotation ?? slotDef.rotation,
      w: slotDef.w,
      scale: override.scale ?? 1,
      z: override.z ?? slotDef.z,
      style: slotDef.style ?? "flat",
    });
  }

  // A scene that ends up with a single piece (a one-piece project, or a fold
  // with no second page) reads better centred than parked in one slot.
  if (placements.length === 1 && scene.slots.length > 1) {
    placements[0] = {
      ...placements[0],
      x: 0.5,
      y: 0.5,
      w: Math.max(placements[0].w, 0.5),
      z: 3,
    };
  }

  return placements.sort((a, b) => a.z - b.z || a.slotId.localeCompare(b.slotId));
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
    pieceIds: pieces.slice(0, 3).map((piece) => piece.id),
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
