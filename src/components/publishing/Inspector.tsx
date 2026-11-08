import { useMemo, useState, type ReactNode } from "react";

import type {
  ImageCrop,
  ImageFit,
  MasterPage,
  Point,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
} from "@/lib/publishing/model";
import type { ImageCropDraft } from "@/lib/publishing/image";
import {
  fromPoints,
  roundTo,
  toPoints,
  type LengthUnit,
} from "@/lib/publishing/units";
import { storyForFrame, objectKindLabel } from "@/lib/publishing/render";
import type { StudioAsset } from "./AssetsPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TypographyPanel,
  type TextSelection,
  type TypographyEditor,
} from "./TypographyPanel";
import { ImagePanel } from "./ImagePanel";

/**
 * The inspector. Selection first, then page.
 *
 * The inspector edits the *session*, never the server: every keystroke is
 * local, batched into one page/story record and autosaved. Numeric fields are
 * displayed in the document's own unit and converted to points on commit, so
 * a magazine job reads in millimetres and a book in inches without the model
 * ever storing anything but points.
 */
export interface InspectorProps {
  document: PublicationDocument;
  page: PublicationPage;
  selection: readonly string[];
  assets: readonly StudioAsset[];
  displayUnit: LengthUnit;
  typography: TypographyEditor;
  textSelection: TextSelection | null;
  onPatchPage: (patch: Partial<PublicationPage>) => void;
  onPatchObject: (
    objectId: string,
    patch: Partial<PublicationObject> | ((object: PublicationObject) => PublicationObject),
  ) => void;
  onSetFrame: (
    objectId: string,
    frame: Partial<{ x: number; y: number; width: number; height: number; rotation: number }>,
  ) => void;
  onDeleteSelected: () => void;
  onRestack: (objectId: string, direction: 1 | -1) => void;
  onOpenAssetsPanel: () => void;
  imageCropDraft?: ImageCropDraft;
  onChangeImagePlacement: (
    objectId: string,
    change: { fit?: ImageFit; crop?: ImageCrop; focal?: Point },
  ) => void;
  onEnterImageCrop: (objectId: string) => void;
  onResetImageCrop: (objectId: string) => void;
  /** Set while a master is being edited; the page sections then describe it. */
  masterMode?: {
    master: MasterPage;
    onRename: (name: string) => void;
    onPatch: (
      patch: Partial<Pick<MasterPage, "description" | "appliesTo" | "background">>,
    ) => void;
    onExit: () => void;
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--rule)] px-3 py-2.5">
      <h3 className="mb-2 font-meta text-[0.55rem] uppercase tracking-[0.15em] text-[var(--ink-soft)]">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-14 shrink-0 font-meta text-[0.58rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * A number field that commits on Enter or blur, so typing "12." is not an
 * edit of the document. It re-syncs when the committed value changes from
 * elsewhere (undo, canvas drag, page switch).
 */
function NumberField({
  label,
  value,
  unit,
  step = 1,
  min,
  onCommit,
}: {
  label: string;
  /** Value in points (or degrees for rotation). */
  value: number;
  unit: string;
  step?: number;
  min?: number;
  onCommit: (value: number) => void;
}) {
  const formatted = roundTo(value, 2).toFixed(2).replace(/\.?0+$/, "");
  const [draft, setDraft] = useState(formatted);
  const [synced, setSynced] = useState(formatted);
  // Derived state, adjusted during render: an edit from the canvas, an undo or
  // a page switch re-seeds the field without an effect round-trip.
  if (synced !== formatted) {
    setSynced(formatted);
    setDraft(formatted);
  }

  const commit = () => {
    const parsed = Number.parseFloat(draft.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setDraft(formatted);
      return;
    }
    const clamped = min === undefined ? parsed : Math.max(min, parsed);
    if (Math.abs(clamped - value) < 1e-6) {
      setDraft(formatted);
      return;
    }
    onCommit(clamped);
  };

  return (
    <FieldRow label={label}>
      <span className="relative flex-1">
        <Input
          value={draft}
          inputMode="decimal"
          step={step}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setDraft(formatted);
              event.currentTarget.blur();
            }
          }}
          className="h-7 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] pr-7 text-right font-meta text-[0.7rem] tabular-nums shadow-none"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-meta text-[0.55rem] text-[var(--ink-soft)]">
          {unit}
        </span>
      </span>
    </FieldRow>
  );
}

