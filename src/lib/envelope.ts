import type { EnvelopeSettings } from "@/lib/design";

/**
 * Physical suite geometry.
 *
 * The opening is composed on the classic 1000 × 1333 artboard, but an envelope
 * is a real object sold in millimetres. This module turns a stationery size into
 * the box the opening renders, keeping the artwork inside the same stage so the
 * public invitation, the editor preview, and every saved design agree.
 */

export const OPENING_STAGE = { width: 1000, height: 1333 } as const;

/** The suite LAMSA shipped before stationery sizes existed. */
export const LEGACY_ENVELOPE = {
  left: 90,
  top: 70,
  width: 820,
  height: 1263,
  flapHeight: 660,
  sealTop: 708,
  pocketTop: 630,
} as const;

const MAX_WIDTH = 820;
const MAX_HEIGHT = 1263;

export interface EnvelopeBox {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Hinge depth, measured from the top edge. */
  flapHeight: number;
  sealTop: number;
  /** Where the front pocket begins. */
  pocketTop: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * A box for the configured envelope, or the exact legacy box when no size has
 * been chosen — so an older saved invitation opens precisely as it always did.
 */
export function envelopeStageBox(
  settings?: EnvelopeSettings | null,
): EnvelopeBox {
  const widthMm = Number(settings?.width);
  const heightMm = Number(settings?.height);
  if (!(widthMm > 0) || !(heightMm > 0)) {
    return { ...LEGACY_ENVELOPE };
  }

  const aspect = widthMm / heightMm;
  let width = MAX_WIDTH;
  let height = width / aspect;
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT;
    width = height * aspect;
  }
  // Extremely long or wide envelopes stay visible instead of becoming a sliver.
  width = clamp(width, 260, MAX_WIDTH);
  height = clamp(height, 260, MAX_HEIGHT);

  const boxWidth = Math.round(width);
  const boxHeight = Math.round(height);
  const left = Math.round((OPENING_STAGE.width - boxWidth) / 2);
  const top = Math.round((OPENING_STAGE.height - boxHeight) / 2);
  const flapDepth = clamp(settings?.flapDepth ?? 0.523, 0.2, 0.75);
  const flapHeight = Math.round(boxHeight * flapDepth);

  return {
    left,
    top,
    width: boxWidth,
    height: boxHeight,
    flapHeight,
    sealTop: top + flapHeight - 22,
    // The folded front edge sits just below the flap point, matching the
    // legacy 630 / 1263 proportion.
    pocketTop: Math.round(top + boxHeight * 0.499),
  };
}

/** The size the designer should show, in millimetres. */
export function envelopeMillimetres(
  settings?: EnvelopeSettings | null,
): { width: number; height: number } {
  const width = Number(settings?.width);
  const height = Number(settings?.height);
  if (width > 0 && height > 0) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  // Legacy 820 × 1263 suite read at the height of a C6 envelope.
  return {
    width: Math.round((LEGACY_ENVELOPE.width / LEGACY_ENVELOPE.height) * 162),
    height: 162,
  };
}

export interface EnvelopePreset {
  id: string;
  label: string;
  note: string;
  width: number;
  height: number;
}

/** Sizes a stationer actually stocks, in millimetres. */
export const ENVELOPE_PRESETS: EnvelopePreset[] = [
  { id: "c6", label: "C6", note: "114 × 162 mm · folds an A4 sheet", width: 114, height: 162 },
  { id: "c5", label: "C5", note: "162 × 229 mm · takes an A5 card", width: 162, height: 229 },
  { id: "dl", label: "DL", note: "110 × 220 mm · long card", width: 110, height: 220 },
  { id: "a6", label: "A6", note: "105 × 148 mm · RSVP size", width: 105, height: 148 },
  { id: "square", label: "Square", note: "155 × 155 mm · favour suite", width: 155, height: 155 },
  { id: "5x7", label: "5 × 7 in", note: "127 × 178 mm · mailed invitation", width: 127, height: 178 },
];

/** A quiet default: a C6 envelope with the suite's own flap depth. */
export function defaultEnvelopeSettings(): EnvelopeSettings {
  return { width: 114, height: 162, flapDepth: 0.523 };
}

export function envelopePresetFor(
  settings?: EnvelopeSettings | null,
): EnvelopePreset | undefined {
  if (!settings) return undefined;
  return ENVELOPE_PRESETS.find(
    (preset) =>
      Math.abs(preset.width - (settings.width ?? 0)) < 0.5 &&
      Math.abs(preset.height - (settings.height ?? 0)) < 0.5,
  );
}

