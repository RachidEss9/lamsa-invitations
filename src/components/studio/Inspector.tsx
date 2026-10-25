import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldRow } from "@/components/ui/field";
import {
  ANIMATION_PRESETS,
  EASINGS,
  REVEAL_EFFECTS,
  SHAPES,
  elementTypeLabel,
  makeId,
  type DesignElement,
  type DesignPage,
  type ElementAnimation,
  type RevealEffect,
} from "@/lib/design";
import { fontById } from "@/lib/fonts";
import { frameById } from "@/lib/frames";
import { MOTIFS } from "@/lib/invitation";
import { FontPicker } from "@/components/studio/FontPicker";
import { cn } from "@/lib/utils";
import { useRef, type ReactNode } from "react";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  AlignStartHorizontal,
  AlignStartVertical,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Group,
  ImagePlus,
  Lock,
  Maximize2,
  MoveDown,
  MoveUp,
  RotateCw,
  Trash2,
  Ungroup,
  Unlock,
} from "lucide-react";

interface InspectorProps {
  page: DesignPage;
  selected: DesignElement[];
  aspectLocked: boolean;
  onAspectLocked: (value: boolean) => void;
  onPatch: (id: string, patch: Partial<DesignElement>) => void;
  onPagePatch: (patch: Partial<DesignPage>) => void;
  onAlign: (kind: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => void;
  onDistribute: (axis: "h" | "v") => void;
  onLayer: (action: "up" | "down" | "front" | "back") => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Delete is disabled when nothing deletable is selected (or while typing). */
  deleteDisabled?: boolean;
  deleteHint?: string;
  onGroup: () => void;
  onUngroup: () => void;
  onUploadImage: (file: File) => Promise<void>;
  onTestReveal: (interactionId: string) => void;
  onPreviewAnimation: () => void;
  onEditText?: (id: string) => void;
}

type SectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

function Section({ title, children, className, footer }: SectionProps) {
  return (
    <section className={cn("border-b border-[var(--edge)] bg-transparent px-4 py-3.5", className)}>
      <p className="section-label mb-2.5">
        {title}
      </p>
      <div className="min-h-[2px]">{children}</div>
      {footer && (
        <div className="mt-3 border-t border-ink/10 pt-2.5">{footer}</div>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <FieldRow label={label}>
      {children}
    </FieldRow>
  );
}

const numberInput =
  "h-8 rounded-none border-ink/20 bg-transparent px-2 text-right text-[11px] tabular-nums shadow-none focus-visible:border-ink focus-visible:ring-0";

function NumberField({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
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
      className={cn(numberInput, "w-full")}
    />
  );
}

function ColorField({
  value,
  onChange,
  allowTransparent,
}: {
  value: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#161616";
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="size-8 shrink-0 border border-ink/20"
        style={{
          background:
            value === "transparent"
              ? "repeating-conic-gradient(#d8d5cb 0% 25%, #f2f1ed 0% 50%) 50% / 8px 8px"
              : safe,
        }}
        aria-label="Choose colour"
      />
      <input
        ref={inputRef}
        type="color"
        value={safe}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(numberInput, "text-left")}
      />
      {allowTransparent && (
        <button
          type="button"
          onClick={() => onChange("transparent")}
          className="shrink-0 border border-ink/20 px-1.5 py-1 text-[9px] uppercase tracking-[0.1em] text-ink/60"
        >
          None
        </button>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-ink/60">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
    </div>
  );
}

export function Inspector({
  page,
  selected,
  aspectLocked,
  onAspectLocked,
  onPatch,
  onPagePatch,
  onAlign,
  onDistribute,
  onLayer,
  onDuplicate,
  onDelete,
  deleteDisabled = false,
  deleteHint,
  onGroup,
  onUngroup,
  onUploadImage,
  onTestReveal,
  onPreviewAnimation,
  onEditText,
}: InspectorProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const element = selected.length === 1 ? selected[0] : null;
  const activeFont = fontById(element?.font);
  const patch = (value: Partial<DesignElement>) => {
    if (element) onPatch(element.id, value);
  };
  const animation: ElementAnimation | null = element?.animation ?? null;
  const patchAnimation = (value: Partial<ElementAnimation>) => {
    if (element) {
      onPatch(element.id, { animation: { ...element.animation, ...value } });
    }
  };
  const reveal = element?.reveal;
  const targets = page.elements.filter(
    (candidate) =>
      candidate.id !== element?.id && !candidate.reveal && !candidate.locked,
  );

  if (selected.length === 0) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="border-b border-[var(--edge)] px-4 py-4">
          <p className="section-label">
            Page
          </p>
          <h2 className="mt-1 font-ui text-xl font-semibold leading-tight tracking-[-0.015em]">{page.name}</h2>
          <p className="mt-1 text-[10px] text-ink/45">
            {page.elements.length} layer{page.elements.length === 1 ? "" : "s"}
          </p>
        </div>
        <Section title="Page">
          <Row label="Name">
            <Input
              value={page.name}
              onChange={(event) => onPagePatch({ name: event.target.value })}
              className="h-8 rounded-none text-[11px]"
            />
          </Row>
          <Row label="Background">
            <ColorField
              value={page.background}
              onChange={(background) => onPagePatch({ background })}
            />
          </Row>
        </Section>
        <div className="px-4 py-5 text-[11px] leading-relaxed text-ink/50">
          Select a layer on the canvas or in the layer list to edit its content,
          type, animation, and interactions. Nothing here is decorative: every
          control writes to the saved design.
        </div>
      </div>
    );
  }

  if (selected.length > 1) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="border-b border-[var(--edge)] px-4 py-4">
          <p className="section-label">
            Selection
          </p>
          <h2 className="mt-1 font-ui text-xl font-semibold leading-tight tracking-[-0.015em]">
            {selected.length} layers
          </h2>
        </div>
        <Section title="Align to page">
          <div className="grid grid-cols-4 gap-1">
            {[
              { kind: "left", icon: AlignStartVertical, label: "Left" },
              { kind: "hcenter", icon: AlignCenterVertical, label: "Center" },
              { kind: "right", icon: AlignEndVertical, label: "Right" },
              { kind: "top", icon: AlignStartHorizontal, label: "Top" },
              { kind: "vcenter", icon: AlignCenterHorizontal, label: "Middle" },
              { kind: "bottom", icon: AlignEndHorizontal, label: "Bottom" },
            ].map(({ kind, icon: Icon, label }) => (
              <button
                key={kind}
                type="button"
                title={label}
                onClick={() => onAlign(kind as Parameters<typeof onAlign>[0])}
                className="grid h-8 place-items-center border border-ink/15 text-ink/65 hover:border-ink hover:text-ink"
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={() => onDistribute("h")}>
              Distribute H
            </Button>
            <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={() => onDistribute("v")}>
              Distribute V
            </Button>
          </div>
        </Section>
        <Section title="Arrange">
          <div className="grid grid-cols-2 gap-1">
            <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={onGroup}>
              <Group className="size-3.5" /> Group
            </Button>
            <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={onUngroup}>
              <Ungroup className="size-3.5" /> Ungroup
            </Button>
            <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={onDuplicate}>
              <Copy className="size-3.5" /> Duplicate
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none text-[10px]"
              onClick={onDelete}
              disabled={deleteDisabled}
              title={deleteDisabled ? deleteHint : "Delete selected layers"}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </Section>
      </div>
    );
  }

  if (!element) return null;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-[var(--edge)] px-4 py-4">
        <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
          {elementTypeLabel(element)}
        </p>
        <Input
          value={element.name}
          onChange={(event) => patch({ name: event.target.value })}
          className="mt-1 h-8 border-none bg-transparent px-0 font-ui text-lg font-semibold shadow-none focus-visible:ring-0"
          aria-label="Layer name"
        />
      </div>

      <Section title="Geometry">
        <div className="grid grid-cols-2 gap-2">
          <Row label="X"><NumberField value={element.x} onChange={(x) => patch({ x })} /></Row>
          <Row label="Y"><NumberField value={element.y} onChange={(y) => patch({ y })} /></Row>
          <Row label="W">
            <NumberField
              value={element.w}
              min={8}
              onChange={(w) => {
                if (!aspectLocked) {
                  patch({ w });
                  return;
                }
                const ratio = element.h / Math.max(1, element.w);
                patch({ w, h: Math.max(8, Math.round(w * ratio)) });
              }}
            />
          </Row>
          <Row label="H">
            <NumberField
              value={element.h}
              min={8}
              onChange={(h) => {
                if (!aspectLocked) {
                  patch({ h });
                  return;
                }
                const ratio = element.w / Math.max(1, element.h);
                patch({ h, w: Math.max(8, Math.round(h * ratio)) });
              }}
            />
          </Row>
          <Row label="Angle"><NumberField value={element.rotation} onChange={(rotation) => patch({ rotation })} /></Row>
          <Row label="Opacity">
            <NumberField
              value={Math.round(element.opacity * 100)}
              onChange={(value) => patch({ opacity: Math.min(1, Math.max(0, value / 100)) })}
              min={0}
              max={100}
            />
          </Row>
        </div>
        <div className="flex items-center gap-2">
          <Maximize2 className="size-3.5 text-ink/45" />
          <span className="text-[10px] text-ink/50">Lock aspect while resizing</span>
          <Switch
            checked={aspectLocked}
            onCheckedChange={onAspectLocked}
            className="ml-auto scale-90"
          />
        </div>
        <div className="grid grid-cols-6 gap-1">
          {[
            { kind: "left", icon: AlignStartVertical, label: "Align left" },
            { kind: "hcenter", icon: AlignCenterVertical, label: "Centre horizontally" },
            { kind: "right", icon: AlignEndVertical, label: "Align right" },
            { kind: "top", icon: AlignStartHorizontal, label: "Align top" },
            { kind: "vcenter", icon: AlignCenterHorizontal, label: "Centre vertically" },
            { kind: "bottom", icon: AlignEndHorizontal, label: "Align bottom" },
          ].map(({ kind, icon: Icon, label }) => (
            <button
              key={kind}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onAlign(kind as Parameters<typeof onAlign>[0])}
              className="grid h-8 place-items-center border border-ink/15 text-ink/65 hover:border-ink hover:text-ink"
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1">            <IconButton
              label="Send to back"
              onClick={() => onLayer("back")}
            >
              <ArrowDownToLine className="size-3.5" />
            </IconButton>
            <IconButton
              label="Send backward"
              onClick={() => onLayer("down")}
            >
              <MoveDown className="size-3.5" />
            </IconButton>
            <IconButton
              label="Bring forward"
              onClick={() => onLayer("up")}
            >
              <MoveUp className="size-3.5" />
            </IconButton>
            <IconButton
              label="Bring to front"
              onClick={() => onLayer("front")}
            >
              <ArrowUpToLine className="size-3.5" />
            </IconButton>
            <IconButton
              label={element.locked ? "Unlock layer" : "Lock layer"}
              onClick={() => patch({ locked: !element.locked })}
            >
              {element.locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
            </IconButton>
            <IconButton
              label={element.hidden ? "Show layer" : "Hide layer"}
              onClick={() => patch({ hidden: !element.hidden })}
            >
              {element.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </IconButton>
        </div>
      </Section>

      {element.kind === "text" && (
        <Section title="Text">
          <Textarea
            value={element.text ?? ""}
            onChange={(event) => patch({ text: event.target.value })}
            rows={3}
            className="rounded-none text-[11px] leading-relaxed"
          />
          {onEditText && (
            <Button
              type="button"
              variant="outline"
              className="h-8 w-full rounded-none text-[9px] uppercase tracking-[0.1em]"
              onClick={() => onEditText(element.id)}
            >
              Edit wording on canvas
            </Button>
          )}
          <Row label="Typeface">
            <FontPicker
              value={element.font ?? "cormorant-garamond"}
              sampleText={element.text}
              onSelect={(font) => {
                const next = fontById(font);
                patch({
                  font,
                  fontWeight: next.weights.includes(element.fontWeight ?? 400)
                    ? element.fontWeight
                    : next.weights.reduce((best, weight) =>
                        Math.abs(weight - (element.fontWeight ?? 400)) <
                        Math.abs(best - (element.fontWeight ?? 400))
                          ? weight
                          : best,
                      ),
                  italic: next.italic ? element.italic : false,
                });
              }}
            />
          </Row>
          <p className="text-[9px] leading-relaxed text-ink/40">
            {activeFont.note ?? activeFont.name}
            {activeFont.script === "latin" ? " · Arabic falls back to Naskh" : " · Arabic + Latin"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Size"><NumberField value={element.fontSize ?? 26} onChange={(fontSize) => patch({ fontSize })} min={6} /></Row>
            <Row label="Weight">
              <Select
                value={String(activeFont.weights.includes(element.fontWeight ?? 400) ? element.fontWeight ?? 400 : activeFont.weights[0])}
                onValueChange={(weight) => patch({ fontWeight: Number(weight) })}
              >
                <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeFont.weights.map((weight) => (
                    <SelectItem key={weight} value={String(weight)}>{weight}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Tracking"><NumberField value={element.letterSpacing ?? 0} onChange={(letterSpacing) => patch({ letterSpacing })} step={0.01} /></Row>
            <Row label="Leading"><NumberField value={element.lineHeight ?? 1.4} onChange={(lineHeight) => patch({ lineHeight })} step={0.05} /></Row>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                type="button"
                onClick={() => patch({ align })}
                className={cn(
                  "h-8 border text-[10px] capitalize",
                  element.align === align
                    ? "border-ink bg-ink text-[#f2f1ed]"
                    : "border-ink/15 text-ink/65 hover:border-ink",
                )}
              >
                {align}
              </button>
            ))}
          </div>
          <Row label="Direction">
            <div className="flex gap-1">
              {(["auto", "ltr", "rtl"] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => patch({ direction })}
                  className={cn(
                    "h-7 border px-2 text-[9px] uppercase tracking-[0.1em]",
                    (element.direction ?? "auto") === direction
                      ? "border-ink bg-ink text-[#f2f1ed]"
                      : "border-ink/15 text-ink/60 hover:border-ink",
                  )}
                >
                  {direction}
                </button>
              ))}
            </div>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <ToggleRow
              label={activeFont.italic ? "Italic" : "Italic (unavailable)"}
              checked={Boolean(element.italic) && Boolean(activeFont.italic)}
              onChange={(italic) => activeFont.italic && patch({ italic })}
            />
            <ToggleRow label="Caps" checked={Boolean(element.uppercase)} onChange={(uppercase) => patch({ uppercase })} />
          </div>
          <Row label="Colour"><ColorField value={element.color ?? "#161616"} onChange={(color) => patch({ color })} /></Row>
          <Row label="Case">
            <Select
              value={element.textTransform ?? (element.uppercase ? "uppercase" : "none")}
              onValueChange={(value) =>
                patch({
                  textTransform: value as DesignElement["textTransform"],
                  uppercase: value === "uppercase",
                })
              }
            >
              <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">As written</SelectItem>
                <SelectItem value="uppercase">Uppercase</SelectItem>
                <SelectItem value="lowercase">Lowercase</SelectItem>
                <SelectItem value="capitalize">Capitalise</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Vertical">
            <div className="flex gap-1">
              {(["top", "middle", "bottom"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => patch({ verticalAlign: value })}
                  className={cn(
                    "h-7 flex-1 border text-[9px] uppercase tracking-[0.08em]",
                    (element.verticalAlign ?? "middle") === value
                      ? "border-ink bg-ink text-[#f2f1ed]"
                      : "border-ink/15 text-ink/60 hover:border-ink",
                  )}
                >
                  {value === "middle" ? "Mid" : value}
                </button>
              ))}
            </div>
          </Row>
          <div className="border-t border-ink/10 pt-2">
            <ToggleRow
              label="Text background"
              checked={Boolean(element.textBackground)}
              onChange={(enabled) =>
                patch({
                  textBackground: enabled ? "#f2f1ed" : undefined,
                  textPadding: enabled ? (element.textPadding ?? 14) : 0,
                })
              }
            />
            {element.textBackground && (
              <div className="mt-2 space-y-2">
                <Row label="Fill">
                  <ColorField
                    value={element.textBackground}
                    onChange={(textBackground) => patch({ textBackground })}
                    allowTransparent
                  />
                </Row>
                <Row label="Padding">
                  <NumberField
                    value={element.textPadding ?? 14}
                    onChange={(textPadding) => patch({ textPadding })}
                    min={0}
                  />
                </Row>
                <Row label="Radius">
                  <NumberField
                    value={element.textRadius ?? 0}
                    onChange={(textRadius) => patch({ textRadius })}
                    min={0}
                  />
                </Row>
              </div>
            )}
            <ToggleRow
              label="Text border"
              checked={(element.textBorderWidth ?? 0) > 0}
              onChange={(enabled) =>
                patch({
                  textBorderWidth: enabled ? 1 : 0,
                  textBorder: enabled ? (element.textBorder ?? element.color ?? "#161616") : undefined,
                })
              }
            />
            {(element.textBorderWidth ?? 0) > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Row label="Ink">
                  <ColorField
                    value={element.textBorder ?? "#161616"}
                    onChange={(textBorder) => patch({ textBorder })}
                  />
                </Row>
                <Row label="Width">
                  <NumberField
                    value={element.textBorderWidth ?? 1}
                    onChange={(textBorderWidth) => patch({ textBorderWidth })}
                    min={0}
                    max={20}
                  />
                </Row>
              </div>
            )}
            <ToggleRow
              label="Soft text shadow"
              checked={Boolean(element.textShadow)}
              onChange={(textShadow) => patch({ textShadow })}
            />
          </div>
        </Section>
      )}

      {element.kind === "image" && (
        <Section title="Image">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full rounded-none text-[10px] uppercase tracking-[0.12em]"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-3.5" />
            {element.imageStorageId ? "Replace image" : "Upload image"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onUploadImage(file);
            }}
          />
          <Row label="Fit">
            <Select value={element.fit ?? "cover"} onValueChange={(fit) => patch({ fit: fit as "cover" | "contain" })}>
              <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Fill the frame</SelectItem>
                <SelectItem value="contain">Fit inside</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Radius"><NumberField value={element.imageRadius ?? 0} onChange={(imageRadius) => patch({ imageRadius })} min={0} /></Row>
            <Row label="Border"><NumberField value={element.imageBorder ?? 0} onChange={(imageBorder) => patch({ imageBorder })} min={0} /></Row>
            <Row label="Crop X %"><NumberField value={element.imagePosition?.x ?? 50} onChange={(x) => patch({ imagePosition: { x, y: element.imagePosition?.y ?? 50 } })} min={0} max={100} /></Row>
            <Row label="Crop Y %"><NumberField value={element.imagePosition?.y ?? 50} onChange={(y) => patch({ imagePosition: { x: element.imagePosition?.x ?? 50, y } })} min={0} max={100} /></Row>
          </div>
          <Row label="Border ink"><ColorField value={element.stroke ?? "#b38f6f"} onChange={(stroke) => patch({ stroke })} /></Row>
          <ToggleRow label="Soft shadow" checked={Boolean(element.imageShadow)} onChange={(imageShadow) => patch({ imageShadow })} />
        </Section>
      )}

      {element.kind === "shape" && (
        <Section title="Shape & mask">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full rounded-none text-[10px] uppercase tracking-[0.12em]"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-3.5" />
            {element.imageStorageId ? "Replace clipping image" : "Use image as mask"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onUploadImage(file);
            }}
          />
          <p className="text-[9px] leading-relaxed text-ink/40">
            A photograph placed into an arch, heart, leaf, ellipse, star, or frame is
            clipped to that form in the editor and on the published invitation.
          </p>
          {element.frameArt ? (
            <div className="rounded-md border border-[var(--gold)]/45 bg-[var(--gold)]/[0.08] p-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[9px] uppercase tracking-[0.12em] text-[#7a5f2a]">
                  {frameById(element.frameArt)?.name ?? "Decorative frame"} frame
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => patch({ frameArt: "" })}
                  className="h-6 px-1.5 text-[9px] uppercase tracking-[0.1em] text-ink/50"
                >
                  Remove
                </Button>
              </div>
              <p className="mt-1 text-[9px] leading-relaxed text-ink/45">
                Vector artwork on this layer. Stroke sets its ink and weight;
                resizing keeps the corner ornaments square.
              </p>
            </div>
          ) : null}
          <Row label="Form">
            <Select value={element.shape ?? "rect"} onValueChange={(shape) => patch({ shape: shape as DesignElement["shape"] })}>
              <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHAPES.map((shape) => (
                  <SelectItem key={shape.id} value={shape.id}>{shape.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Fill"><ColorField value={element.fill ?? "#161616"} onChange={(fill) => patch({ fill })} allowTransparent /></Row>
          <Row label="Stroke"><ColorField value={element.stroke ?? "transparent"} onChange={(stroke) => patch({ stroke })} allowTransparent /></Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Stroke"><NumberField value={element.strokeWidth ?? 0} onChange={(strokeWidth) => patch({ strokeWidth })} min={0} /></Row>
            {(element.shape === "rect" || element.shape === "frame") && (
              <Row label="Radius"><NumberField value={element.radius ?? 0} onChange={(radius) => patch({ radius })} min={0} /></Row>
            )}
          </div>
        </Section>
      )}

      {element.kind === "motif" && (
        <Section title="Ornament">
          <Row label="Mark">
            <Select value={element.motif ?? "sprig"} onValueChange={(motif) => patch({ motif: motif as DesignElement["motif"] })}>
              <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {MOTIFS.filter((motif) => motif.id !== "none").map((motif) => (
                  <SelectItem key={motif.id} value={motif.id}>{motif.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Ink"><ColorField value={element.color ?? "#161616"} onChange={(color) => patch({ color })} /></Row>
          <Row label="Weight"><NumberField value={element.strokeWidth ?? 0.8} onChange={(strokeWidth) => patch({ strokeWidth })} step={0.1} min={0.1} /></Row>
        </Section>
      )}

      {animation && (
        <Section title="Animation">
          <ToggleRow
            label="Animate this layer"
            checked={animation.enabled}
            onChange={(enabled) => patchAnimation({ enabled })}
          />
          <Row label="Preset">
            <Select
              value={animation.preset}
              onValueChange={(preset) => patchAnimation({ preset: preset as ElementAnimation["preset"] })}
            >
              <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {ANIMATION_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Play when">
            <Select
              value={animation.trigger}
              onValueChange={(trigger) =>
                patchAnimation({ trigger: trigger as ElementAnimation["trigger"] })
              }
            >
              <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="load">The page opens</SelectItem>
                <SelectItem value="scroll">Scrolled into view</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <p className="text-[9px] leading-relaxed text-ink/40">
            Entry animations run when this page opens, or wait until the card is
            scrolled into view. Retime them on the timeline, or add an interactive
            cover for a tap reveal.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Delay ms"><NumberField value={animation.delay} onChange={(delay) => patchAnimation({ delay })} min={0} step={50} /></Row>
            <Row label="Length ms"><NumberField value={animation.duration} onChange={(duration) => patchAnimation({ duration })} min={100} step={50} /></Row>
          </div>
          <Row label="Easing">
            <Select
              value={animation.easing}
              onValueChange={(easing) => patchAnimation({ easing: easing as ElementAnimation["easing"] })}
            >
              <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EASINGS.map((easing) => (
                  <SelectItem key={easing.id} value={easing.id}>{easing.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <div className="border-t border-ink/10 pt-2">
            <ToggleRow
              label="Exit after time"
              checked={Boolean(element.exit?.enabled)}
              onChange={(enabled) =>
                patch({
                  exit: {
                    enabled,
                    preset: element.exit?.preset ?? "fade",
                    start: element.exit?.start ?? animation.delay + animation.duration + 800,
                    duration: element.exit?.duration ?? 800,
                    easing: element.exit?.easing ?? "easeOut",
                  },
                })
              }
            />
            {element.exit?.enabled && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Row label="Exit at ms">
                  <NumberField value={element.exit.start} onChange={(start) => patch({ exit: { ...element.exit!, start } })} min={0} step={50} />
                </Row>
                <Row label="Length">
                  <NumberField value={element.exit.duration} onChange={(duration) => patch({ exit: { ...element.exit!, duration } })} min={100} step={50} />
                </Row>
              </div>
            )}
          </div>
          <Button type="button" variant="outline" className="h-8 w-full rounded-none text-[10px]" onClick={onPreviewAnimation}>
            <RotateCw className="size-3.5" /> Preview this animation
          </Button>
        </Section>
      )}

      <Section title="Interactive reveal" className="border-b-0">
        <ToggleRow
          label="Use as a cover"
          checked={Boolean(reveal)}
          onChange={(enabled) => {
            if (!enabled) {
              patch({ reveal: undefined });
              return;
            }
            const firstTarget =
              targets[0] ?? page.elements.find((candidate) => candidate.id !== element.id);
            if (!firstTarget) return;
            patch({
              reveal: {
                interactionId: makeId("interaction"),
                targetId: firstTarget.id,
                effect: "fadeAway",
                direction: "up",
                duration: 900,
                trigger: "tap",
                hint: "Tap to reveal",
              },
            });
          }}
        />
        {reveal && (
          <>
            <Row label="Reveals">
              <Select
                value={reveal.targetId}
                onValueChange={(targetId) => patch({ reveal: { ...reveal, targetId } })}
              >
                <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue placeholder="Choose content" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {targets.map((target) => (
                    <SelectItem key={target.id} value={target.id}>{target.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Effect">
              <Select
                value={reveal.effect}
                onValueChange={(effect) => patch({ reveal: { ...reveal, effect: effect as RevealEffect } })}
              >
                <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REVEAL_EFFECTS.map((effect) => (
                    <SelectItem key={effect.id} value={effect.id}>{effect.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Direction">
                <Select
                  value={reveal.direction}
                  onValueChange={(direction) => patch({ reveal: { ...reveal, direction: direction as typeof reveal.direction } })}
                >
                  <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Up</SelectItem>
                    <SelectItem value="down">Down</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Length ms">
                <NumberField value={reveal.duration} onChange={(duration) => patch({ reveal: { ...reveal, duration } })} min={200} step={50} />
              </Row>
            </div>
            <Row label="Hint">
              <Input
                value={reveal.hint ?? ""}
                onChange={(event) => patch({ reveal: { ...reveal, hint: event.target.value } })}
                placeholder="Tap the heart"
                className="h-8 rounded-none text-[11px]"
              />
            </Row>
            <Button type="button" variant="outline" className="h-8 w-full rounded-none text-[10px]" onClick={() => onTestReveal(reveal.interactionId)}>
              <ChevronDown className="size-3.5" /> Test interaction
            </Button>
            <p className="text-[10px] leading-relaxed text-ink/45">
              The cover is the visible layer; its linked content stays hidden until
              a guest taps. Links follow duplicated layers and are cleared if the
              target is deleted.
            </p>
          </>
        )}
      </Section>

      <div className="sticky bottom-0 mt-auto grid grid-cols-2 gap-1 border-t border-[var(--edge)] bg-[var(--surface-card)]/95 p-3 backdrop-blur-sm">
        <Button type="button" variant="outline" className="h-9 rounded-none text-[10px] uppercase tracking-[0.1em]" onClick={onDuplicate}>
          <Copy className="size-3.5" /> Duplicate
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-none border-[var(--red)]/40 text-[10px] uppercase tracking-[0.1em] text-[var(--red)] hover:border-[var(--red)] hover:bg-[var(--red)] hover:text-[#f2f1ed]"
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteDisabled ? deleteHint : "Delete this layer (⌫)"}
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}
