import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ColorField, Row, SegmentedRow } from "@/components/studio/inspector-fields";
import type { LayerMaterial, MaterialId } from "@/lib/materials";
import {
  MATERIAL_BLENDS,
  MATERIAL_PRESETS,
  copyMaterial,
  hasCopiedMaterial,
  materialForPreset,
  materialIsActive,
  materialOverlayStyle,
  materialPresetById,
  pasteMaterial,
} from "@/lib/materials";
import { cn } from "@/lib/utils";
import { ClipboardPaste, Copy, RotateCcw, Trash2, Layers2 } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";

/**
 * The Materials Studio.
 *
 * Every control here writes a setting, never a pixel: the finish stays a
 * surface layered over editable artwork, so it can be changed, switched off or
 * removed months later. What it cannot do is print — the export pipeline
 * captures the clean card — and the panel says so rather than implying a foil
 * seam or an emboss depth it cannot produce.
 */

/**
 * One finished swatch: the paper it sits on, plus the material over it. Used by
 * the inspector, the library and anywhere else a finish needs a truthful
 * thumbnail, so a tile always looks like the thing it applies.
 */
export function MaterialSwatch({
  material,
  className,
  style,
  base = "#f3f0e8",
}: {
  material: LayerMaterial;
  className?: string;
  style?: CSSProperties;
  /** The surface under the finish, so translucent materials read correctly. */
  base?: string;
}) {
  const overlay = materialOverlayStyle(material);
  return (
    <span
      className={cn("relative block overflow-hidden", className)}
      style={{ background: base, ...style }}
    >
      {overlay ? <span aria-hidden className="absolute inset-0" style={overlay} /> : null}
    </span>
  );
}

function FinishSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  display,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  display?: (value: number) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[58px] shrink-0 font-ui text-[9px] font-medium uppercase tracking-[0.09em] text-ink/40">
        {label}
      </span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={([next]) => onChange(next)}
        className="flex-1"
      />
      <span className="w-9 shrink-0 text-right font-meta text-[9px] tabular-nums text-ink/45">
        {display ? display(value) : `${Math.round(value * 100)}%`}
      </span>
    </div>
  );
}

