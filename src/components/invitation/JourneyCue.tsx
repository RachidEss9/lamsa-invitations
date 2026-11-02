import { Button } from "@/components/ui/button";
import { ArrowRight, RotateCcw, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyCueProps {
  label: string;
  ariaLabel: string;
  accent?: string;
  background?: string;
  ink?: string;
  rtl?: boolean;
  reducedMotion?: boolean;
  onAdvance: () => void;
  className?: string;
}

/**
 * The single Continue flourish at the bottom of the journey. On the public
 * page it carries the guest to the next section and is replaced once the end
 * is close; in the studio's guest preview it is the only control.
 */
export function JourneyCue({
  label,
  ariaLabel,
  accent = "#710014",
  background,
  ink = "#161616",
  rtl,
  reducedMotion = false,
  onAdvance,
  className,
}: JourneyCueProps) {
  const [pressed, setPressed] = useState(false);
  const isActive = !reducedMotion && pressed;

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-7 flex justify-center py-6",
        className,
      )}
    >
      <Button
        onClick={onAdvance}
        variant="ghost"
        aria-label={ariaLabel}
        className="group relative flex items-center gap-3 rounded-2xl px-5 py-4 text-base
                   font-semibold tracking-wide
                   transition-colors duration-200 ease-out
                   hover:bg-[var(--ink-soft)] active:scale-[0.98]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                   disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: background ?? "transparent", color: ink }}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-300",
            isActive ? "scale-90" : "group-hover:scale-105",
          )}
          style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
        >
          {isActive ? (
            <Pause className="h-4 w-4" style={{ color: accent }} />
          ) : (
            <Play className="h-4 w-4 ml-0.5" style={{ color: accent }} />
          )}
        </span>
        <span
          className={cn(
            "transition-colors duration-200",
            pressed ? "opacity-0" : "opacity-100 group-hover:opacity-100",
          )}
        >
          {label}
        </span>
        <ArrowRight
          className={cn(
            "ml-1 h-4 w-4 shrink-0 transition-transform duration-300",
            rtl ? "rotate-180" : "rotate-0",
            pressed && "translate-x-1",
          )}
          style={{ color: accent }}
        />
      </Button>
    </div>
  );
}
