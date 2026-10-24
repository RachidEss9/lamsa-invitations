import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const sizeMap = {
  sm: "size-7",
  md: "size-8",
  lg: "size-9",
} as const;

const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]";

interface StudioIconButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  subtle?: boolean;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * The compact icon control that every studio surface now shares.
 *
 * One size, one corner radius, one focus ring, and one set of states so the
 * toolbar, panels, popovers, and dropdowns all look like one product.
 */
export function StudioIconButton({
  label,
  onClick,
  active,
  danger,
  subtle,
  children,
  size = "md",
  className,
}: StudioIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active !== undefined ? active : undefined}
      className={cn(
        "grid shrink-0 place-items-center rounded-md border transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-35",
        ring,
        sizeMap[size],
        active
          ? "border-ink/80 bg-ink/90 text-[#f2f1ed]"
          : danger
            ? "border-transparent text-ink/55 hover:border-[var(--red)]/40 hover:bg-[var(--red)]/[0.06] hover:text-[var(--red)]"
            : subtle
              ? "border-ink/12 text-ink/50 hover:border-ink/30 hover:text-ink"
              : "border-ink/15 text-ink/60 hover:border-ink/45 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Backward-compatible alias so existing studio imports keep working while the
 * visual system is being unified.
 */
export const IconButton = StudioIconButton;

export { sizeMap };