/**
 * Editable layer effects.
 *
 * Effects are stored as plain settings on the element (`effects`), never baked
 * into artwork, so every one of them stays switchable, editable, resettable and
 * copyable after the invitation is saved and reopened. The renderer composes
 * them from these settings in the editor, previews, the public invitation and
 * the raster print pipeline.
 *
 * Only effects the DOM renderer can draw faithfully are exposed: drop shadow,
 * outer glow, inner shadow on boxed forms, a glyph outline, and gradient fills.
 * Blend modes are deliberately absent — the print pipeline rasterises the DOM
 * and cannot guarantee them, so no control offers them.
 */

export interface ShadowEffect {
  enabled: boolean;
  color: string;
  opacity: number;
  blur: number;
  distance: number;
  angle: number;
}

export interface GlowEffect {
  enabled: boolean;
  color: string;
  opacity: number;
  blur: number;
}

export interface GradientEffect {
  enabled: boolean;
  from: string;
  to: string;
  angle: number;
}

export interface OutlineEffect {
  enabled: boolean;
  color: string;
  width: number;
}

export interface LayerEffects {
  shadow?: ShadowEffect;
  glow?: GlowEffect;
  innerShadow?: ShadowEffect;
  gradient?: GradientEffect;
  outline?: OutlineEffect;
}

export const DEFAULT_SHADOW: ShadowEffect = {
  enabled: true,
  color: "#161616",
  opacity: 0.28,
  blur: 28,
  distance: 12,
  angle: 90,
};

export const DEFAULT_GLOW: GlowEffect = {
  enabled: true,
  color: "#c3a469",
  opacity: 0.55,
  blur: 30,
};

export const DEFAULT_GRADIENT: GradientEffect = {
  enabled: true,
  from: "#710014",
  to: "#c3a469",
  angle: 90,
};

export const DEFAULT_OUTLINE: OutlineEffect = {
  enabled: true,
  color: "#f2f1ed",
  width: 2,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isHexColour(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function colour(value: unknown, fallback: string) {
  return isHexColour(value) ? value.trim().toLowerCase() : fallback;
}

function opacity(value: unknown, fallback: number) {
  return clamp(finite(value, fallback), 0, 1);
}

function normalizedShadow(value: unknown, fallback: ShadowEffect): ShadowEffect | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ShadowEffect>;
  return {
    enabled: raw.enabled !== false,
    color: colour(raw.color, fallback.color),
    opacity: opacity(raw.opacity, fallback.opacity),
    blur: clamp(finite(raw.blur, fallback.blur), 0, 200),
    distance: clamp(finite(raw.distance, fallback.distance), 0, 200),
    angle: ((finite(raw.angle, fallback.angle) % 360) + 360) % 360,
  };
}

export function normalizeEffects(value: unknown): LayerEffects | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as LayerEffects;
  const effects: LayerEffects = {};

  const shadow = normalizedShadow(raw.shadow, DEFAULT_SHADOW);
  if (shadow) effects.shadow = shadow;

  const innerShadow = normalizedShadow(raw.innerShadow, DEFAULT_SHADOW);
  if (innerShadow) effects.innerShadow = innerShadow;

  if (raw.glow && typeof raw.glow === "object") {
    const glow = raw.glow as Partial<GlowEffect>;
    effects.glow = {
      enabled: glow.enabled !== false,
      color: colour(glow.color, DEFAULT_GLOW.color),
      opacity: opacity(glow.opacity, DEFAULT_GLOW.opacity),
      blur: clamp(finite(glow.blur, DEFAULT_GLOW.blur), 0, 200),
    };
  }

  if (raw.gradient && typeof raw.gradient === "object") {
    const gradient = raw.gradient as Partial<GradientEffect>;
    effects.gradient = {
      enabled: gradient.enabled !== false,
      from: colour(gradient.from, DEFAULT_GRADIENT.from),
      to: colour(gradient.to, DEFAULT_GRADIENT.to),
      angle: ((finite(gradient.angle, DEFAULT_GRADIENT.angle) % 360) + 360) % 360,
    };
  }

  if (raw.outline && typeof raw.outline === "object") {
    const outline = raw.outline as Partial<OutlineEffect>;
    effects.outline = {
      enabled: outline.enabled !== false,
      color: colour(outline.color, DEFAULT_OUTLINE.color),
      width: clamp(finite(outline.width, DEFAULT_OUTLINE.width), 0, 40),
    };
  }

  return Object.keys(effects).length > 0 ? effects : undefined;
}

