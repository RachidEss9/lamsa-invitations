import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PanelSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function PanelSection({
  title,
  children,
  className,
  footer,
}: PanelSectionProps) {
  return (
    <section className={cn(
      "border-b border-ink/12 bg-transparent px-4 py-3.5",
      className
    )}>
      <p className="mb-2.5 font-meta text-[9px] uppercase tracking-[0.18em] text-ink/40">
        {title}
      </p>
      <div className="min-h-[2px]">{children}</div>
      {footer && (
        <div className="mt-3 border-t border-ink/10 pt-2.5">{footer}</div>
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
    <label className={cn(
      "flex items-center justify-between gap-3",
      className
    )}>
      <span className="shrink-0 text-[11px] text-ink/60">{label}</span>
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
