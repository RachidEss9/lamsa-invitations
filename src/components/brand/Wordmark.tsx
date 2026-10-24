import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

export type WordmarkTone = "crimson" | "ink" | "paper";

/** The supplied logo set: one lockup per surface, never recoloured inline. */
const LOCKUP: Record<WordmarkTone, string> = {
  crimson: brand.logos.lockupCrimson,
  ink: brand.logos.lockupInk,
  paper: brand.logos.lockupPaper,
};

const WORDMARK: Record<WordmarkTone, string> = {
  crimson: brand.logos.wordmarkCrimson,
  ink: brand.logos.wordmarkInk,
  paper: brand.logos.wordmarkPaper,
};

const SYMBOL: Record<WordmarkTone, string> = {
  crimson: brand.logos.symbolCrimson,
  ink: brand.logos.symbolInk,
  paper: brand.logos.symbolPaper,
};

/**
 * The studio logo: the LAMSA lockup (arch symbol + lowercase wordmark), taken
 * from the brand SVG set so navigation, editor and public pages all carry the
 * same mark. Sizing is height-based; the artwork keeps its own aspect ratio.
 */
export function Wordmark({
  className,
  tone = "crimson",
}: {
  className?: string;
  tone?: WordmarkTone;
}) {
  return (
    <img
      src={LOCKUP[tone]}
      alt={brand.name}
      draggable={false}
      className={cn(
        "block h-[26px] w-auto shrink-0 select-none",
        className,
      )}
    />
  );
}

export function BrandLink({
  className,
  tone = "crimson",
}: {
  className?: string;
  tone?: WordmarkTone;
}) {
  return (
    <Link
      to="/"
      className={cn(
        "group inline-flex flex-col justify-center transition-opacity hover:opacity-70",
        className,
      )}
      aria-label="LAMSA home"
    >
      <Wordmark
        tone={tone}
        className="h-[24px] transition-transform duration-300 group-hover:-translate-y-px sm:h-[27px]"
      />
      <span
        className={cn(
          "eyebrow mt-1 hidden text-[0.48rem] tracking-[0.28em] sm:block",
          tone === "paper" ? "text-[#f7f2e5]/45" : "text-muted-foreground/80",
        )}
      >
        Atelier
      </span>
    </Link>
  );
}

/** The arch symbol alone, for compact headers, tabs, and app corners. */
export function BrandSymbol({
  className,
  tone = "crimson",
}: {
  className?: string;
  tone?: WordmarkTone;
}) {
  return (
    <img
      src={SYMBOL[tone]}
      alt=""
      aria-hidden
      draggable={false}
      className={cn(
        "block h-[14px] w-auto shrink-0 select-none",
        className,
      )}
    />
  );
}

/** The wordmark alone, for dense UIs that already have an icon somewhere. */
export function BrandWordmark({
  className,
  tone = "crimson",
}: {
  className?: string;
  tone?: WordmarkTone;
}) {
  return (
    <img
      src={WORDMARK[tone]}
      alt={brand.name}
      draggable={false}
      className={cn(
        "block h-[13px] w-auto shrink-0 select-none tracking-tight",
        className,
      )}
    />
  );
}
