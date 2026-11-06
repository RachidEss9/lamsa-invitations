import { Check, Crop, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

import type { ImageCropDraft } from "@/lib/publishing/image";
import { cropForMode } from "@/lib/publishing/image";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export interface ImageCropBarProps {
  name: string;
  draft: ImageCropDraft;
  onChange: (draft: ImageCropDraft) => void;
  onApply: () => void;
  onCancel: () => void;
}

export function ImageCropBar({
  name,
  draft,
  onChange,
  onApply,
  onCancel,
}: ImageCropBarProps) {
  const zoomBy = (factor: number) => {
    onChange({
      ...draft,
      crop: {
        ...draft.crop,
        scale: Math.min(8, Math.max(0.5, draft.crop.scale * factor)),
        normalized: true,
      },
    });
  };

  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--rule)] bg-[var(--paper-light)] px-3 py-1.5">
      <span className="flex items-center gap-1.5 font-meta text-[0.56rem] uppercase tracking-[0.12em] text-[var(--red)]">
        <Crop className="size-3.5" />
        Crop · {name}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-6 rounded-[3px] px-1.5 font-meta text-[0.5rem] uppercase tracking-[0.06em]"
          onClick={() => {
            const next = cropForMode("contain");
            onChange({ ...draft, fit: next.fit, crop: next.crop });
          }}
        >
          Contain
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 rounded-[3px] px-1.5 font-meta text-[0.5rem] uppercase tracking-[0.06em]"
          onClick={() => {
            const next = cropForMode("cover");
            onChange({ ...draft, fit: next.fit, crop: next.crop });
          }}
        >
          Cover
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 rounded-[3px] px-1.5 font-meta text-[0.5rem] uppercase tracking-[0.06em]"
          onClick={() =>
            onChange({ ...draft, crop: { ...draft.crop, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 } })
          }
        >
          <RotateCcw className="mr-1 size-3" />
          Reset
        </Button>
      </div>

      <div className="flex min-w-[148px] flex-1 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          aria-label="Zoom out"
          onClick={() => zoomBy(1 / 1.15)}
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <Slider
          value={[Math.round(draft.crop.scale * 100)]}
          min={50}
          max={400}
          step={1}
          onValueChange={([value]) =>
            onChange({
              ...draft,
              crop: {
                ...draft.crop,
                scale: Math.max(0.5, (value ?? 100) / 100),
                normalized: true,
              },
            })
          }
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          aria-label="Zoom in"
          onClick={() => zoomBy(1.15)}
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <span className="w-8 text-right font-meta text-[0.52rem] tabular-nums text-[var(--ink-soft)]">
          {Math.round(draft.crop.scale * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          className="h-6 gap-1 rounded-[3px] px-2 font-meta text-[0.52rem] uppercase tracking-[0.08em]"
          onClick={onApply}
        >
          <Check className="size-3" />
          Apply
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 rounded-[3px] px-2 font-meta text-[0.52rem] uppercase tracking-[0.08em]"
          onClick={onCancel}
        >
          <X className="size-3" />
          Cancel
        </Button>
      </div>
      <span className="hidden font-meta text-[0.46rem] uppercase tracking-[0.06em] text-[var(--ink-soft)] xl:inline">
        Enter applies · Esc cancels
      </span>
    </div>
  );
}
