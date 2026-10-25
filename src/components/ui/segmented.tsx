import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  id: T;
  label: ReactNode;
  /** Short accessible description, used as the tooltip on an icon-only segment. */
  note?: string;
  icon?: ReactNode;
  count?: number;
}

/**
 * The studio's segmented control: a paper-white track, a soft shadow, and a
 * single charcoal pill marking the current choice.
 *
 * Everything that switches a mode in LAMSA (gallery filters, panel tabs,
 * canvas size, print range) uses this one control so the interaction reads the
 * same on every screen. It is a button group rather than tabs: the choice is
 * state, not navigation, and `aria-pressed` is what a screen reader needs.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  stretch,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
  /** Each segment takes an equal share of the track width. */
  stretch?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-ink/8 bg-white/75 p-1 shadow-[var(--shadow-soft)] backdrop-blur-sm no-scrollbar",
        stretch && "w-full",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            title={option.note}
            onClick={() => onChange(option.id)}
            className={cn(
              "pressable inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full whitespace-nowrap font-ui font-medium",
              size === "sm" ? "h-6.5 px-2.5 text-[10.5px]" : "h-7.5 px-3.5 text-[11.5px]",
              stretch && "flex-1",
              active
                ? "bg-[var(--ink)] text-[var(--paper)] shadow-[var(--shadow-pill)]"
                : "text-ink/55 hover:bg-ink/[0.05] hover:text-ink",
            )}
          >
            {option.icon ? (
              <span className="grid place-items-center" aria-hidden>
                {option.icon}
              </span>
            ) : null}
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "font-meta text-[9px] tabular-nums",
                  active ? "text-[var(--paper)]/55" : "text-ink/35",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
