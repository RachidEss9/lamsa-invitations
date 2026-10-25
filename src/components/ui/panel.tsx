import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PanelSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

/**
 * One panel section rhythm for the whole studio: a quiet label, a compact body,
 * and a hairline between groups. Spacing comes from the shared scale.
 */
export function PanelSection({
  title,
  children,
  className,
  footer,
}: PanelSectionProps) {
  return (
    <section className={cn("border-b border-[var(--edge)] px-4 py-3.5", className)}>
      <p className="section-label mb-2.5">{title}</p>
      <div className="min-h-[2px]">{children}</div>
      {footer && (
        <div className="mt-3 border-t border-[var(--edge)] pt-2.5">{footer}</div>
      )}
    </section>
  );
}

interface PanelRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function PanelRow({ label, children, className }: PanelRowProps) {
  return (
    <label className={cn("flex items-center justify-between gap-3", className)}>
      <span className="shrink-0 font-ui text-[0.7rem] text-ink/55">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

export function PanelGrid({
  cols,
  children,
  className,
}: {
  cols: 1 | 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-3",
        cols === 4 && "grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