function MaterialPresetGrid({
  active,
  onPick,
}: {
  active: MaterialId | undefined;
  onPick: (id: MaterialId) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
      {MATERIAL_PRESETS.map((preset) => {
        const selected = active === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPick(preset.id)}
            aria-pressed={selected}
            title={preset.note}
            className={cn(
              "group flex flex-col items-stretch gap-1 rounded-[10px] border p-1 text-left transition-colors",
              selected
                ? "border-[var(--red)] bg-[var(--red)]/[0.04]"
                : "border-[var(--edge)] hover:border-[var(--edge-strong)]",
            )}
          >
            <MaterialSwatch
              material={materialForPreset(preset.id)}
              className={cn(
                "h-9 w-full rounded-[6px] transition-shadow",
                selected && "shadow-[inset_0_0_0_1px_rgba(113,0,20,0.35)]",
              )}
            />
            <span
              className={cn(
                "truncate px-0.5 font-ui text-[8.5px] font-medium leading-tight",
                selected ? "text-[var(--red)]" : "text-ink/60",
              )}
            >
              {preset.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface MaterialsStudioProps {
  material: LayerMaterial | undefined;
  onChange: (next: LayerMaterial | undefined) => void;
  /** The page itself, or one selected layer. */
  scope: "layer" | "page";
  /** Depth only reads on boxed forms and photographs. */
  reliefSupported?: boolean;
  /** Whether the canvas is currently drawing finishes at all. */
  previewMode?: boolean;
  onShowMaterials?: () => void;
}

export function MaterialsStudio({
  material,
  onChange,
  scope,
  reliefSupported = true,
  previewMode = true,
  onShowMaterials,
}: MaterialsStudioProps) {
  const [clipboardReady, setClipboardReady] = useState(() => hasCopiedMaterial());
  const preset = material ? materialPresetById(material.preset) : null;

  const patch = (value: Partial<LayerMaterial>) => {
    if (!material) return;
    onChange({ ...material, ...value });
  };

  const reliefMode: "flat" | "emboss" | "deboss" = !material
    ? "flat"
    : material.relief > 0.02
      ? "emboss"
      : material.relief < -0.02
        ? "deboss"
        : "flat";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="section-label">Material</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Copy this finish"
            aria-label="Copy material"
            onClick={() => {
              copyMaterial(material);
              setClipboardReady(true);
              toast.success("Finish copied.");
            }}
            className="grid size-6 place-items-center rounded-full text-ink/45 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <Copy className="size-3" />
          </button>
          <button
            type="button"
            title="Paste the finish onto this target"
            aria-label="Paste material"
            disabled={!clipboardReady}
            onClick={() => {
              const pasted = pasteMaterial();
              if (!pasted) {
                toast.error("Copy a finish first.");
                return;
              }
              onChange(pasted);
              toast.success("Finish pasted.");
            }}
            className="grid size-6 place-items-center rounded-full text-ink/45 transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30"
          >
            <ClipboardPaste className="size-3" />
          </button>
          <button
            type="button"
            title="Reset to the preset's own settings"
            aria-label="Reset material"
            disabled={!material}
            onClick={() => {
              if (!material) return;
              onChange(materialForPreset(material.preset));
              toast.success("Finish reset to its preset.");
            }}
            className="grid size-6 place-items-center rounded-full text-ink/45 transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30"
          >
            <RotateCcw className="size-3" />
          </button>
          <button
            type="button"
            title="Remove the finish entirely"
            aria-label="Remove material"
            disabled={!material}
            onClick={() => {
              onChange(undefined);
              toast.success("Finish removed. The artwork is untouched.");
            }}
            className="grid size-6 place-items-center rounded-full text-ink/45 transition-colors hover:bg-[var(--red)]/[0.07] hover:text-[var(--red)] disabled:opacity-30"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>

      <p className="font-ui text-[0.62rem] leading-relaxed text-ink/45">
        Applies to the {scope}. A finish is layered over the artwork, so the
        original design is never changed.
      </p>

      <MaterialPresetGrid
        active={material?.preset}
        onPick={(id) => onChange(materialForPreset(id))}
      />

      {!material || !materialIsActive(material) ? (
        <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--edge-strong)] px-2.5 py-2 font-ui text-[0.64rem] leading-relaxed text-ink/45">
          Choose a finish above to dress this {scope}. Paper, foil and relief
          are drawn live on the canvas in Material Preview mode.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--edge)] bg-[var(--surface-card)] px-2.5 py-1.5">
            <span className="min-w-0">
              <span className="block font-ui text-[11px] font-medium text-ink/80">
                {preset?.label}
              </span>
              <span className="block truncate text-[9px] text-ink/40">{preset?.note}</span>
            </span>
            <Switch
              checked={material.enabled}
              onCheckedChange={(enabled) => patch({ enabled })}
              aria-label="Show this finish on the canvas"
              className="scale-90"
            />
          </div>

          {preset?.controls.colour && (
            <Row label={preset.colourLabel ?? "Colour"}>
              <ColorField
                value={material.foil}
                onChange={(foil) => patch({ foil })}
                label={preset.colourLabel ?? "Material colour"}
              />
            </Row>
          )}

          <FinishSlider
            label="Texture"
            value={material.intensity}
            onChange={(intensity) => patch({ intensity })}
          />
          <FinishSlider
            label="Scale"
            value={material.scale}
            min={0.5}
            max={3}
            onChange={(scale) => patch({ scale })}
            display={(value) => `${value.toFixed(2)}×`}
          />
          <FinishSlider
            label="Strength"
            value={material.opacity}
            onChange={(opacity) => patch({ opacity })}
          />

          {preset?.controls.finish && (
            <SegmentedRow
              label="Surface"
              value={material.finish}
              options={[
                { id: "matte", label: "Matte", hint: "Flat, sealed, no sheen" },
                { id: "satin", label: "Satin", hint: "A low sheen across the surface" },
              ]}
              onChange={(finish) => patch({ finish })}
            />
          )}

          {preset?.controls.foil && (
            <FinishSlider
              label="Highlight"
              value={material.foilStrength}
              onChange={(foilStrength) => patch({ foilStrength })}
            />
          )}

          {reliefSupported ? (
            <>
              <SegmentedRow
                label="Depth"
                value={reliefMode}
                options={[
                  { id: "flat", label: "Flat", hint: "No emboss or deboss" },
                  { id: "emboss", label: "Emboss", hint: "Raised from the sheet" },
                  { id: "deboss", label: "Deboss", hint: "Pressed into the sheet" },
                ]}
                onChange={(mode) =>
                  patch({
                    relief:
                      mode === "emboss"
                        ? Math.max(0.25, Math.abs(material.relief) || 0.6)
                        : mode === "deboss"
                          ? -Math.max(0.25, Math.abs(material.relief) || 0.6)
                          : 0,
                  })
                }
              />
              {reliefMode !== "flat" && (
                <>
                  <FinishSlider
                    label="Amount"
                    value={Math.abs(material.relief)}
                    onChange={(amount) =>
                      patch({ relief: reliefMode === "deboss" ? -amount : amount })
                    }
                  />
                  <FinishSlider
                    label="Softness"
                    value={material.softness}
                    onChange={(softness) => patch({ softness })}
                  />
                </>
              )}
            </>
          ) : (
            <p className="font-ui text-[0.6rem] leading-relaxed text-ink/40">
              Depth sits inside an edge, so it is offered for rectangles,
              capsules, circles and photographs.
            </p>
          )}

          <Row label="Blend">
            <Select
              value={material.blend}
              onValueChange={(blend) => patch({ blend: blend as LayerMaterial["blend"] })}
            >
              <SelectTrigger className="h-8 rounded-none text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_BLENDS.map((option) => (
                  <SelectItem key={option.id} value={option.id} className="text-[11px]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <p className="font-ui text-[0.6rem] leading-relaxed text-ink/40">
            {MATERIAL_BLENDS.find((option) => option.id === material.blend)?.note}
          </p>
        </>
      )}

      <div className="flex items-start gap-1.5 border-t border-[var(--edge)] pt-2">
        <Layers2 className="mt-0.5 size-3 shrink-0 text-ink/35" />
        <p className="font-ui text-[0.6rem] leading-relaxed text-ink/40">
          Visual preview. PNG and PDF exports use the clean artwork, because a
          screen simulation is not a real foil seam or emboss depth.
          {!previewMode && onShowMaterials && (
            <>
              {" "}
              <button
                type="button"
                onClick={onShowMaterials}
                className="font-medium text-[var(--red)] underline underline-offset-2"
              >
                Show finishes on the canvas
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/** A short line for layers a finish cannot honestly be drawn on. */
export function MaterialUnsupportedNote({ children }: { children?: ReactNode }) {
  return (
    <p className="font-ui text-[0.62rem] leading-relaxed text-ink/45">
      {children ??
        "Materials draw on shapes, photographs and the page. For type, use Effects → Gradient for a metallic finish."}
    </p>
  );
}
