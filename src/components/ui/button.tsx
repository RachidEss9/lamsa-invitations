import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The one button in LAMSA: a soft pill, set in Montserrat, with a single
 * burgundy primary and quiet ivory secondaries. States are shared by every
 * variant so a dialog footer, a toolbar action and a dashboard CTA read as the
 * same product.
 */
const buttonVariants = cva(
  "pressable inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border font-ui text-[0.66rem] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,border-color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--red)] text-[#f8f4ea] shadow-[0_1px_1px_rgba(26,25,23,0.12)] hover:bg-[#8a0318]",
        destructive:
          "border-transparent bg-[var(--red)] text-[#f8f4ea] hover:bg-[#8a0318]",
        outline:
          "border-[var(--edge-strong)] bg-transparent text-ink hover:border-ink hover:bg-ink/[0.05]",
        secondary:
          "border-[var(--edge)] bg-[var(--secondary)] text-ink hover:bg-[var(--accent)]",
        ghost:
          "border-transparent text-ink/70 hover:bg-ink/[0.055] hover:text-ink",
        subtle:
          "border-[var(--edge)] bg-[var(--surface-card)] text-ink shadow-[var(--shadow-xs)] hover:border-[var(--edge-strong)] hover:bg-[var(--surface-overlay)]",
        link: "border-transparent text-[var(--red)] underline underline-offset-4 hover:text-[#8a0318]",
      },
      size: {
        default: "h-8 px-3.5 has-[>svg]:px-3",
        sm: "h-7 gap-1 px-2.5 text-[0.6rem] has-[>svg]:px-2",
        md: "h-9 px-4 has-[>svg]:px-3.5",
        lg: "h-10 px-5 text-[0.7rem] has-[>svg]:px-4",
        icon: "size-7.5 p-0",
        "icon-sm": "size-6.5 p-0",
        "icon-lg": "size-8.5 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
