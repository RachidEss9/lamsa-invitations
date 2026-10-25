import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The shared text field. Dense panels, dialogs and the library search all use
 * this control: ivory fill, hairline border, champagne focus ring.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-ink/35 selection:bg-[var(--red)] selection:text-[#f8f4ea] h-9 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--edge)] bg-[var(--surface-card)] px-2.5 py-1 font-ui text-[0.85rem] text-ink shadow-[var(--shadow-xs)] transition-[color,border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[var(--gold)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/25",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
