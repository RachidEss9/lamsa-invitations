import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CanvasControlsProps {
  /** True magnification, e.g. 87 for 87%. Null until the canvas is measured. */
  percent: number | null;
  pageIndex: number;
  pageCount: number;
  /** Whether hidden layers are currently ghosted on the canvas. */
  showHidden: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Fit to Screen: whole page, centred. */
  onFit: () => void;
  /** Actual Size: 100%. */
  onActualSize: () => void;
  /** Reset Zoom: back to the default fitted view. */
  onReset: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onToggleShowHidden: () => void;
  className?: string;
}

const pill =
  "pointer-events-auto flex items-center gap-0.5 overflow-hidden rounded-full border border-ink/8 bg-white/85 p-0.5 shadow-[var(--shadow-soft)] backdrop-blur";
const action =
  "pressable grid size-7 place-items-center rounded-full text-ink/55 hover:bg-ink/5 hover:text-ink";

/**
 * The canvas view controls, kept as one small piece so the studio page does not
 * grow another hundred lines of markup — and so the behaviour can be tested by
 * clicking the real buttons rather than trusting that they render.
 */
export function CanvasControls({
  percent,
  pageIndex,
  pageCount,
  showHidden,
  onZoomIn,
  onZoomOut,
  onFit,
  onActualSize,
  onReset,
  onPrevPage,
  onNextPage,
  onToggleShowHidden,
  className,
}: CanvasControlsProps) {
  const readout = percent === null ? "—" : `${percent}%`;
  const atFirst = pageIndex <= 0;
  const atLast = pageIndex >= pageCount - 1;

  return (
    <div
      className={cn("flex flex-col items-end gap-1", className)}
      data-canvas-controls
    >
      {/* Zoom. The readout doubles as Reset: one press returns to the default
          fitted, centred view. */}
      <div className={pill}>
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          title="Zoom out (⌘/Ctrl −)"
          className={action}
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onReset}
          aria-label={`Zoom ${percent ?? 100} percent, reset to fit`}
          title="Reset zoom — fit to screen (⌘/Ctrl 0)"
          className="min-w-[36px] rounded-full px-1 font-meta text-[9px] tabular-nums text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          data-zoom-readout
        >
          {readout}
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          title="Zoom in (⌘/Ctrl +)"
          className={action}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* The two views a host asks for most, as icons so the bar stays quiet. */}
      <div className={pill}>
        <button
          type="button"
          onClick={onFit}
          aria-label="Fit to screen"
          title="Fit to screen (⌘/Ctrl 0)"
          className={action}
        >
          <Maximize2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onActualSize}
          aria-label="Actual size, 100%"
          title="Actual size — 100% (⌘/Ctrl 1)"
          className="pressable h-7 rounded-full px-1.5 font-meta text-[9px] uppercase tracking-[0.06em] text-ink/55 hover:bg-ink/5 hover:text-ink"
        >
          1:1
        </button>
      </div>

      {/* Page navigation: the count says where you are, the ends say where you
          cannot go. */}
      <div className={pill}>
        <button
          type="button"
          onClick={onPrevPage}
          disabled={atFirst}
          aria-label="Previous page"
          title="Previous page (Page Up)"
          className={cn(action, "disabled:pointer-events-none disabled:opacity-25")}
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span
          className="px-0.5 font-meta text-[9px] tabular-nums text-ink/45"
          data-page-readout
        >
          {pageCount > 0 ? `${Math.min(pageIndex + 1, pageCount)} / ${pageCount}` : "0 / 0"}
        </span>
        <button
          type="button"
          onClick={onNextPage}
          disabled={atLast}
          aria-label="Next page"
          title="Next page (Page Down)"
          className={cn(action, "disabled:pointer-events-none disabled:opacity-25")}
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleShowHidden}
        aria-pressed={showHidden}
        aria-label={showHidden ? "Hide hidden layers" : "Show hidden layers"}
        title={showHidden ? "Stop ghosting hidden layers" : "Reveal hidden layers as ghosts"}
        className={cn(
          "pointer-events-auto grid size-8 place-items-center rounded-full border border-ink/8 shadow-[var(--shadow-soft)] backdrop-blur transition-[background-color,color] duration-150 hover:bg-ink/5 hover:text-ink",
          showHidden ? "bg-[var(--red)]/10 text-[var(--red)]" : "bg-white/85 text-ink/50",
        )}
      >
        {showHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      </button>
    </div>
  );
}
