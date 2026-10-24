import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface FieldRowProps {
  label: string
  children: ReactNode
  className?: string
}

export function FieldRow({ label, children, className }: FieldRowProps) {
  return (
    <label className={cn("flex items-center justify-between gap-3", className)}>
      <span className="shrink-0 text-[11px] text-ink/60">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  )
}
