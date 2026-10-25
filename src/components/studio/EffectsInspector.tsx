import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { DesignElement } from "@/lib/design";
import {
  DEFAULT_GLOW,
  DEFAULT_GRADIENT,
  DEFAULT_SHADOW,
  copyEffects,
  effectsAreActive,
  gradientCss,
  hasCopiedEffects,
  pasteEffects,
  type GlowEffect,
  type GradientEffect,
  type LayerEffects,
  type ShadowEffect,
} from "@/lib/effects";
import { cn } from "@/lib/utils";
import {
  ClipboardPaste,
  Copy,
  RotateCcw,
  Sparkles,
  Sun,
  Droplets,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

function compactNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function EffectNumber({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="font-ui text-[9px] font-medium uppercase tracking-[0.09em] text-ink/40">
        {label}
        {suffix ? ` · ${suffix}` : ""}
      </span>
      <Input
        type="number"
        value={compactNumber(value)}
        step={step}
        min={min}
        max={max}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (!Number.isFinite(parsed)) return;
          let next = parsed;
          if (typeof min === "number") next = Math.max(min, next);
          if (typeof max === "number") next = Math.min(max, next);
          onChange(next);
        }}
        className="mt-1 h-7 rounded-[8px] border-[var(--edge)] bg-[var(--surface-card)] px-2 text-right font-ui text-[10.5px] tabular-nums"
      />
    </label>
  );
}