export function Inspector(props: InspectorProps) {
  const {
    document,
    page,
    selection,
    assets,
    displayUnit,
    typography,
    textSelection,
    onPatchPage,
    onPatchObject,
    onSetFrame,
    onDeleteSelected,
    onRestack,
    imageCropDraft,
    onChangeImagePlacement,
    onEnterImageCrop,
    onResetImageCrop,
    onOpenAssetsPanel,
    masterMode,
  } = props;

  const selected = useMemo(() => {
    const wanted = new Set(selection);
    return page.objects.filter((object) => wanted.has(object.id));
  }, [page, selection]);
  const single = selected.length === 1 ? selected[0]! : null;
  const story = single ? storyForFrame(document, single) : undefined;

  const unitLabel = displayUnit;
  const display = (points: number) => roundTo(fromPoints(points, displayUnit), 2);
  const points = (value: number) => toPoints(value, displayUnit);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-3 py-2">
        <span className="font-meta text-[0.6rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          {masterMode ? "Master inspector" : "Inspector"}
        </span>
        <span className="font-meta text-[0.55rem] uppercase tracking-[0.1em] text-[color-mix(in_oklab,var(--ink-soft)_75%,transparent)]">
          {selected.length > 0 ? `${selected.length} selected` : "Page"}
        </span>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto pb-6">
        {masterMode && !single ? (
          <>
            <Section title="Master">
              <FieldRow label="Name">
                <Input
                  value={masterMode.master.name}
                  onChange={(event) => masterMode.onRename(event.target.value)}
                  aria-label="Master name"
                  className="h-7 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.72rem] shadow-none"
                />
              </FieldRow>
              <FieldRow label="Note">
                <Input
                  value={masterMode.master.description ?? ""}
                  placeholder="Optional description"
                  onChange={(event) =>
                    masterMode.onPatch({ description: event.target.value })
                  }
                  aria-label="Master description"
                  className="h-7 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.72rem] shadow-none"
                />
              </FieldRow>
              <FieldRow label="Applies">
                <Select
                  value={masterMode.master.appliesTo}
                  onValueChange={(value) =>
                    masterMode.onPatch({ appliesTo: value as MasterPage["appliesTo"] })
                  }
                >
                  <SelectTrigger
                    aria-label="Master applies to"
                    className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.72rem] shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both sides</SelectItem>
                    <SelectItem value="left">Left pages</SelectItem>
                    <SelectItem value="right">Right pages</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Paper">
                <span className="flex flex-1 items-center gap-1.5">
                  <input
                    type="color"
                    aria-label="Master background colour"
                    value={masterMode.master.background.color || "#ffffff"}
                    onChange={(event) =>
                      // Backgrounds are a master property: changing this
                      // repaints every page that uses the master.
                      masterMode.onPatch({
                        background: {
                          ...masterMode.master.background,
                          color: event.target.value,
                        },
                      })
                    }
                    className="h-7 w-8 cursor-pointer rounded-[3px] border border-[var(--rule)] bg-[var(--paper)] p-0.5"
                  />
                  <Input
                    value={masterMode.master.background.color || "#ffffff"}
                    aria-label="Master background value"
                    onChange={(event) =>
                      masterMode.onPatch({
                        background: {
                          ...masterMode.master.background,
                          color: event.target.value,
                        },
                      })
                    }
                    className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] font-meta text-[0.7rem] uppercase shadow-none"
                  />
                </span>
              </FieldRow>
            </Section>

            <Section title="Paper & bleed">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-meta text-[0.66rem] tabular-nums">
                <dt className="text-[var(--ink-soft)]">Trim</dt>
                <dd>
                  {display(masterMode.master.spec?.trim.width ?? page.spec.trim.width)} ×{" "}
                  {display(masterMode.master.spec?.trim.height ?? page.spec.trim.height)}{" "}
                  {unitLabel}
                </dd>
                <dt className="text-[var(--ink-soft)]">Bleed</dt>
                <dd>
                  {display(masterMode.master.spec?.bleed ?? page.spec.bleed)} {unitLabel}
                </dd>
                <dt className="text-[var(--ink-soft)]">Objects</dt>
                <dd>{masterMode.master.objects.length}</dd>
                <dt className="text-[var(--ink-soft)]">Layers</dt>
                <dd>{masterMode.master.layers.length}</dd>
              </dl>
              <p className="text-[0.64rem] leading-relaxed text-[var(--ink-soft)]">
                Master objects paint beneath every page that uses this master. Page
                objects always stay on top and are never changed by a master edit.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-full rounded-[3px] border-[var(--rule)] font-meta text-[0.55rem] uppercase tracking-[0.1em]"
                onClick={masterMode.onExit}
              >
                Return to page editing
              </Button>
            </Section>
          </>
        ) : null}

        {!single && !masterMode ? (
          <>
            <Section title="Page">
              <FieldRow label="Name">
                <Input
                  value={page.name}
                  onChange={(event) => onPatchPage({ name: event.target.value })}
                  className="h-7 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.72rem] shadow-none"
                />
              </FieldRow>
              <FieldRow label="Master">
                <Select
                  value={page.masterId ?? "none"}
                  onValueChange={(value) =>
                    onPatchPage({ masterId: value === "none" ? undefined : value })
                  }
                >
                  <SelectTrigger className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.72rem] shadow-none">
                    <SelectValue placeholder="No master" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No master</SelectItem>
                    {document.masters.map((master) => (
                      <SelectItem key={master.id} value={master.id}>
                        {master.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Paper">
                <span className="flex flex-1 items-center gap-1.5">
                  <input
                    type="color"
                    aria-label="Page background colour"
                    value={page.background.color || "#ffffff"}
                    onChange={(event) =>
                      onPatchPage({ background: { ...page.background, color: event.target.value } })
                    }
                    className="h-7 w-8 cursor-pointer rounded-[3px] border border-[var(--rule)] bg-[var(--paper)] p-0.5"
                  />
                  <Input
                    value={page.background.color}
                    onChange={(event) =>
                      onPatchPage({ background: { ...page.background, color: event.target.value } })
                    }
                    className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] font-meta text-[0.7rem] uppercase shadow-none"
                  />
                </span>
              </FieldRow>
            </Section>

            <Section title={`Margins · ${unitLabel}`}>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                {(["top", "right", "bottom", "left"] as const).map((edge) => (
                  <NumberField
                    key={edge}
                    label={edge}
                    unit={unitLabel}
                    value={display(page.spec.margins[edge])}
                    min={0}
                    onCommit={(value) =>
                      onPatchPage({
                        spec: {
                          ...page.spec,
                          margins: { ...page.spec.margins, [edge]: points(value) },
                        },
                      })
                    }
                  />
                ))}
              </div>
              <label className="mt-1 flex items-center justify-between">
                <span className="text-[0.7rem] text-[var(--ink)]">Mirror inner margins</span>
                <Switch
                  checked={page.spec.mirrorMargins}
                  onCheckedChange={(checked) =>
                    onPatchPage({ spec: { ...page.spec, mirrorMargins: checked } })
                  }
                />
              </label>
            </Section>

            <Section title="Trim & bleed">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-meta text-[0.66rem] tabular-nums">
                <dt className="text-[var(--ink-soft)]">Trim</dt>
                <dd>
                  {display(page.spec.trim.width)} × {display(page.spec.trim.height)} {unitLabel}
                </dd>
                <dt className="text-[var(--ink-soft)]">Bleed</dt>
                <dd>
                  {display(page.spec.bleed)} {unitLabel}
                </dd>
                <dt className="text-[var(--ink-soft)]">Side</dt>
                <dd className="capitalize">{page.side}</dd>
                <dt className="text-[var(--ink-soft)]">Objects</dt>
                <dd>{page.objects.length}</dd>
              </dl>
            </Section>
          </>
        ) : null}

        {single ? (
          <>
            <Section title={objectKindLabel(single)}>
              <FieldRow label="Name">
                <Input
                  value={single.name}
                  onChange={(event) => onPatchObject(single.id, { name: event.target.value })}
                  className="h-7 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.72rem] shadow-none"
                />
              </FieldRow>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 flex-1 rounded-[3px] px-1 font-meta text-[0.55rem] uppercase tracking-[0.08em]"
                  onClick={() => onRestack(single.id, 1)}
                >
                  Bring forward
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 flex-1 rounded-[3px] px-1 font-meta text-[0.55rem] uppercase tracking-[0.08em]"
                  onClick={() => onRestack(single.id, -1)}
                >
                  Send back
                </Button>
              </div>
            </Section>

            <Section title={`Position · ${unitLabel}`}>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <NumberField
                  label="X"
                  unit={unitLabel}
                  value={display(single.frame.x)}
                  onCommit={(value) => onSetFrame(single.id, { x: points(value) })}
                />
                <NumberField
                  label="Y"
                  unit={unitLabel}
                  value={display(single.frame.y)}
                  onCommit={(value) => onSetFrame(single.id, { y: points(value) })}
                />
                <NumberField
                  label="W"
                  unit={unitLabel}
                  value={display(single.frame.width)}
                  min={0.1}
                  onCommit={(value) => onSetFrame(single.id, { width: points(value) })}
                />
                <NumberField
                  label="H"
                  unit={unitLabel}
                  value={display(single.frame.height)}
                  min={0.1}
                  onCommit={(value) => onSetFrame(single.id, { height: points(value) })}
                />
              </div>
              <NumberField
                label="Rotate"
                unit="°"
                value={single.frame.rotation}
                onCommit={(value) => onSetFrame(single.id, { rotation: value })}
              />
            </Section>

            <Section title="Appearance">
              <label className="flex items-center justify-between">
                <span className="text-[0.7rem] text-[var(--ink)]">Opacity</span>
                <span className="font-meta text-[0.62rem] tabular-nums text-[var(--ink-soft)]">
                  {Math.round(single.opacity * 100)}%
                </span>
              </label>
              <Slider
                aria-label="Object opacity"
                value={[Math.round(single.opacity * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) =>
                  onPatchObject(single.id, { opacity: Math.max(0, Math.min(1, value / 100)) })
                }
              />
              <label className="flex items-center justify-between">
                <span className="text-[0.7rem] text-[var(--ink)]">Visible</span>
                <Switch
                  checked={!single.hidden}
                  onCheckedChange={(checked) => onPatchObject(single.id, { hidden: !checked })}
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-[0.7rem] text-[var(--ink)]">Locked</span>
                <Switch
                  checked={single.locked}
                  onCheckedChange={(checked) => onPatchObject(single.id, { locked: checked })}
                />
              </label>
              <FieldRow label="Layer">
                <Select
                  value={single.layerId}
                  onValueChange={(value) => onPatchObject(single.id, { layerId: value })}
                >
                  <SelectTrigger className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.72rem] shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {page.layers.map((layer) => (
                      <SelectItem key={layer.id} value={layer.id}>
                        {layer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            </Section>

            {single.kind === "text-frame" && story ? (
              <TypographyPanel
                document={document}
                frame={single}
                story={story}
                editor={typography}
                selection={textSelection}
              />
            ) : null}

            {single.kind === "text-frame" && !story ? (
              <Section title="Text">
                <p className="text-[0.7rem] leading-5 text-[var(--ink-soft)]">
                  This frame has no story. Text frames created here carry one; a frame that
                  arrived without a story cannot be typed into yet.
                </p>
              </Section>
            ) : null}

            {single.kind === "image-frame" ? (
              <ImagePanel
                object={single}
                assets={assets}
                displayUnit={displayUnit}
                cropActive={Boolean(imageCropDraft)}
                draft={imageCropDraft}
                onPatchObject={(patch) => onPatchObject(single.id, patch)}
                onChangePlacement={(change) => onChangeImagePlacement(single.id, change)}
                onEnterCrop={() => onEnterImageCrop(single.id)}
                onResetCrop={() => onResetImageCrop(single.id)}
                onOpenAssets={onOpenAssetsPanel}
              />
            ) : null}

            {single.kind === "shape" ? (
              <Section title="Shape">
                <FieldRow label="Fill">
                  <input
                    type="color"
                    aria-label="Shape fill"
                    value={single.fill ?? "#e8e2d6"}
                    onChange={(event) => onPatchObject(single.id, { fill: event.target.value })}
                    className="h-7 w-8 cursor-pointer rounded-[3px] border border-[var(--rule)] bg-[var(--paper)] p-0.5"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 font-meta text-[0.52rem] uppercase"
                    onClick={() => onPatchObject(single.id, { fill: undefined })}
                  >
                    Clear
                  </Button>
                </FieldRow>
                <FieldRow label="Stroke">
                  <input
                    type="color"
                    aria-label="Shape stroke"
                    value={single.stroke ?? "#151515"}
                    onChange={(event) => onPatchObject(single.id, { stroke: event.target.value })}
                    className="h-7 w-8 cursor-pointer rounded-[3px] border border-[var(--rule)] bg-[var(--paper)] p-0.5"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 font-meta text-[0.52rem] uppercase"
                    onClick={() => onPatchObject(single.id, { stroke: undefined })}
                  >
                    Clear
                  </Button>
                </FieldRow>
                <NumberField
                  label="Weight"
                  unit="pt"
                  value={single.strokeWidth}
                  min={0}
                  onCommit={(value) => onPatchObject(single.id, { strokeWidth: value })}
                />
                {single.shape === "rectangle" ? (
                  <NumberField
                    label="Radius"
                    unit="pt"
                    value={single.cornerRadius}
                    min={0}
                    onCommit={(value) => onPatchObject(single.id, { cornerRadius: value })}
                  />
                ) : null}
                {single.shape === "polygon" ? (
                  <NumberField
                    label="Sides"
                    unit=""
                    value={single.sides ?? 3}
                    min={3}
                    onCommit={(value) =>
                      onPatchObject(single.id, { sides: Math.max(3, Math.round(value)) })
                    }
                  />
                ) : null}
              </Section>
            ) : null}

            {single.kind === "line" ? (
              <Section title="Line">
                <FieldRow label="Stroke">
                  <input
                    type="color"
                    aria-label="Line stroke"
                    value={single.stroke}
                    onChange={(event) => onPatchObject(single.id, { stroke: event.target.value })}
                    className="h-7 w-8 cursor-pointer rounded-[3px] border border-[var(--rule)] bg-[var(--paper)] p-0.5"
                  />
                  <Input
                    value={single.stroke}
                    onChange={(event) => onPatchObject(single.id, { stroke: event.target.value })}
                    className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] font-meta text-[0.7rem] uppercase shadow-none"
                  />
                </FieldRow>
                <NumberField
                  label="Weight"
                  unit="pt"
                  value={single.strokeWidth}
                  min={0}
                  onCommit={(value) => onPatchObject(single.id, { strokeWidth: value })}
                />
                <FieldRow label="Cap">
                  <Select
                    value={single.cap}
                    onValueChange={(value) =>
                      onPatchObject(single.id, { cap: value as "butt" | "round" | "square" })
                    }
                  >
                    <SelectTrigger className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.72rem] shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="butt">Butt</SelectItem>
                      <SelectItem value="round">Round</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </Section>
            ) : null}

            <Section title="Object">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-meta text-[0.6rem] tabular-nums">
                <dt className="text-[var(--ink-soft)]">Kind</dt>
                <dd className="text-right">{objectKindLabel(single)}</dd>
                <dt className="text-[var(--ink-soft)]">Rotation</dt>
                <dd className="text-right">{Math.round(single.frame.rotation)}°</dd>
              </dl>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-full rounded-[3px] font-meta text-[0.52rem] uppercase tracking-[0.08em] text-[var(--red)]"
                onClick={onDeleteSelected}
              >
                Delete object
              </Button>
            </Section>
          </>
        ) : null}
      </div>
    </div>
  );
}

 