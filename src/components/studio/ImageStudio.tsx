import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ColorField,
  NumberField,
  Row,
  SegmentedRow,
  ToggleRow,
} from "@/components/studio/inspector-fields";
import { SHAPES, type DesignElement, type ShapeKind } from "@/lib/design";
import type { ImageFit } from "@/lib/image-frame";
import { ImagePlus, RotateCcw } from "lucide-react";
import { useRef } from "react";

/**
 * Image Studio.
 *
 * Everything that concerns the photograph itself — how it is fitted into its
 * frame, how far in it sits, which point of the picture is kept, the angle it
 * is turned to, and three darkroom adjustments — in one contextual panel.
 *
 * None of these controls touch the file. They are settings on the layer, so
 * every one of them survives saving, reopening, duplication, and shows up
 * identically in the canvas, the guest preview, the published page and the
 * PNG/PDF export, because all of them draw through the same renderer.
 */

/**
 * Shapes a photograph can be clipped inside. Everything maskable except the
 * rule, which has no area to hold a picture.
 */
const MASK_SHAPES: { id: ShapeKind; label: string }[] = SHAPES.filter(
  (shape) => shape.id !== "line" && shape.id !== "frame",
);

interface ImageStudioProps {
  element: DesignElement;
  onPatch: (patch: Partial<DesignElement>) => void;
  onUploadImage: (file: File) => Promise<void>;
  /**
   * A placed photograph also owns its frame styling and may be clipped into a
   * shape. A shape that is already wearing a photograph does not: its form,
   * stroke and fill are edited where every other shape edits them.
   */
  photoLayer?: boolean;
}

