import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ColorField, Row } from "@/components/studio/inspector-fields";
import {
  DEFAULT_FINISH_LIGHTING,
  FINISH_CATEGORIES,
  FINISH_MAX_LAYERS,
  FINISH_SCOPE_NOTE,
  addFinishToStack,
  copyFinishStack,
  duplicateFinishLayer,
  finishDef,
  finishLayer,
  finishOverlays,
  finishSurfaceOf,
  finishesFor,
  hasCopiedFinishStack,
  metalGradient,
  moveFinishLayer,
  patchFinishLayer,
  pasteFinishStack,
  removeFinishLayer,
  type FinishId,
  type FinishLayer,
} from "@/lib/finishes";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * The Finish Composer.
 *
 * A professional, layer-based stack for the selected layer or the sheet:
 * pick finishes from the library, combine the compatible ones, reorder,
 * duplicate, switch off and tune each material. Everything writes settings —
 * the artwork underneath is never flattened, regenerated or replaced — and
 * none of it can reach the print export, which strips finishes structurally.
 */

/** A truthful thumbnail for one finish, drawn with the real render recipe. */
export function FinishSwatch({
  finish,
  className,
  base = "#f1eee6",
}: {
  finish: FinishId;
  className?: string;
  /** The surface under the finish, so translucent materials read correctly. */
  base?: string;
}) {
  const def = finishDef(finish);
  const layer = finishLayer(finish);

  if (def.kind === "edge") {
    return (
      <span
        className={cn("relative block overflow-hidden", className)}
        style={{ background: base }}
      >
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            border: "3px solid transparent",
            borderImage: `${metalGradient(layer, DEFAULT_FINISH_LIGHTING)} 1`,
          }}
        />
      </span>
    );
  }

  if (def.kind === "depth") {
    const raised = layer.depth >= 0;
    return (
      <span
        className={cn(
          "relative grid place-items-center overflow-hidden font-ui text-[13px] font-semibold",
          className,
        )}
        style={{ background: base }}
      >
        <span
          aria-hidden
          style={{
            color: "rgba(22,22,22,0.4)",
            textShadow: raised
              ? "1px 1px 1px rgba(255,255,255,0.95), -1px -1px 2px rgba(0,0,0,0.55)"
              : "1px 1px 2px rgba(0,0,0,0.55), -1px -1px 1px rgba(255,255,255,0.95)",
          }}
        >
          L
        </span>
      </span>
    );
  }

  const overlay = finishOverlays([layer], DEFAULT_FINISH_LIGHTING)[0];
  return (
    <span
      className={cn("relative block overflow-hidden", className)}
      style={{ background: base }}
    >
      {overlay ? (
        <span aria-hidden className="absolute inset-0" style={overlay.style} />
      ) : null}
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
      <span className="w-10 shrink-0 text-right font-meta text-[9px] tabular-nums text-ink/45">
        {display ? display(value) : `${Math.round(value * 100)}%`}
      </span>
    </div>
  );
}

interface FinishComposerProps {
  /** The sheet, or a single selected layer. */
  scope: "element" | "page";
  /** The selected layer, when the scope is a layer. */
  element?: { kind: string; frameArt?: string; shape?: string } | null;
  layers?: FinishLayer[];
  onChange: (next: FinishLayer[]) => void;
  /** False in Artwork / Print mode, where finishes are hidden. */
  previewMode?: boolean;
  /** Turns the finish preview back on from the composer. */
  onShowFinishes?: () => void;
  /** Hold to compare: show the original design instead of the finished one. */
  onCompare?: () => void;
}

