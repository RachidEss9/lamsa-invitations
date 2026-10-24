import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-ui text-[0.66rem] font-medium uppercase tracking-[0.14em] transition-[background-color,color,box-shadow,transform,border-color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-[var(--red)] bg-[var(--red)] text-[#f2f1ed] hover:bg-[#8a0318] hover:border-[#8a0318]",
        destructive:
          "border border-[var(--red)] bg-[var(--red)] text-[#f2f1ed] hover:bg-[var(--red)]/90",
        outline:
          "border border-ink/30 bg-transparent text-foreground hover:border-ink hover:bg-ink hover:text-background",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground hover:bg-accent",
        ghost:
          "border border-transparent text-foreground hover:bg-ink/[0.06]",
        subtle:
          "border border-ink/18 bg-[#f7f6f2] text-ink hover:border-ink/35 hover:bg-[#efeae0]",
        link: "text-[var(--red)] underline underline-offset-4 hover:text-[#8a0318]",
      },
      size: {
        default: "h-8.5 px-4 has-[>svg]:px-3",
        sm: "h-7.5 gap-1.5 px-3 has-[>svg]:px-2",
        md: "h-9 px-4 has-[>svg]:px-3",
        lg: "h-10.5 px-5 has-[>svg]:px-4",
        icon: "size-7.5",
        "icon-sm": "size-6.5",
        "icon-lg": "size-8.5",
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