export function ImageStudio({
  element,
  onPatch,
  onUploadImage,
  photoLayer = false,
}: ImageStudioProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hasImage = Boolean(element.imageStorageId);
  const position = element.imagePosition ?? { x: 50, y: 50 };
  const adjust = element.imageAdjust;
  const isMask = element.kind === "shape";

  const resetFraming = () =>
    onPatch({
      imageZoom: undefined,
      imagePosition: undefined,
      imageRotate: undefined,
    });

  const patchAdjust = (value: Partial<NonNullable<DesignElement["imageAdjust"]>>) => {
    const next = { ...(adjust ?? {}), ...value };
    onPatch({ imageAdjust: next });
  };

  /** Turns a placed photograph into a masked one, keeping its own settings. */
  const clipInside = (shape: ShapeKind) =>
    onPatch({
      kind: "shape",
      shape,
      imageInShape: true,
      frameStrokeOnImage: true,
      fill: "transparent",
      stroke: element.stroke ?? "#b38f6f",
      strokeWidth: element.strokeWidth ?? 2,
      radius: shape === "rect" ? Math.min(40, element.imageRadius ?? 0) : 0,
      imageZoom: element.imageZoom ?? 1,
      imagePosition: position,
      imageRotate: element.imageRotate,
      imageAdjust: element.imageAdjust,
    });

  /** Takes the photograph back out of its mask. */
  const clipNothing = () =>
    onPatch({
      kind: "image",
      shape: undefined,
      imageInShape: undefined,
      frameStrokeOnImage: undefined,
      fill: undefined,
      stroke: undefined,
      strokeWidth: undefined,
      radius: undefined,
      imageRadius: element.radius ?? 0,
      imageZoom: element.imageZoom ?? 1,
      imagePosition: position,
      imageRotate: element.imageRotate,
      imageAdjust: element.imageAdjust,
    });

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full rounded-none text-[10px] uppercase tracking-[0.12em]"
        onClick={() => fileRef.current?.click()}
      >
        <ImagePlus className="size-3.5" />
        {hasImage ? "Replace image" : "Upload image"}
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

      {photoLayer ? (
        <Row label="Clip inside">
          <Select
            value={isMask && element.shape ? element.shape : "none"}
            onValueChange={(value) => {
              if (value === "none") {
                if (isMask) clipNothing();
                return;
              }
              clipInside(value as ShapeKind);
            }}
          >
            <SelectTrigger className="h-8 rounded-none text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="none">Rectangle — no mask</SelectItem>
              {MASK_SHAPES.map((shape) => (
                <SelectItem key={shape.id} value={shape.id}>
                  {shape.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      ) : null}

      {!hasImage ? (
        <p className="text-[9px] leading-relaxed text-ink/40">
          {photoLayer
            ? "Add a photograph to unlock framing, a turn inside the frame, and darkroom adjustments."
            : "This layer is waiting for a photograph. Add one and the framing controls appear here."}
        </p>
      ) : (
        <>
          <SegmentedRow<ImageFit>
            label="Fill"
            value={element.fit ?? "cover"}
            options={[
              {
                id: "cover",
                label: "Fill",
                hint: "Cover the frame and crop whatever runs past it",
              },
              {
                id: "contain",
                label: "Fit",
                hint: "Show the whole photograph inside the frame",
              },
            ]}
            onChange={(fit) => onPatch({ fit })}
          />

          <div className="grid grid-cols-2 gap-2">
            <Row label="Zoom %">
              <NumberField
                value={Math.round((element.imageZoom ?? 1) * 100)}
                min={10}
                max={500}
                ariaLabel="Image zoom"
                onChange={(zoom) =>
                  onPatch({
                    imageZoom: Math.max(10, Math.min(500, zoom)) / 100,
                  })
                }
              />
            </Row>
            <Row label="Turn °">
              <NumberField
                value={element.imageRotate ?? 0}
                min={-360}
                max={360}
                ariaLabel="Image turn"
                onChange={(imageRotate) =>
                  onPatch({
                    imageRotate: Math.abs(imageRotate) < 0.5 ? undefined : imageRotate,
                  })
                }
              />
            </Row>
            <Row label="Position X">
              <NumberField
                value={position.x}
                min={0}
                max={100}
                ariaLabel="Image position across"
                onChange={(x) => onPatch({ imagePosition: { x, y: position.y } })}
              />
            </Row>
            <Row label="Position Y">
              <NumberField
                value={position.y}
                min={0}
                max={100}
                ariaLabel="Image position down"
                onChange={(y) => onPatch({ imagePosition: { x: position.x, y } })}
              />
            </Row>
          </div>

          <p className="text-[9px] leading-relaxed text-ink/40">
            Zoom and Position move the photograph inside its frame; the frame
            itself never changes size or place. Turn tilts only the picture.
          </p>

          <Button
            type="button"
            variant="outline"
            className="h-8 w-full rounded-none text-[9px] uppercase tracking-[0.1em]"
            onClick={resetFraming}
          >
            <RotateCcw className="size-3" /> Reset framing
          </Button>

          <div className="border-t border-ink/10 pt-2">
            <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
              Darkroom
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Row label="Light">
                <NumberField
                  value={adjust?.brightness ?? 100}
                  min={20}
                  max={220}
                  ariaLabel="Brightness"
                  onChange={(brightness) => patchAdjust({ brightness })}
                />
              </Row>
              <Row label="Contrast">
                <NumberField
                  value={adjust?.contrast ?? 100}
                  min={20}
                  max={220}
                  ariaLabel="Contrast"
                  onChange={(contrast) => patchAdjust({ contrast })}
                />
              </Row>
              <Row label="Colour">
                <NumberField
                  value={adjust?.saturation ?? 100}
                  min={0}
                  max={260}
                  ariaLabel="Saturation"
                  onChange={(saturation) => patchAdjust({ saturation })}
                />
              </Row>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[9px] leading-relaxed text-ink/40">
                100 leaves the file untouched; 0 on Colour is greyscale.
              </span>
              <button
                type="button"
                onClick={() => onPatch({ imageAdjust: undefined })}
                className="shrink-0 border border-ink/20 px-1.5 py-1 text-[9px] uppercase tracking-[0.1em] text-ink/60 hover:border-ink hover:text-ink"
              >
                Reset
              </button>
            </div>
          </div>
        </>
      )}

      {photoLayer && hasImage ? (
        <div className="border-t border-ink/10 pt-2">
          <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
            Frame
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Radius">
              <NumberField
                value={element.imageRadius ?? 0}
                min={0}
                ariaLabel="Corner radius"
                onChange={(imageRadius) => onPatch({ imageRadius })}
              />
            </Row>
            <Row label="Border">
              <NumberField
                value={element.imageBorder ?? 0}
                min={0}
                ariaLabel="Border width"
                onChange={(imageBorder) => onPatch({ imageBorder })}
              />
            </Row>
          </div>
          {element.imageBorder ? (
            <div className="mt-2">
              <Row label="Border ink">
                <ColorField
                  value={element.stroke ?? "#b38f6f"}
                  onChange={(stroke) => onPatch({ stroke })}
                />
              </Row>
            </div>
          ) : null}
          <div className="mt-1">
            <ToggleRow
              label="Soft shadow"
              checked={Boolean(element.imageShadow)}
              onChange={(imageShadow) => onPatch({ imageShadow })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