/** `#rrggbb` plus an alpha channel, for filters and inset shadows. */
export function hexToRgba(hex: string, alpha = 1): string {
  const safe = isHexColour(hex) ? hex : "#161616";
  const value = safe.slice(1);
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const number = parseInt(full, 16);
  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}

/** Offsets a shadow's distance and angle into CSS pixels. */
export function shadowOffset(distance: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: Math.round(distance * Math.cos(radians) * 100) / 100,
    y: Math.round(distance * Math.sin(radians) * 100) / 100,
  };
}

/**
 * The composed CSS `filter` for an element: its drop shadow, then its glow.
 * Combining them into one filter keeps text glyphs, shape vectors and images
 * on exactly the same code path.
 */
export function effectFilter(effects: LayerEffects | undefined): string | undefined {
  if (!effects) return undefined;
  const parts: string[] = [];
  if (effects.shadow?.enabled) {
    const { x, y } = shadowOffset(effects.shadow.distance, effects.shadow.angle);
    parts.push(
      `drop-shadow(${x}px ${y}px ${Math.round(effects.shadow.blur)}px ${hexToRgba(
        effects.shadow.color,
        effects.shadow.opacity,
      )})`,
    );
  }
  if (effects.glow?.enabled && effects.glow.blur > 0) {
    const glow = hexToRgba(effects.glow.color, effects.glow.opacity);
    parts.push(`drop-shadow(0 0 ${Math.round(effects.glow.blur)}px ${glow})`);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/** A box inset shadow, only for forms that are boxed: rect, capsule, ellipse. */
export function insetShadow(
  effects: LayerEffects | undefined,
): string | undefined {
  const inner = effects?.innerShadow;
  if (!inner?.enabled || inner.blur <= 0) return undefined;
  const { x, y } = shadowOffset(inner.distance, inner.angle);
  return `inset ${x}px ${y}px ${Math.round(inner.blur)}px ${hexToRgba(
    inner.color,
    inner.opacity,
  )}`;
}

export function gradientCss(gradient: GradientEffect): string {
  // The HEX fields are typed live, so a half-typed value must never produce an
  // invalid paint; the previous valid colour is used until the field is whole.
  const from = isHexColour(gradient.from) ? gradient.from : DEFAULT_GRADIENT.from;
  const to = isHexColour(gradient.to) ? gradient.to : DEFAULT_GRADIENT.to;
  return `linear-gradient(${gradient.angle}deg, ${from}, ${to})`;
}

export function outlineWidth(effects: LayerEffects | undefined): number {
  const outline = effects?.outline;
  return outline?.enabled ? Math.max(0, outline.width) : 0;
}

export function effectsAreActive(effects: LayerEffects | undefined): boolean {
  if (!effects) return false;
  return Boolean(
    effects.shadow?.enabled ||
      effects.glow?.enabled ||
      effects.innerShadow?.enabled ||
      effects.gradient?.enabled ||
      effects.outline?.enabled,
  );
}

/* -------------------------------------------------------------------------- */
/* Copy / paste                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A session clipboard for effects. It lives outside React so copying on the
 * desktop panel and pasting after opening the phone's bottom sheet still work;
 * nothing is written to storage because effects belong to the design, not to
 * the device.
 */
let clipboard: LayerEffects | null = null;

export function copyEffects(effects: LayerEffects | undefined): LayerEffects | null {
  clipboard = effects ? (JSON.parse(JSON.stringify(effects)) as LayerEffects) : null;
  return clipboard;
}

export function pasteEffects(): LayerEffects | undefined {
  return clipboard ? (JSON.parse(JSON.stringify(clipboard)) as LayerEffects) : undefined;
}

export function hasCopiedEffects(): boolean {
  return clipboard !== null;
}
