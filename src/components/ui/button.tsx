import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-ui text-[0.66rem] font-medium uppercase tracking-[0.14em] transition-[background-color,color,box-shadow,transform,border-color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary text-primary-foreground hover:bg-[#ac3113] hover:border-[#ac3113]",
        destructive:
          "border border-destructive bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-ink/30 bg-transparent text-foreground hover:border-ink hover:bg-ink hover:text-background",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground hover:bg-accent",
        ghost:
          "border border-transparent text-foreground hover:bg-ink/[0.06]",
        link: "text-primary underline underline-offset-4 hover:text-ink",
      },
      size: {
        default: "h-10 px-4 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 px-6 has-[>svg]:px-5",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function ButtonPrototype({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {  const Comp = asChild ? Slot : "button"
  const ButtonInner = Comp

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


