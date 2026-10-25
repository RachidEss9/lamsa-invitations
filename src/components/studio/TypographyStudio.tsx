import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FontPicker } from "@/components/studio/FontPicker";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  effectFilter,
  gradientCss,
  outlineWidth,
  type LayerEffects,
} from "@/lib/effects";
import { fontById, fontFamilyFor, type FontDef } from "@/lib/fonts";
import type { DesignElement } from "@/lib/design";
import {
  TYPE_ROLE_PRESETS,
  describeTypeStyle,
  extractTypeStyle,
  type TypeStyle,
} from "@/lib/type-styles";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CaseUpper,
  Save,
  Strikethrough,
  Underline,
  Wand2,
} from "lucide-react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-ui text-[10px] font-medium uppercase tracking-[0.1em] text-ink/45">
      {children}
    </span>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Input
      type="number"
      value={Math.round(value * 100) / 100}
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
      className="h-8 rounded-[var(--radius-control)] border-[var(--edge)] bg-[var(--surface-card)] px-2 text-right font-ui text-[11px] tabular-nums"
    />
  );
}

function TinyColour({
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
    <label
      className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-full border border-[var(--edge)] shadow-[var(--shadow-xs)]"
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
  );
}

function savedStyleFrom(payload: unknown): TypeStyle | null {
  const style = (payload as { style?: TypeStyle } | null)?.style;
  return style && typeof style === "object" ? style : null;
}

/**
 * The typography studio.
 *
 * It owns every lettering control for a text layer and shows the result in a
 * live specimen above the inputs, so size, leading, tracking, case, fill and
 * glyph outline can be judged without looking away from the panel. Role presets
 * set scale and rhythm only; saved styles carry the host's own lettering and can
 * be updated from the current layer.
 */
