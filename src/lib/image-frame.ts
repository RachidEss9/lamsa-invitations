/**
 * Image framing.
 *
 * A photograph in LAMSA is never flattened into its frame. It keeps its own
 * set of editable settings — how it is fitted, how far in it sits, which point
 * of the picture stays put when it is zoomed, the angle it is turned to, and
 * three darkroom adjustments — and every surface (canvas, preview, public
 * invitation, PNG and PDF export) draws it from exactly these numbers, because
 * they all render through the same `DesignPageView`.
 *
 * The geometry here is written in the shape's own 0–100 coordinate space, the
 * same space the vector masks are drawn in, so a mask never has to know the
 * layer's size on the page to clip correctly.
 */

/** Photograph-only tonal adjustments. Absent means "leave the file alone". */
export interface ImageAdjust {
  /** 100 is the file as uploaded. */
  brightness?: number;
  /** 100 is the file as uploaded. */
  contrast?: number;
  /** 100 is the file as uploaded; 0 is greyscale. */
  saturation?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Repairs adjustments saved by an older or edited run. Anything outside the
 * usable range is pulled back, and a set that is entirely default is dropped,
 * so an untouched photograph carries no settings at all.
 */
export function normalizeImageAdjust(value: unknown): ImageAdjust | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Partial<ImageAdjust>;
  const adjust: ImageAdjust = {};

  const brightness = clamp(finite(raw.brightness, 100), 20, 220);
  if (Math.round(brightness) !== 100) adjust.brightness = brightness;

  const contrast = clamp(finite(raw.contrast, 100), 20, 220);
  if (Math.round(contrast) !== 100) adjust.contrast = contrast;

  const saturation = clamp(finite(raw.saturation, 100), 0, 260);
  if (Math.round(saturation) !== 100) adjust.saturation = saturation;

  return Object.keys(adjust).length > 0 ? adjust : undefined;
}

/**
 * The composed CSS `filter` for a photograph. Returning `undefined` when every
 * channel is neutral keeps the untouched path pixel-identical to before, so a
 * design saved years ago renders exactly as it always did.
 */
export function imageAdjustFilter(adjust: ImageAdjust | undefined): string | undefined {
  if (!adjust) return undefined;
  const parts: string[] = [];
  const brightness = clamp(finite(adjust.brightness, 100), 0, 300);
  const contrast = clamp(finite(adjust.contrast, 100), 0, 300);
  const saturation = clamp(finite(adjust.saturation, 100), 0, 300);
  if (Math.round(brightness) !== 100) parts.push(`brightness(${(brightness / 100).toFixed(3)})`);
  if (Math.round(contrast) !== 100) parts.push(`contrast(${(contrast / 100).toFixed(3)})`);
  if (Math.round(saturation) !== 100) parts.push(`saturate(${(saturation / 100).toFixed(3)})`);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/* -------------------------------------------------------------------------- */
/* Rotation inside a frame                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Turning a filled frame opens its corners. This is the factor the picture has
 * to grow by so the frame stays fully covered after the turn: the smallest
 * scale at which the rotated rectangle still contains the box it came from.
 * "Fit inside" is left alone — a picture that is already showing its whole
 * self must not be enlarged behind the host's back.
 */
export function rotationCoverScale(
  rotation: number,
  box: { width: number; height: number },
  contain: boolean,
): number {
  const angle = finite(rotation, 0);
  if (!angle || contain) return 1;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const width = Math.max(1, box.width);
  const height = Math.max(1, box.height);
  // The rotated rectangle's bounding box has to fit inside the scaled one.
  const across = (width * cos + height * sin) / width;
  const down = (width * sin + height * cos) / height;
  return Math.max(1, across, down);
}

/* -------------------------------------------------------------------------- */
/* Masked placement                                                           */
/* -------------------------------------------------------------------------- */

export type ImageFit = "cover" | "contain";

export interface MaskedImageInput {
  /** The file's own width ÷ height, once the browser has measured it. */
  aspect?: number;
  fit?: ImageFit;
  /** How far into the frame the picture sits, as a fraction of the layer. */
  zoom?: number;
  /** The point of the picture that stays put, in percent of the layer box. */
  position?: { x: number; y: number };
  /** The picture's own angle inside the mask, in degrees. */
  rotation?: number;
}

/** Where the `<image>` goes, in the mask's 0–100 space. */
export interface MaskedImageBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * `slice` fills the box and crops the overflow, `meet` shows the whole file.
   * The box is sized to the file's own proportions, so neither one distorts.
   */
  preserveAspectRatio: "xMidYMid slice" | "xMidYMid meet";
}

/** The mask space is a 100 × 100 square, matching the vector paths. */
const BOX = 100;

function tidy(value: number) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Places a photograph inside a mask.
 *
 * With the file's proportions known, the picture is sized to fill or fit the
 * box exactly, then the focal point is honoured: moving the focal point pans
 * the picture across the frame, and zooming keeps that point nailed down, the
 * way a crop tool behaves everywhere else. Rotation is then applied about the
 * frame's centre, growing the picture only when it is filling the frame.
 *
 * Without proportions — a file the browser has not measured yet — the picture
 * is centred in a square box and the browser keeps its own proportions, which
 * is exactly how masked images have always rendered. The focal point waits for
 * the measurement instead of guessing.
 */
export function maskedImageFrame(input: MaskedImageInput): MaskedImageBox {
  const fit: ImageFit = input.fit === "contain" ? "contain" : "cover";
  const zoom = clamp(finite(input.zoom, 1), 0.1, 5);
  const px = clamp(finite(input.position?.x, 50), 0, 100);
  const py = clamp(finite(input.position?.y, 50), 0, 100);
  const rotation = finite(input.rotation, 0);

  const raw = finite(input.aspect, 0);
  const aspect = raw > 0.05 && raw < 20 ? raw : undefined;

  let x: number;
  let y: number;
  let width: number;
  let height: number;

  if (aspect != null) {
    const base =
      fit === "contain"
        ? Math.min(BOX, BOX * aspect)
        : Math.max(BOX, BOX * aspect);
    width = base;
    height = base / aspect;
    // The focal point of the file lands on the same percentage of the box, so
    // x = 0 lines the left edge up and x = 100 lines the right one up.
    x = -(width - BOX) * (px / 100);
    y = -(height - BOX) * (py / 100);
    // Zoom about the focal point: it never moves, everything else grows.
    x = px - (px - x) * zoom;
    y = py - (py - y) * zoom;
    width *= zoom;
    height *= zoom;
  } else {
    // Not measured yet: a centred square, scaled about the middle.
    width = BOX * zoom;
    height = BOX * zoom;
    x = (BOX - width) / 2;
    y = (BOX - height) / 2;
  }

  if (rotation && fit !== "contain") {
    // The rotated box's bounding square, centred on the frame. Growing the
    // picture to contain it guarantees the corners stay covered however the
    // photograph is turned, without touching the mask itself.
    const radians = (rotation * Math.PI) / 180;
    const half = (BOX / 2) * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)));
    const right = x + width;
    const bottom = y + height;
    x = Math.min(x, BOX / 2 - half);
    y = Math.min(y, BOX / 2 - half);
    width = Math.max(right, BOX / 2 + half) - x;
    height = Math.max(bottom, BOX / 2 + half) - y;
  }

  return {
    x: tidy(x),
    y: tidy(y),
    width: tidy(width),
    height: tidy(height),
    preserveAspectRatio: fit === "contain" ? "xMidYMid meet" : "xMidYMid slice",
  };
}
