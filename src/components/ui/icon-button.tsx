import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const sizeMap = {
  sm: "size-7",
  md: "size-8",
  lg: "size-9",
} as const;

const ring =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]";

interface StudioIconButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  subtle?: boolean;
  disabled?: boolean;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * The compact icon control that every studio surface shares.
 *
 * One circular shape, one icon size, one focus ring and one set of states so
 * the toolbar, panels, popovers and dropdowns look like one product.
 */
export function StudioIconButton({
  label,
  onClick,
  active,
  danger,
  subtle,
  disabled,
  children,
  size = "md",
  className,
}: StudioIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active !== undefined ? active : undefined}
      className={cn(
        "pressable grid shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-35 [&_svg]:shrink-0",
        ring,
        sizeMap[size],
        active
          ? "border-ink bg-ink text-[var(--paper-light)] shadow-[var(--shadow-xs)]"
          : danger
            ? "border-transparent text-ink/55 hover:border-[var(--red)]/35 hover:bg-[var(--red)]/[0.07] hover:text-[var(--red)]"
            : subtle
              ? "border-transparent text-ink/50 hover:bg-ink/[0.06] hover:text-ink"
              : "border-[var(--edge)] bg-[var(--surface-card)] text-ink/65 shadow-[var(--shadow-xs)] hover:border-[var(--edge-strong)] hover:text-ink",
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