export function FinishComposer({
  scope,
  element,
  layers = [],
  onChange,
  previewMode = true,
  onShowFinishes,
  onCompare,
}: FinishComposerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const surface = scope === "page" ? null : finishSurfaceOf(element);
  const options = finishesFor(scope === "page" ? null : element, scope);
  const selected =
    layers.find((layer) => layer.id === selectedId) ??
    layers[layers.length - 1] ??
    null;
  const def = selected ? finishDef(selected.finish) : null;
  const targetWord = scope === "page" ? "sheet" : "layer";

  const add = (id: FinishId) => {
    const result = addFinishToStack(layers, id, surface, scope);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    onChange(result.layers);
    setSelectedId(result.layers[result.layers.length - 1]?.id ?? null);
  };

  const update = (patch: Partial<Omit<FinishLayer, "id" | "finish">>) => {
    if (!selected) return;
    onChange(patchFinishLayer(layers, selected.id, patch));
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed text-ink/45">
        {FINISH_SCOPE_NOTE} Prints export the clean artwork.
      </p>

      {!previewMode && (
        <div className="flex items-center justify-between gap-2 border border-[var(--edge)] bg-ink/[0.03] px-2.5 py-2">
          <span className="text-[10px] leading-tight text-ink/55">
            Finishes are hidden in Artwork mode.
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-7 shrink-0 rounded-none px-2 text-[9px]"
            onClick={onShowFinishes}
          >
            Show finishes
          </Button>
        </div>
      )}

      {/* The stack, top layer last — exactly the order they compose in. */}
      <div className="space-y-1">
        {layers.length === 0 && (
          <p className="border border-dashed border-[var(--edge)] px-2.5 py-3 text-center text-[10px] text-ink/40">
            No finishes on this {targetWord} yet.
          </p>
        )}
        {layers.map((layer, index) => {
          const layerDef = finishDef(layer.finish);
          const active = selected?.id === layer.id;
          return (
            <div
              key={layer.id}
              className={cn(
                "flex items-center gap-1.5 border px-1.5 py-1.5 transition-colors",
                active
                  ? "border-[var(--red)] bg-[var(--red)]/[0.03]"
                  : "border-[var(--edge)]",
              )}
            >
              <Switch
                checked={layer.enabled}
                onCheckedChange={(enabled) =>
                  onChange(
                    layers.map((item) =>
                      item.id === layer.id ? { ...item, enabled } : item,
                    ),
                  )
                }
                aria-label={`${layer.enabled ? "Disable" : "Enable"} ${layerDef.label}`}
                className="h-4 w-7 [&>span]:size-3"
              />
              <FinishSwatch finish={layer.finish} className="size-5 shrink-0 rounded-[3px]" />
              <button
                type="button"
                onClick={() => setSelectedId(layer.id)}
                className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left"
              >
                <span
                  className={cn(
                    "truncate font-ui text-[10.5px]",
                    layer.enabled ? "text-ink" : "text-ink/35 line-through",
                  )}
                >
                  {layerDef.label}
                </span>
                <span className="shrink-0 font-meta text-[7.5px] uppercase tracking-[0.14em] text-ink/35">
                  {layerDef.kind}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Move ${layerDef.label} up`}
                disabled={index === 0}
                onClick={() =>
                  onChange(moveFinishLayer(layers, layer.id, index - 1))
                }
                className="grid size-5 place-items-center text-ink/45 hover:text-ink disabled:opacity-25"
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                aria-label={`Move ${layerDef.label} down`}
                disabled={index === layers.length - 1}
                onClick={() =>
                  onChange(moveFinishLayer(layers, layer.id, index + 1))
                }
                className="grid size-5 place-items-center text-ink/45 hover:text-ink disabled:opacity-25"
              >
                <ChevronDown className="size-3" />
              </button>
              <button
                type="button"
                aria-label={`Duplicate ${layerDef.label}`}
                disabled={layers.length >= FINISH_MAX_LAYERS}
                onClick={() => onChange(duplicateFinishLayer(layers, layer.id))}
                className="grid size-5 place-items-center text-ink/45 hover:text-ink disabled:opacity-25"
              >
                <Copy className="size-3" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${layerDef.label}`}
                onClick={() => {
                  onChange(removeFinishLayer(layers, layer.id));
                  if (active) setSelectedId(null);
                }}
                className="grid size-5 place-items-center text-ink/45 hover:text-[var(--red)]"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Material controls — only the knobs this finish answers to. */}
      {selected && def && (
        <div className="space-y-2 border border-[var(--edge)] p-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-ui text-[11px] font-medium text-ink">
              {def.label}
            </span>
            <span className="font-meta text-[8px] uppercase tracking-[0.14em] text-ink/35">
              {def.kind}
            </span>
          </div>
          <p className="text-[9.5px] leading-snug text-ink/45">{def.note}</p>

          <FinishSlider
            label="Intensity"
            value={selected.intensity}
            onChange={(intensity) => update({ intensity })}
          />
          <FinishSlider
            label="Opacity"
            value={selected.opacity}
            onChange={(opacity) => update({ opacity })}
          />
          {def.controls.depth && (
            <FinishSlider
              label="Depth"
              min={-1}
              max={1}
              value={selected.depth}
              onChange={(depth) => update({ depth })}
              display={(value) =>
                `${value > 0 ? "+" : ""}${Math.round(value * 100)}`
              }
            />
          )}
          {def.controls.reflectivity && (
            <FinishSlider
              label="Reflect"
              value={selected.reflectivity}
              onChange={(reflectivity) => update({ reflectivity })}
            />
          )}
          {def.controls.gloss && (
            <FinishSlider
              label="Gloss"
              value={selected.gloss}
              onChange={(gloss) => update({ gloss })}
            />
          )}
          {def.controls.roughness && (
            <FinishSlider
              label="Roughness"
              value={selected.roughness}
              onChange={(roughness) => update({ roughness })}
            />
          )}
          {def.controls.colour && (
            <Row label="Colour">
              <ColorField
                value={selected.colour}
                onChange={(colour) => update({ colour })}
              />
            </Row>
          )}
          {def.controls.monogram && (
            <Row label="Monogram">
              <Input
                value={selected.monogram ?? ""}
                maxLength={4}
                placeholder="Initials"
                onChange={(event) => update({ monogram: event.target.value })}
                className="h-8 rounded-none text-[11px] uppercase"
              />
            </Row>
          )}
        </div>
      )}

      {/* The library, grouped by what the material does. */}
      {picking ? (
        <div className="border border-[var(--edge)] p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Add finish</span>
            <button
              type="button"
              aria-label="Close the finish library"
              onClick={() => setPicking(false)}
              className="grid size-5 place-items-center text-ink/45 hover:text-ink"
            >
              <X className="size-3" />
            </button>
          </div>
          <div className="max-h-56 space-y-2.5 overflow-y-auto pr-0.5">
            {FINISH_CATEGORIES.map((category) => {
              const group = options.filter((item) => item.kind === category.id);
              if (group.length === 0) return null;
              return (
                <div key={category.id}>
                  <p className="mb-1 font-meta text-[8px] uppercase tracking-[0.16em] text-ink/40">
                    {category.label}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {group.map((item) => {
                      const present = layers.some(
                        (layer) => layer.finish === item.id,
                      );
                      return (
                        <button
                          key={item.id}
                          type="button"
                          title={item.note}
                          onClick={() => add(item.id)}
                          className={cn(
                            "flex flex-col items-stretch gap-1 rounded-[8px] border p-1 text-left transition-colors",
                            present
                              ? "border-[var(--red)]/50 bg-[var(--red)]/[0.04]"
                              : "border-[var(--edge)] hover:border-[var(--edge-strong)]",
                          )}
                        >
                          <FinishSwatch
                            finish={item.id}
                            className="h-8 w-full rounded-[5px]"
                          />
                          <span className="truncate px-0.5 font-ui text-[8px] leading-tight text-ink/60">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-none text-[10px]"
            disabled={layers.length >= FINISH_MAX_LAYERS}
            onClick={() => setPicking(true)}
          >
            <Plus className="size-3.5" /> Add finish
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-none text-[10px]"
            onClick={() => onCompare?.()}
          >
            Compare original
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-none text-[10px]"
            disabled={!hasCopiedFinishStack()}
            onClick={() => {
              const pasted = pasteFinishStack();
              if (pasted) {
                onChange(pasted.slice(0, FINISH_MAX_LAYERS));
                toast.success("Finish stack pasted.");
              }
            }}
          >
            <ClipboardPaste className="size-3.5" /> Paste stack
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-none text-[10px]"
            disabled={layers.length === 0}
            onClick={() => {
              onChange([]);
              setSelectedId(null);
            }}
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>
        </div>
      )}

      {layers.length > 0 && !picking && (
        <Button
          type="button"
          variant="ghost"
          className="h-7 w-full text-[9px] text-ink/45 hover:text-ink"
          onClick={() => {
            copyFinishStack(layers);
            toast.success("Finish stack copied — paste it on another layer.");
          }}
        >
          <Copy className="size-3" /> Copy this stack
        </Button>
      )}
    </div>
  );
}
