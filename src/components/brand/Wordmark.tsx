import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

/**
 * Typographic wordmark placeholder. LAMSA's official logo is still pending;
 * this intentionally does not imitate or invent one.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-ui inline-block text-[0.82rem] font-medium uppercase leading-none tracking-[0.42em] text-foreground",
        className,
      )}
      aria-label={brand.name}
    >
      {brand.name}
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
        "inline-flex items-baseline gap-2 transition-opacity hover:opacity-70",
        tone === "paper" ? "text-[#f8f3e8]" : "text-foreground",
        className,
      )}
      aria-label="LAMSA home"
    >
      <Wordmark className={tone === "paper" ? "text-[#f8f3e8]" : undefined} />
      <span
        className={cn(
          "size-[3px] rounded-full",
          tone === "paper" ? "bg-[#c6b692]" : "bg-[var(--gold)]",
        )}
      />
    </Link>
  );
}
