import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 font-ui text-[0.62rem] font-medium tracking-[0.02em] transition-[color,box-shadow] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40 [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--red)] text-[#f8f4ea] [a&]:hover:bg-[#8a0318]",
        secondary:
          "border-[var(--edge)] bg-[var(--secondary)] text-ink [a&]:hover:bg-[var(--accent)]",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-[var(--edge)] bg-transparent text-ink/70 [a&]:hover:bg-[var(--accent)] [a&]:hover:text-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