export function TypographyStudio({
  element,
  activeFont,
  onPatch,
  onEditText,
}: {
  element: DesignElement;
  activeFont: FontDef;
  onPatch: (patch: Partial<DesignElement>) => void;
  onEditText?: (id: string) => void;
}) {
  const saved = useQuery(api.library.listMine, { kind: "style" });
  const createStyle = useMutation(api.library.create);
  const updateStyle = useMutation(api.library.update);
  const [styleName, setStyleName] = useState("");
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const effects = element.effects;
  const gradient = effects?.gradient;
  const gradientText = Boolean(gradient?.enabled);
  const glyphStroke = outlineWidth(effects);
  const outline = effects?.outline;
  const direction =
    element.direction === "rtl"
      ? ("rtl" as const)
      : element.direction === "ltr"
        ? ("ltr" as const)
        : ("auto" as const);
  const transform =
    element.textTransform ?? (element.uppercase ? "uppercase" : "none");

  const previewText = useMemo(() => {
    const first = (element.text ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)[0];
    return first && first.length > 0 ? first : "Amelia & Søren";
  }, [element.text]);

  const previewStyle = {
    fontFamily: fontFamilyFor(element.font ?? "cormorant-garamond"),
    fontSize: Math.max(15, Math.min(30, (element.fontSize ?? 26) * 0.52)),
    fontWeight: element.fontWeight ?? 400,
    fontStyle: element.italic ? "italic" : "normal",
    letterSpacing: `${element.letterSpacing ?? 0}em`,
    lineHeight: element.lineHeight ?? 1.4,
    textAlign: element.align ?? "center",
    textTransform: transform as CSSProperties["textTransform"],
    textDecoration: element.textDecoration ?? "none",
    color: gradientText ? "transparent" : (element.color ?? "#161616"),
    backgroundImage: gradientText && gradient ? gradientCss(gradient) : undefined,
    WebkitBackgroundClip: gradientText ? "text" : undefined,
    backgroundClip: gradientText ? "text" : undefined,
    WebkitTextFillColor: gradientText ? "transparent" : undefined,
    WebkitTextStroke:
      glyphStroke > 0 && outline ? `${glyphStroke}px ${outline.color}` : undefined,
    filter: effectFilter(effects),
    direction: direction === "auto" ? undefined : direction,
    unicodeBidi: "plaintext",
  } as CSSProperties;

  const applyPreset = (style: TypeStyle) => {
    onPatch(style as Partial<DesignElement>);
  };

  const patchOutline = (patch: Partial<NonNullable<LayerEffects["outline"]>>) => {
    const next = {
      enabled: true,
      color: outline?.color ?? "#f2f1ed",
      width: outline?.width ?? 2,
      ...outline,
      ...patch,
    };
    onPatch({ effects: { ...effects, outline: next } });
  };

  const saveStyle = async () => {
    const name = styleName.trim();
    if (!name) {
      toast.error("Name the style before saving it.");
      return;
    }
    const style = extractTypeStyle(element);
    if (Object.keys(style).length === 0) {
      toast.error("This layer has no lettering settings to save.");
      return;
    }
    setSaving(true);
    try {
      await createStyle({
        kind: "style",
        name,
        category: "typography",
        description: describeTypeStyle(style, activeFont.name),
        payload: { style },
      });
      setStyleName("");
      toast.success("Type style saved to your library.");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "The style could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const refreshStyle = async (id: Id<"libraryItems">, name: string) => {
    const style = extractTypeStyle(element);
    setUpdating(id);
    try {
      await updateStyle({
        id,
        payload: { style },
        description: describeTypeStyle(style, activeFont.name),
      });
      toast.success(`“${name}” updated from this layer.`);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "The style could not be updated.",
      );
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Live specimen: the real text, the real family, the real effects. */}
      <div className="relative overflow-hidden rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-sunk)]/70 px-3 py-4">
        <p className="mb-2 text-center font-ui text-[8px] uppercase tracking-[0.18em] text-ink/35">
          Live preview
        </p>
        <p className="break-words" style={previewStyle} dir={direction}>
          {previewText}
        </p>
        <p className="mt-2 text-center font-ui text-[8px] uppercase tracking-[0.12em] text-ink/30">
          {activeFont.name} · {element.fontSize ?? 26} px · {element.fontWeight ?? 400}
          {element.italic ? " · italic" : ""}
        </p>
      </div>

      <div>
        <FieldLabel>Role presets</FieldLabel>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {TYPE_ROLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.style)}
              title={`${preset.note} — sets size, weight and rhythm only`}
              className="chip h-6 gap-1 px-2 text-[0.6rem]"
            >
              <Wand2 className="size-2.5 opacity-50" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Typeface</FieldLabel>
        <div className="mt-1">
          <FontPicker
            value={element.font ?? "cormorant-garamond"}
            sampleText={element.text}
            onSelect={(font) => {
              // Keep the current weight when the new family supports it, and
              // fall back to the nearest available weight otherwise. Weight and
              // italic never become values the family cannot draw.
              const next = fontById(font);
              const current = element.fontWeight ?? 400;
              const nearest = next.weights.reduce((best, weight) =>
                Math.abs(weight - current) < Math.abs(best - current) ? weight : best,
              );
              onPatch({
                font,
                fontWeight: next.weights.includes(current) ? current : nearest,
                italic: next.italic ? element.italic : false,
              });
            }}
          />
        </div>
        <p className="mt-1 text-[9px] leading-relaxed text-ink/40">
          {activeFont.note ?? activeFont.name}
          {activeFont.script === "latin"
            ? " · Arabic falls back to Naskh shaping"
            : " · Arabic + Latin"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <FieldLabel>Size</FieldLabel>
          <NumberInput
            value={element.fontSize ?? 26}
            onChange={(fontSize) => onPatch({ fontSize })}
            min={6}
          />
        </label>
        <label className="block">
          <FieldLabel>Weight</FieldLabel>
          <Select
            value={String(
              activeFont.weights.includes(element.fontWeight ?? 400)
                ? (element.fontWeight ?? 400)
                : activeFont.weights[0],
            )}
            onValueChange={(weight) => onPatch({ fontWeight: Number(weight) })}
          >
            <SelectTrigger className="mt-1 h-8 w-full rounded-[var(--radius-control)] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeFont.weights.map((weight) => (
                <SelectItem key={weight} value={String(weight)}>
                  {weight}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <FieldLabel>Leading</FieldLabel>
          <NumberInput
            value={element.lineHeight ?? 1.4}
            onChange={(lineHeight) => onPatch({ lineHeight })}
            step={0.05}
            min={0.7}
            max={3}
          />
        </label>
        <label className="block">
          <FieldLabel>Tracking</FieldLabel>
          <NumberInput
            value={element.letterSpacing ?? 0}
            onChange={(letterSpacing) => onPatch({ letterSpacing })}
            step={0.01}
            min={-0.1}
            max={1}
          />
        </label>
      </div>

      <div className="flex items-center gap-1">
        {(
          [
            { align: "left" as const, icon: AlignLeft, label: "Align left" },
            { align: "center" as const, icon: AlignCenter, label: "Centre" },
            { align: "right" as const, icon: AlignRight, label: "Align right" },
          ]
        ).map(({ align, icon: Icon, label }) => (
          <button
            key={align}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={(element.align ?? "center") === align}
            onClick={() => onPatch({ align })}
            className={cn(
              "grid h-8 flex-1 place-items-center rounded-[var(--radius-control)] border transition-colors",
              (element.align ?? "center") === align
                ? "border-ink bg-ink text-[var(--paper-light)]"
                : "border-[var(--edge)] text-ink/60 hover:border-[var(--edge-strong)] hover:text-ink",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
        <span className="mx-0.5 h-5 w-px bg-[var(--edge)]" />
        <button
          type="button"
          title="Underline"
          aria-label="Underline"
          aria-pressed={element.textDecoration === "underline"}
          onClick={() =>
            onPatch({
              textDecoration:
                element.textDecoration === "underline" ? "none" : "underline",
            })
          }
          className={cn(
            "grid h-8 flex-1 place-items-center rounded-[var(--radius-control)] border transition-colors",
            element.textDecoration === "underline"
              ? "border-ink bg-ink text-[var(--paper-light)]"
              : "border-[var(--edge)] text-ink/60 hover:border-[var(--edge-strong)] hover:text-ink",
          )}
        >
          <Underline className="size-3.5" />
        </button>
        <button
          type="button"
          title="Strikethrough"
          aria-label="Strikethrough"
          aria-pressed={element.textDecoration === "line-through"}
          onClick={() =>
            onPatch({
              textDecoration:
                element.textDecoration === "line-through" ? "none" : "line-through",
            })
          }
          className={cn(
            "grid h-8 flex-1 place-items-center rounded-[var(--radius-control)] border transition-colors",
            element.textDecoration === "line-through"
              ? "border-ink bg-ink text-[var(--paper-light)]"
              : "border-[var(--edge)] text-ink/60 hover:border-[var(--edge-strong)] hover:text-ink",
          )}
        >
          <Strikethrough className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--edge)] px-2.5 py-1.5">
        <span className="text-[11px] text-ink/60">Italic</span>
        <button
          type="button"
          disabled={!activeFont.italic}
          aria-pressed={Boolean(element.italic)}
          title={
            activeFont.italic
              ? "Italic"
              : `${activeFont.name} has no italic cut`
          }
          onClick={() => activeFont.italic && onPatch({ italic: !element.italic })}
          className={cn(
            "chip h-6 px-2 text-[9px] italic",
            !activeFont.italic && "cursor-not-allowed opacity-40",
          )}
        >
          Italic
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <FieldLabel>Case</FieldLabel>
          <Select
            value={transform}
            onValueChange={(value) =>
              onPatch({
                textTransform: value as DesignElement["textTransform"],
                uppercase: value === "uppercase",
              })
            }
          >
            <SelectTrigger className="mt-1 h-8 w-full rounded-[var(--radius-control)] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">As written</SelectItem>
              <SelectItem value="uppercase">Uppercase</SelectItem>
              <SelectItem value="lowercase">Lowercase</SelectItem>
              <SelectItem value="capitalize">Capitalised</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <FieldLabel>Direction</FieldLabel>
          <div className="mt-1 flex gap-1">
            {(["auto", "ltr", "rtl"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onPatch({ direction: value })}
                aria-pressed={(element.direction ?? "auto") === value}
                className={cn(
                  "h-8 flex-1 rounded-[var(--radius-control)] border font-ui text-[9px] uppercase tracking-[0.08em] transition-colors",
                  (element.direction ?? "auto") === value
                    ? "border-ink bg-ink text-[var(--paper-light)]"
                    : "border-[var(--edge)] text-ink/60 hover:border-[var(--edge-strong)] hover:text-ink",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <FieldLabel>Text colour</FieldLabel>
        <div className="flex items-center gap-1.5">
          <TinyColour
            value={element.color ?? "#161616"}
            onChange={(color) => onPatch({ color })}
            label="Text colour"
          />
          <Input
            value={element.color ?? "#161616"}
            onChange={(event) => onPatch({ color: event.target.value })}
            aria-label="Text colour HEX"
            className="h-8 w-[88px] rounded-[var(--radius-control)] border-[var(--edge)] px-2 text-left font-meta text-[10px] uppercase tracking-[0.06em]"
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-card)] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink/60">Glyph outline</span>
          <Switch
            checked={glyphStroke > 0}
            onCheckedChange={(enabled) => patchOutline({ enabled, width: enabled ? Math.max(1, outline?.width ?? 2) : 0 })}
            className="scale-90"
          />
        </div>
        {glyphStroke > 0 && (
          <div className="mt-2 grid grid-cols-2 items-end gap-2">
            <div className="flex items-center gap-1.5">
              <TinyColour
                value={outline?.color ?? "#f2f1ed"}
                onChange={(color) => patchOutline({ color })}
                label="Outline colour"
              />
              <Input
                value={outline?.color ?? "#f2f1ed"}
                onChange={(event) => patchOutline({ color: event.target.value })}
                aria-label="Outline colour HEX"
                className="h-8 rounded-[var(--radius-control)] px-2 font-meta text-[10px] uppercase"
              />
            </div>
            <label className="block">
              <FieldLabel>Width</FieldLabel>
              <NumberInput
                value={outline?.width ?? 2}
                onChange={(width) => patchOutline({ width })}
                min={0}
                max={20}
                step={0.5}
              />
            </label>
            <p className="col-span-2 text-[9px] leading-relaxed text-ink/40">
              The stroke is centred on the glyph edges — the only outline the
              browser renderer draws exactly the same on screen and in export.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-ink/45">
          {activeFont.script === "latin"
            ? "Arabic is shaped with a Naskh fallback at the same size."
            : "Arabic shaping and diacritics follow the selected family."}
        </span>
        {onEditText && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onEditText(element.id)}
          >
            Edit on canvas
          </Button>
        )}
      </div>

      <details className="group rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-card)] px-2.5 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] text-ink/70">
          <span className="flex items-center gap-1.5">
            <CaseUpper className="size-3.5 text-ink/40" />
            Saved type styles
          </span>
          <span className="font-meta text-[9px] text-ink/35">
            {saved?.length ?? 0}
          </span>
        </summary>

        <div className="mt-2 space-y-2">
          {saved === undefined ? (
            <p className="text-[10px] text-ink/40">Loading styles…</p>
          ) : saved.length === 0 ? (
            <p className="text-[10px] leading-relaxed text-ink/40">
              No saved styles yet. Set this layer's lettering, name it, and save
              it here to reuse it on any invitation.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--edge)] overflow-hidden rounded-[var(--radius-control)] border border-[var(--edge)]">
              {saved.map((item) => {
                const style = savedStyleFrom(item.payload);
                return (
                  <li key={item._id} className="flex items-center gap-1 px-2 py-1.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-ui text-[11px] text-ink/80">
                        {item.name}
                      </span>
                      <span className="block truncate text-[9px] text-ink/35">
                        {item.description ?? "Type style"}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={!style}
                      onClick={() => style && applyPreset(style)}
                      className="shrink-0 rounded-full px-2 py-0.5 font-ui text-[9px] font-medium uppercase tracking-[0.08em] text-ink/60 hover:bg-ink/[0.06] hover:text-ink disabled:opacity-40"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      disabled={updating === item._id}
                      onClick={() => void refreshStyle(item._id, item.name)}
                      className="shrink-0 rounded-full px-2 py-0.5 font-ui text-[9px] font-medium uppercase tracking-[0.08em] text-[var(--red)] hover:bg-[var(--red)]/[0.07] disabled:opacity-40"
                    >
                      {updating === item._id ? "…" : "Update"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex gap-1.5">
            <Input
              value={styleName}
              onChange={(event) => setStyleName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveStyle();
              }}
              placeholder="Name this style"
              maxLength={80}
              className="h-8 rounded-[var(--radius-control)] text-[11px]"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => void saveStyle()}
              disabled={saving}
            >
              <Save className="size-3" />
              {saving ? "Saving" : "Save"}
            </Button>
          </div>
          <p className="text-[9px] leading-relaxed text-ink/35">
            A style carries lettering only: family, size, weight, rhythm, case,
            decoration and ink. It never moves a layer or rewrites its words.
          </p>
        </div>
      </details>
    </div>
  );
}
