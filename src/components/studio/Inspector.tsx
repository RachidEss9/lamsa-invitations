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
import {
  ColorField,
  NumberField,
  Row,
  ToggleRow,
} from "@/components/studio/inspector-fields";
import {
  ANIMATION_PRESETS,
  EASINGS,
  PAGE_EDGES,
  REVEAL_EFFECTS,
  SHAPES,
  designValueFromInput,
  elementTypeLabel,
  formatDesignValue,
  makeId,
  pageDimensionsLabel,
  type DesignElement,
  type DesignPage,
  type DesignUnit,
  type ElementAnimation,
  type PageEdgeId,
  type RevealEffect,
} from "@/lib/design";
import { fontById } from "@/lib/fonts";
import type { TextOverflow } from "@/lib/text-fit";
import { frameById } from "@/lib/frames";
import { MOTIFS } from "@/lib/invitation";
import { TypographyStudio } from "@/components/studio/TypographyStudio";
import { EffectsInspector } from "@/components/studio/EffectsInspector";
import { ImageStudio } from "@/components/studio/ImageStudio";
import {
  MaterialUnsupportedNote,
  MaterialsStudio,
} from "@/components/studio/MaterialsStudio";
import {
  supportsMaterial,
  supportsMaterialRelief,
} from "@/lib/materials";
import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  FlipHorizontal,
  FlipVertical,
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
  /** Display unit for every measurement in the panel. */
  unit: DesignUnit;
  /** Measured text clipping, keyed by layer id — editor only. */
  textOverflow?: Record<string, TextOverflow>;
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
  /** Whether the canvas is currently drawing material finishes. */
  materialPreview?: boolean;
  /** Switches the canvas back to Material Preview from the panel. */
  onShowMaterials?: () => void;
}

type SectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  /** Advanced groups start folded so the everyday controls lead the panel. */
  defaultOpen?: boolean;
};

/**
 * Which groups are folded, held above every selection view so a choice made
 * while editing one layer still applies to the next one selected — the panel
 * never re-flips under the user's hands.
 */
const SectionCollapseContext = createContext<{
  open: Record<string, boolean>;
  toggle: (title: string, open: boolean) => void;
} | null>(null);

function Section({
  title,
  children,
  className,
  footer,
  defaultOpen = true,
}: SectionProps) {
  const collapse = useContext(SectionCollapseContext);
  const open = collapse ? (collapse.open[title] ?? defaultOpen) : defaultOpen;
  return (
    <section className={cn("border-b border-[var(--edge)] bg-transparent px-4 py-3.5", className)}>
      <button
        type="button"
        onClick={() => collapse?.toggle(title, !open)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
      >
        <span className="section-label flex-1">{title}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-3 shrink-0 text-ink/35 transition-transform duration-200 group-hover:text-ink/70",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <>
          <div className="mt-2.5 min-h-[2px]">{children}</div>
          {footer && (
            <div className="mt-3 border-t border-ink/10 pt-2.5">{footer}</div>
          )}
        </>
      )}
    </section>
  );
}

/**
 * The contextual inspector. Fold state lives in this wrapper rather than in
 * any one selection view, so it survives switching between layers, between
 * single and multi-selection, and between the canvas and the mobile sheet.
 */
export function Inspector(props: InspectorProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <SectionCollapseContext.Provider
      value={{
        open,
        toggle: (title, next) =>
          setOpen((previous) => ({ ...previous, [title]: next })),
      }}
    >
      <InspectorBody {...props} />
    </SectionCollapseContext.Provider>
  );
}

