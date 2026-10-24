import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * The one compact icon control used across the studio.
 *
 * 32 px square by default, 28 px in dense toolbars, six-pixel corners, a
 * visible focus ring, and a native tooltip on every desktop hover. The label is
 * always an accessible name, so the control stays usable without a mouse.
 */
export function IconButton({
  label,
  onClick,
  active,
  disabled,
  children,
  size = "md",
  tone = "default",
  className,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  size?: "sm" | "md";
  tone?: "default" | "danger";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      className={cn(
        "grid shrink-0 place-items-center rounded-md border transition-[background-color,border-color,color] duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]",
        "disabled:cursor-not-allowed disabled:opacity-35",
        size === "sm" ? "size-7" : "size-8",
        active
          ? "border-ink bg-ink text-[#f2f1ed]"
          : tone === "danger"
            ? "border-transparent text-ink/55 hover:border-[var(--red)]/40 hover:bg-[var(--red)]/[0.06] hover:text-[var(--red)]"
            : "border-ink/15 bg-transparent text-ink/60 hover:border-ink/45 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