/** A lining colour, only when it is a single flat colour the renderer can use. */
export function usableLining(value?: string | null): string | undefined {
  const colour = (value ?? "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colour) ? colour : undefined;
}

/* -------------------------------------------------------------------------- */
/* Envelope & stationery designer                                            */
/* -------------------------------------------------------------------------- */

/**
 * The envelope workspace draws a real envelope: a hinge along the top edge of
 * the back, a flap reaching down from it, and address zones measured in
 * millimetres. Nothing here is part of an invitation's artwork — every shape
 * this module produces is a screen guide unless the host explicitly asks for
 * it in an export.
 */

export type FlapShape = "point" | "straight" | "rounded" | "wallet";

export const FLAP_SHAPES: { id: FlapShape; label: string; note: string }[] = [
  { id: "point", label: "Pointed", note: "The classic V flap with a peaked edge" },
  { id: "straight", label: "Straight", note: "A square horizontal flap" },
  { id: "rounded", label: "Rounded", note: "A soft curved flap edge" },
  { id: "wallet", label: "Wallet", note: "A deep flap with rounded corners" },
];

/** Placement guides, in millimetres from the top-left of the piece. */
export interface EnvelopeGeometry {
  widthMm: number;
  heightMm: number;
  flap: { shape: FlapShape; depthMm: number };
  /** Screen guides. Never exported unless the host opts in. */
  guides: {
    returnAddress: boolean;
    recipient: boolean;
    stamp: boolean;
    postageSafe: boolean;
  };
  /** Draw the flap outline on the back view. */
  showFlap: boolean;
  /** Show where the liner sits inside the envelope. */
  showLiner: boolean;
}

export const DEFAULT_GUIDES = {
  returnAddress: true,
  recipient: true,
  stamp: true,
  postageSafe: true,
} as const;

/** A C6 envelope with a proportionally deep, pointed flap. */
export function defaultEnvelopeGeometry(
  widthMm = 114,
  heightMm = 162,
): EnvelopeGeometry {
  const width = widthMm > 0 ? widthMm : 114;
  const height = heightMm > 0 ? heightMm : 162;
  return {
    widthMm: width,
    heightMm: height,
    flap: {
      shape: "point",
      depthMm: Math.round(height * 0.42),
    },
    guides: { ...DEFAULT_GUIDES },
    showFlap: true,
    showLiner: false,
  };
}

/** Repairs geometry saved by an older run; returns nothing usable otherwise. */
export function normalizeEnvelopeGeometry(
  value: unknown,
): EnvelopeGeometry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<EnvelopeGeometry>;
  const width = Number(raw.widthMm);
  const height = Number(raw.heightMm);
  if (!(width > 0) || !(height > 0)) return undefined;
  const base = defaultEnvelopeGeometry(width, height);
  const shape = FLAP_SHAPES.find((item) => item.id === raw.flap?.shape)?.id;
  const depth = Number(raw.flap?.depthMm);
  return {
    widthMm: width,
    heightMm: height,
    flap: {
      shape: (shape ?? base.flap.shape) as FlapShape,
      // A hinge deeper than 75% of the envelope or shallower than 20% would
      // render a flap nobody stocks.
      depthMm: Number.isFinite(depth)
        ? Math.min(height * 0.75, Math.max(height * 0.2, depth))
        : base.flap.depthMm,
    },
    guides: {
      returnAddress: raw.guides?.returnAddress ?? base.guides.returnAddress,
      recipient: raw.guides?.recipient ?? base.guides.recipient,
      stamp: raw.guides?.stamp ?? base.guides.stamp,
      postageSafe: raw.guides?.postageSafe ?? base.guides.postageSafe,
    },
    showFlap: raw.showFlap ?? base.showFlap,
    showLiner: raw.showLiner ?? base.showLiner,
  };
}

/** Millimetres → canvas units for a piece of this physical size. */
function scaleFor(widthMm: number, pageWidth: number): number {
  return pageWidth > 0 && widthMm > 0 ? pageWidth / widthMm : 1;
}

export interface ZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EnvelopeZones {
  /** Depth of the flap, in canvas units. */
  flapDepth: number;
  returnAddress?: ZoneRect;
  recipient?: ZoneRect;
  stamp?: ZoneRect;
  postageSafe?: ZoneRect;
  /** Vertical centre line, for centring the recipient address. */
  centreX: number;
}