function InspectorBody({
  page,
  selected,
  aspectLocked,
  unit,
  textOverflow,
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
  materialPreview = true,
  onShowMaterials,
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
          <Row label="Edge">
            <Select
              value={page.edge ?? "straight"}
              onValueChange={(edge) => onPagePatch({ edge: edge as PageEdgeId })}
            >
              <SelectTrigger className="h-8 rounded-none text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_EDGES.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          {/* The sheet's real, physical size — never the size it happens to be
              showing at on screen. */}
          <Row label="Size">
            <span className="font-meta text-[11px] tabular-nums text-ink/60">
              {pageDimensionsLabel(page, unit)}
            </span>
          </Row>
        </Section>
        <Section title="Material" defaultOpen={false}>
          <MaterialsStudio
            material={page.material}
            scope="page"
            previewMode={materialPreview}
            onShowMaterials={onShowMaterials}
            onChange={(material) => onPagePatch({ material })}
          />
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

  if (!element) return null;  return (
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

      <Section title={`Geometry (${unit})`}>
        <div className="grid grid-cols-2 gap-2">
          <Row label="X">
            <NumberField
              value={formatDesignValue(element.x, unit)}
              onChange={(x) => patch({ x: designValueFromInput(x, unit) })}
            />
          </Row>
          <Row label="Y">
            <NumberField
              value={formatDesignValue(element.y, unit)}
              onChange={(y) => patch({ y: designValueFromInput(y, unit) })}
            />
          </Row>
          <Row label="W">
            <NumberField
              value={formatDesignValue(element.w, unit)}
              min={formatDesignValue(8, unit)}
              onChange={(fieldW) => {
                const w = designValueFromInput(fieldW, unit);
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
              value={formatDesignValue(element.h, unit)}
              min={formatDesignValue(8, unit)}
              onChange={(fieldH) => {
                const h = designValueFromInput(fieldH, unit);
                if (!aspectLocked) {
                  patch({ h });
                  return;
                }
                const ratio = element.w / Math.max(1, element.h);
                patch({ h, w: Math.max(8, Math.round(h * ratio)) });
              }}
            />
          </Row>
          <Row label="Angle"><NumberField value={element.rotation ?? 0} onChange={(rotation) => patch({ rotation })} /></Row>
          <Row label="Opacity">
            <NumberField
              value={Math.round((element.opacity ?? 1) * 100)}
              onChange={(value) => patch({ opacity: Math.min(1, Math.max(0, value / 100)) })}
              min={0}
              max={100}
            />
          </Row>
        </div>

        <Row label="Flip">
          <div className="flex justify-end gap-1">
            <IconButton
              size="sm"
              label={element.flipX ? "Undo horizontal flip" : "Flip horizontally"}
              active={Boolean(element.flipX)}
              onClick={() => patch({ flipX: !element.flipX })}
            >
              <FlipHorizontal className="size-3.5" />
            </IconButton>
            <IconButton
              size="sm"
              label={element.flipY ? "Undo vertical flip" : "Flip vertically"}
              active={Boolean(element.flipY)}
              onClick={() => patch({ flipY: !element.flipY })}
            >
              <FlipVertical className="size-3.5" />
            </IconButton>
          </div>
        </Row>

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

        <div className="grid grid-cols-3 gap-1">
          <IconButton
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
        <>
          <Section title="Content">
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
          </Section>
          <Section title="Typography">
            <TypographyStudio
              element={element}
              activeFont={activeFont}
              onPatch={patch}
              onEditText={onEditText}
              overflow={textOverflow?.[element.id]}
            />
          </Section>
          <Section title="Text box">
            <p className="text-[9px] leading-relaxed text-ink/40">
              The box and the type scale are independent: resize the layer on the
              canvas to rewrap the words, and the font size stays exactly as set.
            </p>
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
              {element.textBackground ? (
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
              ) : null}
              <ToggleRow
                label="Box border"
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
            </div>
          </Section>
        </>
      )}

      {element.kind === "image" && (
        <Section title="Image studio">
          <ImageStudio
            element={element}
            onPatch={patch}
            onUploadImage={onUploadImage}
            photoLayer
          />
        </Section>
      )}

      {element.kind === "shape" && (
        <>
        <Section title="Shape & mask">
          {!element.imageStorageId ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full rounded-none text-[10px] uppercase tracking-[0.12em]"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="size-3.5" />
              Use image as mask
            </Button>
          ) : null}
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
                {element.imageInShape
                  ? "A decorative frame around a clipped photograph."
                  : "Vector artwork on this layer. Stroke sets its ink and weight."}
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
          <div className="grid grid-cols-2 gap-2">
            <Row label="Fill"><ColorField value={element.fill ?? "#161616"} onChange={(fill) => patch({ fill })} allowTransparent /></Row>
            <Row label="Stroke"><ColorField value={element.stroke ?? "transparent"} onChange={(stroke) => patch({ stroke })} allowTransparent /></Row>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Stroke width"><NumberField value={element.strokeWidth ?? 0} onChange={(strokeWidth) => patch({ strokeWidth })} min={0} step={0.5} /></Row>
            {(element.shape === "rect" || element.shape === "frame") && (
              <Row label="Radius"><NumberField value={element.radius ?? 0} onChange={(radius) => patch({ radius })} min={0} /></Row>
            )}
          </div>
          <div className="border-t border-ink/10 pt-2">
            <ToggleRow
              label="Clip image to shape"
              checked={Boolean(element.imageInShape)}
              onChange={(imageInShape) => patch({ imageInShape: imageInShape && element.imageStorageId ? true : undefined })}
            />
            {element.imageInShape ? (
              <Row label="Frame stroke on photo">
                <Switch
                  checked={Boolean(element.frameStrokeOnImage)}
                  onCheckedChange={(frameStrokeOnImage) => patch({ frameStrokeOnImage: frameStrokeOnImage || undefined })}
                  className="scale-90"
                />
              </Row>
            ) : null}
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-ink/40">
            The photo sits inside the shape, cropped and scaled independently of the
            layer box. Keep Stroke width above zero to keep the frame visible.
          </p>
        </Section>
        {element.imageInShape && element.imageStorageId ? (
          <Section title="Image studio">
            <ImageStudio
              element={element}
              onPatch={patch}
              onUploadImage={onUploadImage}
            />
          </Section>
        ) : null}
        </>
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

      <Section title="Effects" defaultOpen={false}>
        <EffectsInspector element={element} patch={patch} />
      </Section>

      <Section title="Material" defaultOpen={false}>
        {supportsMaterial(element) ? (
          <MaterialsStudio
            material={element.material}
            scope="layer"
            reliefSupported={supportsMaterialRelief(element)}
            previewMode={materialPreview}
            onShowMaterials={onShowMaterials}
            onChange={(material) => patch({ material })}
          />
        ) : (
          <MaterialUnsupportedNote />
        )}
      </Section>

      {animation && (
        <Section title="Animation" defaultOpen={false}>
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
            </Select>          </Row>

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

      <Section title="Interactive reveal" defaultOpen={false} className="border-b-0">
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
                <NumberField value={reveal.duration ?? 800} onChange={(duration) => patch({ reveal: { ...reveal, duration } })} min={200} step={50} />
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
            <Button type="button" variant="outline" className="h-8 w-full rounded-none text-[10px]" onClick={() => onTestReveal(reveal.interactionId ?? "")}>
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




