import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

/**
 * The wordmark is set in type: LAMSA in the display serif, tracked wide,
 * with a vermilion register mark. No invented logo.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display inline-flex items-baseline gap-[0.18em] text-[1.28rem] leading-none tracking-[0.16em] text-foreground",
        className,
      )}
      aria-label={brand.name}
    >
      {brand.name}
      <span
        aria-hidden
        className="mb-[0.55em] size-[4px] shrink-0 bg-[var(--red)]"
      />
    </span>
  );
}

export function BrandLink({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "paper";
}) {
  return (
    <Link
      to="/"
      className={cn(
        "group inline-flex flex-col justify-center transition-opacity hover:opacity-70",
        tone === "paper" ? "text-[#f7f2e5]" : "text-foreground",
        className,
      )}
      aria-label="LAMSA home"
    >
      <Wordmark
        className={cn(
          tone === "paper" ? "text-[#f7f2e5]" : undefined,
        )}
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
