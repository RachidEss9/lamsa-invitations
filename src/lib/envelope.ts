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
      Math.abs(preset.width - settings.width) < 0.5 &&
      Math.abs(preset.height - settings.height) < 0.5,
  );
}

/** A lining colour, only when it is a single flat colour the renderer can use. */
export function usableLining(value?: string | null): string | undefined {
  const colour = (value ?? "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colour) ? colour : undefined;
}
