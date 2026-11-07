import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  Crop,
  Crosshair,
  RotateCcw,
  Scan,
  ChevronsUpDown,
  ImageOff,
} from "lucide-react";

import type {
  ImageCrop,
  ImageFrameObject,
  ImageFit,
  Point,
} from "@/lib/publishing/model";
import {
  cropForMode,
  imageCropMode,
  resolveImageCrop,
  type ImageCropDraft,
} from "@/lib/publishing/image";
import { fromPoints, roundTo, type LengthUnit } from "@/lib/publishing/units";
import {
  assetMimeLabel,
  formatAssetBytes,
  type StudioAsset,
} from "./AssetsPanel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ImagePanelProps {
  object: ImageFrameObject;
  assets: readonly StudioAsset[];
  displayUnit: LengthUnit;
  cropActive?: boolean;
  draft?: ImageCropDraft;
  onPatchObject: (patch: Partial<ImageFrameObject>) => void;
  onChangePlacement: (change: {
    fit?: ImageFit;
    crop?: ImageCrop;
    focal?: Point;
  }) => void;
  onEnterCrop: () => void;
  onResetCrop: () => void;
  onOpenAssets: () => void;
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[3.6rem] shrink-0 font-meta text-[0.53rem] uppercase tracking-[0.06em] text-[var(--ink-soft)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function Value({ children }: { children: ReactNode }) {
  return (
    <span className="ml-auto font-meta text-[0.58rem] tabular-nums text-[var(--ink-soft)]">
      {children}
    </span>
  );
}

export function ImagePanel({
  object,
  assets,
  displayUnit,
  cropActive,
  draft,
  onPatchObject,
  onChangePlacement,
  onEnterCrop,
  onResetCrop,
  onOpenAssets,
}: ImagePanelProps) {
  const [focalOpen, setFocalOpen] = useState(false);
  const asset = assets.find((entry) => entry.assetId === object.assetId);
  const fit = draft?.fit ?? object.fit;
  const crop = draft?.crop ?? object.crop;
  const focal = draft?.focal ?? object.focal ?? { x: 0.5, y: 0.5 };
  const resolved = resolveImageCrop(crop);
  const mode = imageCropMode(fit, crop);

  const place = (change: { fit?: ImageFit; crop?: ImageCrop; focal?: Point }) => {
    onChangePlacement(change);
  };

  const setCrop = (next: ImageCrop) => place({ crop: next });

  const effectivePpi =
    asset && asset.width > 0 && object.frame.width > 0
      ? Math.round(asset.width / (object.frame.width / 72))
      : null;
  const unit = (points: number) => roundTo(fromPoints(points, displayUnit), 1);

  return (
    <>
      {cropActive ? (
        <div className="border-b border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_7%,var(--paper))] px-3 py-2">
          <p className="flex items-center gap-1.5 font-meta text-[0.55rem] uppercase tracking-[0.1em] text-[var(--red)]">
            <Crop className="size-3" />
            Crop draft
          </p>
          <p className="mt-1 text-[0.62rem] leading-4 text-[var(--ink-soft)]">
            Drag the artwork, then Apply. The image frame does not move.
          </p>
        </div>
      ) : null}

      <Section title="Placement">
        <Row label="Mode">
          <Select
            value={mode}
            onValueChange={(value) => {
              if (value === "custom") {
                onEnterCrop();
                return;
              }
              const next = cropForMode(value as "contain" | "cover");
              place({ fit: next.fit, crop: next.crop });
            }}
          >
            <SelectTrigger className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.7rem] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contain">Contain · whole image</SelectItem>
              <SelectItem value="cover">Cover · fill frame</SelectItem>
              <SelectItem value="custom">Custom crop</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row label="Zoom">
          <Slider
            value={[Math.round(resolved.zoom * 100)]}
            min={50}
            max={400}
            step={1}
            onValueChange={([value]) =>
              setCrop({ ...crop, scale: Math.max(0.5, (value ?? 100) / 100), normalized: true })
            }
          />
          <Value>{Math.round(resolved.zoom * 100)}%</Value>
        </Row>
        <Row label="Horizontal">
          <Slider
            value={[Math.round(resolved.offsetX * 100)]}
            min={-50}
            max={50}
            step={1}
            onValueChange={([value]) =>
              setCrop({
                ...crop,
                offsetX: (value ?? 0) / 100,
                normalized: true,
                rotation: resolved.rotation,
              })
            }
          />
          <Value>{Math.round(resolved.offsetX * 100)}%</Value>
        </Row>
        <Row label="Vertical">
          <Slider
            value={[Math.round(resolved.offsetY * 100)]}
            min={-50}
            max={50}
            step={1}
            onValueChange={([value]) =>
              setCrop({
                ...crop,
                offsetY: (value ?? 0) / 100,
                normalized: true,
                rotation: resolved.rotation,
              })
            }
          />
          <Value>{Math.round(resolved.offsetY * 100)}%</Value>
        </Row>
        <Row label="Rotate">
          <Slider
            value={[Math.round(resolved.rotation)]}
            min={-180}
            max={180}
            step={1}
            onValueChange={([value]) =>
              setCrop({ ...crop, rotation: value ?? 0, normalized: true })
            }
          />
          <Value>{Math.round(resolved.rotation)}°</Value>
        </Row>

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 flex-1 rounded-[3px] px-1 font-meta text-[0.52rem] uppercase tracking-[0.06em]"
            onClick={onEnterCrop}
          >
            <Crop className="mr-1 size-3" />
            Crop
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 flex-1 rounded-[3px] px-1 font-meta text-[0.52rem] uppercase tracking-[0.06em]"
            onClick={onResetCrop}
          >
            <RotateCcw className="mr-1 size-3" />
            Reset
          </Button>
        </div>

        <Collapsible open={focalOpen} onOpenChange={setFocalOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-1 font-meta text-[0.53rem] uppercase tracking-[0.07em] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              <Crosshair className="size-3" />
              Focal point
              <ChevronDown
                className={cn(
                  "ml-auto size-3 transition-transform",
                  focalOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <Row label="Focal X">
              <Slider
                value={[Math.round(focal.x * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) =>
                  place({ focal: { x: (value ?? 50) / 100, y: focal.y } })
                }
              />
              <Value>{Math.round(focal.x * 100)}%</Value>
            </Row>
            <Row label="Focal Y">
              <Slider
                value={[Math.round(focal.y * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) =>
                  place({ focal: { x: focal.x, y: (value ?? 50) / 100 } })
                }
              />
              <Value>{Math.round(focal.y * 100)}%</Value>
            </Row>
            <p className="text-[0.58rem] leading-4 text-[var(--ink-soft)]">
              The focal point anchors the chosen part of the photograph at the centre of
              the frame.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 rounded-[3px] px-1 font-meta text-[0.5rem] uppercase tracking-[0.05em]"
            onClick={() => {
              const next = cropForMode("contain");
              place({ fit: next.fit, crop: next.crop });
            }}
          >
            <Scan className="mr-1 size-3" />
            Contain
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 rounded-[3px] px-1 font-meta text-[0.5rem] uppercase tracking-[0.05em]"
            onClick={() => {
              const next = cropForMode("cover");
              place({ fit: next.fit, crop: next.crop });
            }}
          >
            <Scan className="mr-1 size-3 rotate-90" />
            Cover
          </Button>
        </div>
      </Section>

      <Section title="Image information">
        <Row label="Artwork">
          <Button
            variant="secondary"
            size="sm"
            className="h-7 flex-1 gap-1 rounded-[3px] text-left font-meta text-[0.62rem]"
            onClick={() => onOpenAssets()}
          >
            {object.assetId ? (
              <>
                <img
                  src={asset?.proxyUrl ?? asset?.thumbnailUrl ?? asset?.originalUrl ?? ""}
                  alt=""
                  className="size-4 rounded-[2px] object-cover"
                />
                <span>{asset?.filename ?? object.assetId}</span>
              </>
            ) : (
              <>
                <ImageOff className="size-3.5" />
                <span>No artwork assigned</span>
              </>
            )}
            <ChevronsUpDown className="ml-auto size-3 text-[var(--ink-soft)]" />
          </Button>
          {asset && (
            <p className="font-meta text-[0.52rem] uppercase tracking-[0.06em] text-[var(--ink-soft)]">
              {assetMimeLabel(asset)} · {asset.width}×{asset.height} · {formatAssetBytes(asset.fileSize)}
            </p>
          )}
        </Row>
        {asset ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-meta text-[0.6rem] tabular-nums">
            <dt className="text-[var(--ink-soft)]">Name</dt>
            <dd className="truncate text-right">{asset.filename}</dd>
            <dt className="text-[var(--ink-soft)]">Pixels</dt>
            <dd className="text-right">
              {asset.width} × {asset.height}
            </dd>
            <dt className="text-[var(--ink-soft)]">Type</dt>
            <dd className="text-right">{assetMimeLabel(asset)}</dd>
            <dt className="text-[var(--ink-soft)]">File</dt>
            <dd className="text-right">{formatAssetBytes(asset.fileSize)}</dd>
            {effectivePpi ? (
              <>
                <dt className="text-[var(--ink-soft)]">Resolution</dt>
                <dd className="text-right">≈ {effectivePpi} ppi at this size</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="text-[0.66rem] leading-4 text-[var(--gold)]">
            {object.assetId
              ? "This asset is missing or unavailable. The frame is preserved."
              : "No artwork is assigned to this frame."}
          </p>
        )}
      </Section>

      <Section title="Frame">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-meta text-[0.6rem] tabular-nums">
          <dt className="text-[var(--ink-soft)]">Size</dt>
          <dd className="text-right">
            {unit(object.frame.width)} × {unit(object.frame.height)} {displayUnit}
          </dd>
          <dt className="text-[var(--ink-soft)]">Position</dt>
          <dd className="text-right">
            {unit(object.frame.x)}, {unit(object.frame.y)} {displayUnit}
          </dd>
          <dt className="text-[var(--ink-soft)]">Rotation</dt>
          <dd className="text-right">{Math.round(object.frame.rotation)}°</dd>
        </dl>
        <Row label="Clip">
          <Select
            value={object.mask}
            onValueChange={(value) =>
              onPatchObject({ mask: value as ImageFrameObject["mask"] })
            }
          >
            <SelectTrigger className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.68rem] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rect">Rectangle</SelectItem>
              <SelectItem value="ellipse">Ellipse</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <p className="text-[0.58rem] leading-4 text-[var(--ink-soft)]">
          Artwork is clipped to the frame. Moving or resizing the frame does not alter
          the saved crop.
        </p>
      </Section>
    </>
  );
}