/**
 * Where things go on a real envelope, measured in canvas units for one side.
 * The front carries the recipient and the stamp; the back carries the flap and
 * the return address, which stationers print on the flap itself.
 */
export function envelopeZones(
  geometry: EnvelopeGeometry,
  view: "front" | "back",
  pageWidth: number,
  pageHeight: number,
): EnvelopeZones {
  const k = scaleFor(geometry.widthMm, pageWidth);
  const flapDepth = geometry.flap.depthMm * k;
  // A 6 mm band keeps barcodes and addresses clear of the guillotine and the
  // postal sorting rollers.
  const safe = 6 * k;
  const zones: EnvelopeZones = {
    flapDepth,
    centreX: pageWidth / 2,
    postageSafe: geometry.guides.postageSafe
      ? { x: safe, y: safe, w: Math.max(1, pageWidth - safe * 2), h: Math.max(1, pageHeight - safe * 2) }
      : undefined,
  };
  if (view === "front") {
    if (geometry.guides.recipient) {
      zones.recipient = {
        x: pageWidth * 0.14,
        y: pageHeight * 0.44,
        w: pageWidth * 0.72,
        h: pageHeight * 0.3,
      };
    }
    if (geometry.guides.stamp) {
      zones.stamp = {
        x: pageWidth * 0.66,
        y: pageHeight * 0.07,
        w: pageWidth * 0.24,
        h: pageHeight * 0.2,
      };
    }
  } else if (geometry.guides.returnAddress) {
    zones.returnAddress = {
      x: pageWidth * 0.07,
      y: pageHeight * 0.06,
      w: pageWidth * 0.46,
      h: pageHeight * 0.16,
    };
  }
  return zones;
}

/**
 * The flap outline on the back view, as an SVG path in canvas units. The hinge
 * is the top edge; the free edge reaches down to `depth`.
 */
export function flapPath(
  width: number,
  height: number,
  depth: number,
  shape: FlapShape,
): string {
  const w = Math.max(1, width);
  const d = Math.min(Math.max(1, depth), Math.max(1, height));
  const round = (value: number) => Math.round(value * 100) / 100;
  switch (shape) {
    case "point":
      return `M 0 0 H ${round(w)} L ${round(w / 2)} ${round(d)} Z`;
    case "straight":
      return `M 0 0 H ${round(w)} V ${round(d)} H 0 Z`;
    case "rounded":
      return `M 0 0 H ${round(w)} C ${round(w * 0.78)} ${round(d * 1.18)} ${round(w * 0.22)} ${round(d * 1.18)} 0 0 Z`;
    case "wallet":
    default: {
      const r = Math.min(w * 0.14, d * 0.7);
      return `M 0 0 H ${round(w)} V ${round(d - r)} Q ${round(w)} ${round(d)} ${round(w - r)} ${round(d)} H ${round(r)} Q 0 ${round(d)} 0 ${round(d - r)} Z`;
    }
  }
}

/**
 * The flat liner: it lines the pocket and, because it is cut taller, the
 * inside of the flap as well. Stationers trim the extra to the flap outline.
 */
export function linerSizeFor(geometry: EnvelopeGeometry): {
  widthMm: number;
  heightMm: number;
} {
  const clearance = 2;
  return {
    widthMm: Math.max(20, geometry.widthMm - clearance),
    heightMm: Math.max(
      20,
      geometry.heightMm + geometry.flap.depthMm - clearance,
    ),
  };
}

/**
 * Reconciles stored geometry with the page it is drawn on. The page owns the
 * envelope's size — the host can resize it from the canvas — while the
 * geometry owns the flap's proportion, so a hinge never outgrows the paper.
 */
export function geometryForPage(
  geometry: EnvelopeGeometry,
  pageWidth: number,
  pageHeight: number,
): EnvelopeGeometry {
  const mmPerPx = 25.4 / 96;
  const widthMm = Math.max(1, pageWidth * mmPerPx);
  const heightMm = Math.max(1, pageHeight * mmPerPx);
  const ratio =
    geometry.heightMm > 0 ? geometry.flap.depthMm / geometry.heightMm : 0.42;
  const depthMm = Math.min(
    heightMm * 0.75,
    Math.max(heightMm * 0.2, ratio * heightMm),
  );
  return {
    ...geometry,
    widthMm,
    heightMm,
    flap: { ...geometry.flap, depthMm },
  };
}
