import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A quiet vertical divider between a studio panel and the canvas.
 *
 * Pointer dragging and arrow keys both change the same width; the value is
 * owned by the workspace so it can be persisted or constrained there. The
 * handle is intentionally only 5 px wide, with a wider invisible hit area.
 */
export function PanelResizer({
  side,
  value,
  onChange,
  min = 220,
  max = 380,
  label,
  className,
}: {
  side: "left" | "right";
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  const clamp = useCallback(
    (next: number) => Math.min(max, Math.max(min, Math.round(next))),
    [max, min],
  );

  const move = useCallback(
    (event: PointerEvent) => {
      if (!drag.current) return;
      const delta = event.clientX - drag.current.startX;
      onChange(clamp(drag.current.startWidth + (side === "left" ? delta : -delta)));
    },
    [clamp, onChange, side],
  );

  const end = useCallback(() => {
    drag.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [end, move]);

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        onChange(clamp(value + direction * (side === "left" ? 12 : -12)));
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        drag.current = { startX: event.clientX, startWidth: value };
        event.currentTarget.setPointerCapture(event.pointerId);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      className={cn("studio-resizer", className)}
      data-side={side}
    >
      <span aria-hidden />
    </div>
  );
}