function EffectColour({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#161616";
  return (
    <div className="flex items-center gap-1.5">
      <label
        className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-full border border-[var(--edge)] shadow-[var(--shadow-xs)]"
        style={{ background: safe }}
        title={label}
      >
        <span className="sr-only">{label}</span>
        <input
          type="color"
          value={safe}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} HEX`}
        className="h-7 rounded-[8px] border-[var(--edge)] px-1.5 font-meta text-[9.5px] uppercase tracking-[0.04em]"
      />
    </div>
  );
}

function EffectGroup({
  title,
  note,
  enabled,
  onToggle,
  icon: Icon,
  children,
}: {
  title: string;
  note: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-control)] border px-2.5 py-2 transition-colors",
        enabled
          ? "border-[var(--edge-strong)] bg-[var(--surface-card)]"
          : "border-[var(--edge)] bg-transparent",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full",
            enabled ? "bg-ink text-[var(--paper-light)]" : "bg-ink/[0.05] text-ink/40",
          )}
        >
          <Icon className="size-3" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-ui text-[11px] font-medium text-ink/80">
            {title}
          </span>
          <span className="block truncate text-[9px] text-ink/40">{note}</span>
        </span>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={`${title} on or off`}
          className="scale-90"
        />
      </div>
      {enabled && <div className="mt-2.5 space-y-2">{children}</div>}
    </div>
  );
}

const SHADOW_PRESETS: { label: string; value: ShadowEffect }[] = [
  {
    label: "Soft",
    value: { ...DEFAULT_SHADOW, blur: 18, distance: 6, opacity: 0.18 },
  },
  {
    label: "Lift",
    value: { ...DEFAULT_SHADOW, blur: 34, distance: 14, opacity: 0.3 },
  },
  {
    label: "Deep",
    value: { ...DEFAULT_SHADOW, blur: 52, distance: 22, opacity: 0.44 },
  },
];

/**
 * Editable layer effects.
 *
 * Everything here is a setting on the element, so an effect can be switched
 * off, reset, copied to another layer, or reopened months later with the same
 * values. Only effects the DOM renderer can draw faithfully are offered, and
 * each group says exactly where it applies.
 */
export function EffectsInspector({
  element,
  patch,
}: {
  element: DesignElement;
  patch: (value: Partial<DesignElement>) => void;
}) {
  const effects: LayerEffects = element.effects ?? {};
  const [clipboardReady, setClipboardReady] = useState(() => hasCopiedEffects());

  const shape = element.shape ?? "rect";
  const isFrame = Boolean(element.frameArt);
  const supportsInnerShadow =
    element.kind === "image" ||
    (element.kind === "shape" &&
      !isFrame &&
      (shape === "rect" || shape === "capsule" || shape === "ellipse"));
  const supportsGradient =
    element.kind === "text" ||
    (element.kind === "shape" &&
      !isFrame &&
      shape !== "line" &&
      // A photograph fills the shape; a gradient behind it would never show.
      !element.imageStorageId);
  const supportsOutline = element.kind === "text";

  const setEffects = (next: LayerEffects) => {
    patch({ effects: Object.keys(next).length > 0 ? next : undefined });
  };

  const patchShadow = (value: Partial<ShadowEffect>) => {
    setEffects({
      ...effects,
      shadow: { ...DEFAULT_SHADOW, ...effects.shadow, ...value },
    });
  };

  const patchGlow = (value: Partial<GlowEffect>) => {
    setEffects({ ...effects, glow: { ...DEFAULT_GLOW, ...effects.glow, ...value } });
  };

  const patchInner = (value: Partial<ShadowEffect>) => {
    setEffects({
      ...effects,
      innerShadow: { ...DEFAULT_SHADOW, ...effects.innerShadow, ...value },
    });
  };

  const patchGradient = (value: Partial<GradientEffect>) => {
    setEffects({
      ...effects,
      gradient: { ...DEFAULT_GRADIENT, ...effects.gradient, ...value },
    });
  };

  const shadow = effects.shadow ?? DEFAULT_SHADOW;
  const glow = effects.glow ?? DEFAULT_GLOW;
  const inner = effects.innerShadow ?? DEFAULT_SHADOW;
  const gradient = effects.gradient ?? DEFAULT_GRADIENT;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="section-label">Effects</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Copy these effects"
            aria-label="Copy effects"
            onClick={() => {
              copyEffects(element.effects);
              setClipboardReady(true);
              toast.success("Effects copied.");
            }}
            className="grid size-6 place-items-center rounded-full text-ink/45 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <Copy className="size-3" />
          </button>
          <button
            type="button"
            title="Paste effects onto this layer"
            aria-label="Paste effects"
            disabled={!clipboardReady}
            onClick={() => {
              const pasted = pasteEffects();
              if (!pasted) {
                toast.error("Copy effects from a layer first.");
                return;
              }
              // Only the effects this layer can actually draw are pasted, so a
              // control never claims something the renderer ignores.
              const allowed: LayerEffects = { ...pasted };
              if (!supportsGradient) delete allowed.gradient;
              if (!supportsInnerShadow) delete allowed.innerShadow;
              if (element.kind !== "text") delete allowed.outline;
              patch({
                effects: Object.keys(allowed).length > 0 ? allowed : undefined,
              });
              toast.success("Effects pasted.");
            }}
            className="grid size-6 place-items-center rounded-full text-ink/45 transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30"
          >
            <ClipboardPaste className="size-3" />
          </button>
          <button
            type="button"
            title="Reset every effect on this layer"
            aria-label="Reset effects"
            disabled={!effectsAreActive(element.effects)}
            onClick={() => {
              patch({ effects: undefined });
              toast.success("Effects reset.");
            }}
            className="grid size-6 place-items-center rounded-full text-ink/45 transition-colors hover:bg-[var(--red)]/[0.07] hover:text-[var(--red)] disabled:opacity-30"
          >
            <RotateCcw className="size-3" />
          </button>
        </div>
      </div>

      <EffectGroup
        title="Drop shadow"
        note="Follows the artwork's outline"
        icon={Sun}
        enabled={Boolean(effects.shadow?.enabled)}
        onToggle={(enabled) => patchShadow({ enabled })}
      >
        <div className="flex gap-1">
          {SHADOW_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                patchShadow({
                  ...preset.value,
                  color: shadow.color,
                  angle: shadow.angle,
                })
              }
              className="chip h-5 px-2 text-[9px]"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <EffectColour
          label="Shadow colour"
          value={shadow.color}
          onChange={(color) => patchShadow({ color })}
        />
        <div className="grid grid-cols-2 gap-2">
          <EffectNumber
            label="Opacity"
            suffix="%"
            value={Math.round(shadow.opacity * 100)}
            min={0}
            max={100}
            onChange={(value) => patchShadow({ opacity: value / 100 })}
          />
          <EffectNumber
            label="Blur"
            value={shadow.blur}
            min={0}
            max={160}
            onChange={(blur) => patchShadow({ blur })}
          />
          <EffectNumber
            label="Distance"
            value={shadow.distance}
            min={0}
            max={200}
            onChange={(distance) => patchShadow({ distance })}
          />
          <EffectNumber
            label="Angle"
            suffix="°"
            value={shadow.angle}
            min={0}
            max={360}
            onChange={(angle) => patchShadow({ angle })}
          />
        </div>
      </EffectGroup>

      <EffectGroup
        title="Outer glow"
        note="A soft champagne halo"
        icon={Sparkles}
        enabled={Boolean(effects.glow?.enabled)}
        onToggle={(enabled) => patchGlow({ enabled })}
      >
        <EffectColour
          label="Glow colour"
          value={glow.color}
          onChange={(color) => patchGlow({ color })}
        />
        <div className="grid grid-cols-2 gap-2">
          <EffectNumber
            label="Opacity"
            suffix="%"
            value={Math.round(glow.opacity * 100)}
            min={0}
            max={100}
            onChange={(value) => patchGlow({ opacity: value / 100 })}
          />
          <EffectNumber
            label="Blur"
            value={glow.blur}
            min={0}
            max={200}
            onChange={(blur) => patchGlow({ blur })}
          />
        </div>
      </EffectGroup>

      {supportsInnerShadow && (
        <EffectGroup
          title="Inner shadow"
          note="Inside this box or photo"
          icon={Droplets}
          enabled={Boolean(effects.innerShadow?.enabled)}
          onToggle={(enabled) => patchInner({ enabled })}
        >
          <EffectColour
            label="Inner shadow colour"
            value={inner.color}
            onChange={(color) => patchInner({ color })}
          />
          <div className="grid grid-cols-2 gap-2">
            <EffectNumber
              label="Opacity"
              suffix="%"
              value={Math.round(inner.opacity * 100)}
              min={0}
              max={100}
              onChange={(value) => patchInner({ opacity: value / 100 })}
            />
            <EffectNumber
              label="Blur"
              value={inner.blur}
              min={0}
              max={160}
              onChange={(blur) => patchInner({ blur })}
            />
            <EffectNumber
              label="Distance"
              value={inner.distance}
              min={0}
              max={100}
              onChange={(distance) => patchInner({ distance })}
            />
            <EffectNumber
              label="Angle"
              suffix="°"
              value={inner.angle}
              min={0}
              max={360}
              onChange={(angle) => patchInner({ angle })}
            />
          </div>
        </EffectGroup>
      )}

      {supportsGradient && (
        <EffectGroup
          title="Gradient fill"
          note={element.kind === "text" ? "Clips to the letterforms" : "Repaints this shape"}
          icon={Sparkles}
          enabled={Boolean(effects.gradient?.enabled)}
          onToggle={(enabled) => patchGradient({ enabled })}
        >
          <div
            className="h-9 w-full rounded-[8px] border border-[var(--edge)]"
            style={{ background: gradientCss(gradient) }}
            aria-hidden
          />
          <div className="grid grid-cols-2 gap-2">
            <EffectColour
              label="From"
              value={gradient.from}
              onChange={(from) => patchGradient({ from })}
            />
            <EffectColour
              label="To"
              value={gradient.to}
              onChange={(to) => patchGradient({ to })}
            />
          </div>
          <EffectNumber
            label="Angle"
            suffix="°"
            value={gradient.angle}
            min={0}
            max={360}
            onChange={(angle) => patchGradient({ angle })}
          />
        </EffectGroup>
      )}

      {supportsOutline && (
        <p className="rounded-[var(--radius-control)] border border-[var(--edge)] bg-[var(--surface-sunk)]/50 px-2.5 py-2 text-[9px] leading-relaxed text-ink/45">
          Glyph outline for text lives in the Typography section, next to case and
          colour, so all lettering controls stay in one place.
        </p>
      )}

      {element.kind === "shape" && !supportsGradient && (
        <p className="rounded-[var(--radius-control)] border border-[var(--edge)] bg-[var(--surface-sunk)]/50 px-2.5 py-2 text-[9px] leading-relaxed text-ink/45">
          Decorative frames and rules take shadow and glow. Their ink and weight
          stay in Shape &amp; mask, and gradient fills are not offered on
          stroke-only artwork.
        </p>
      )}

      <p className="text-[9px] leading-relaxed text-ink/35">
        Effects are live settings, never baked in. Shadows and glows are drawn by
        the same renderer as the artwork, so previews, the public invitation and
        the exported image or PDF carry them.
      </p>
    </div>
  );
}
