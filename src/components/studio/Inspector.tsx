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
import { Textarea } from "@/components/ui/textarea";
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
import {
  FONT_PAIRS,
  MOTIFS,
  type FontPairId,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
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
import { useRef, type ReactNode } from "react";

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
  onGroup: () => void;
  onUngroup: () => void;
  onUploadImage: (file: File) => Promise<void>;
  onTestReveal: (interactionId: string) => void;
  onPreviewAnimation: () => void;
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-ink/12 px-4 py-4", className)}>
      <p className="mb-3 font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[11px] text-ink/60">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
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
        if (Number.isFinite(parsed)) onChange(parsed);
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
  onGroup,
  onUngroup,
  onUploadImage,
  onTestReveal,
  onPreviewAnimation,
}: InspectorProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const element = selected.length === 1 ? selected[0] : null;
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
        <div className="border-b border-ink/12 px-4 py-4">
          <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
            Page
          </p>
          <h2 className="mt-1 font-display text-xl leading-tight">{page.name}</h2>
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
        <div className="border-b border-ink/12 px-4 py-4">
          <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
            Selection
          </p>
          <h2 className="mt-1 font-display text-xl leading-tight">
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
            <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={onDelete}>
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
      <div className="border-b border-ink/12 px-4 py-4">
        <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
          {elementTypeLabel(element)}
        </p>
        <Input
          value={element.name}
          onChange={(event) => patch({ name: event.target.value })}
          className="mt-1 h-8 border-none bg-transparent px-0 font-display text-lg shadow-none focus-visible:ring-0"
          aria-label="Layer name"
        />
      </div>

      <Section title="Geometry">
        <div className="grid grid-cols-2 gap-2">
          <Row label="X"><NumberField value={element.x} onChange={(x) => patch({ x })} /></Row>
          <Row label="Y"><NumberField value={element.y} onChange={(y) => patch({ y })} /></Row>
          <Row label="W"><NumberField value={element.w} onChange={(w) => patch({ w })} min={8} /></Row>
          <Row label="H"><NumberField value={element.h} onChange={(h) => patch({ h })} min={8} /></Row>
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
        <div className="grid grid-cols-3 gap-1">
          <button type="button" onClick={() => onLayer("back")} className="flex h-8 items-center justify-center border border-ink/15 text-ink/65 hover:border-ink" title="Send to back">
            <ArrowDownToLine className="size-3.5" />
          </button>
          <button type="button" onClick={() => onLayer("down")} className="flex h-8 items-center justify-center border border-ink/15 text-ink/65 hover:border-ink" title="Send backward">
            <MoveDown className="size-3.5" />
          </button>
          <button type="button" onClick={() => onLayer("up")} className="flex h-8 items-center justify-center border border-ink/15 text-ink/65 hover:border-ink" title="Bring forward">
            <MoveUp className="size-3.5" />
          </button>
          <button type="button" onClick={() => onLayer("front")} className="flex h-8 items-center justify-center border border-ink/15 text-ink/65 hover:border-ink" title="Bring to front">
            <ArrowUpToLine className="size-3.5" />
          </button>
          <button type="button" onClick={() => patch({ locked: !element.locked })} className="flex h-8 items-center justify-center border border-ink/15 text-ink/65 hover:border-ink" title="Lock">
            {element.locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
          </button>
          <button type="button" onClick={() => patch({ hidden: !element.hidden })} className="flex h-8 items-center justify-center border border-ink/15 text-ink/65 hover:border-ink" title="Hide">
            {element.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
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
          <Row label="Typeface">
            <Select
              value={element.font ?? "romance"}
              onValueChange={(font) => patch({ font: font as FontPairId })}
            >
              <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_PAIRS.map((pair) => (
                  <SelectItem key={pair.id} value={pair.id}>{pair.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Size"><NumberField value={element.fontSize ?? 26} onChange={(fontSize) => patch({ fontSize })} min={6} /></Row>
            <Row label="Weight"><NumberField value={element.fontWeight ?? 400} onChange={(fontWeight) => patch({ fontWeight })} step={100} min={100} max={900} /></Row>
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
          <div className="grid grid-cols-2 gap-2">
            <ToggleRow label="Italic" checked={Boolean(element.italic)} onChange={(italic) => patch({ italic })} />
            <ToggleRow label="Caps" checked={Boolean(element.uppercase)} onChange={(uppercase) => patch({ uppercase })} />
          </div>
          <Row label="Colour"><ColorField value={element.color ?? "#161616"} onChange={(color) => patch({ color })} /></Row>
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
        <Section title="Shape">
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
          <p className="text-[9px] leading-relaxed text-ink/40">
            Entry animations run when this page opens. Retime them on the timeline
            for guest-paced reveals, or add an interactive cover for a tap reveal.
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

      <div className="mt-auto grid grid-cols-2 gap-1 border-t border-ink/12 p-3">
        <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={onDuplicate}>
          <Copy className="size-3.5" /> Duplicate
        </Button>
        <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}
