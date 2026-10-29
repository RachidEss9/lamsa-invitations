import { FieldRow } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useRef, useState, type ReactNode } from "react";

/**
 * The field primitives the right-hand inspector is built from.
 *
 * They live here, not inside the inspector, so a contextual panel such as the
 * Image Studio draws its inputs with exactly the same type, heights, borders
 * and focus treatment as the rest of the panel. One design system, one place
 * it is written down.
 */

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <FieldRow label={label}>
      {children}
    </FieldRow>
  );
}

export const numberInput =
  "h-8 rounded-none border-ink/20 bg-transparent px-2 text-right text-[11px] tabular-nums shadow-none focus-visible:border-ink focus-visible:ring-0";

export function NumberField({
  value,
  onChange,
  step = 1,
  min,
  max,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  /** Arrow-key increment, so a value can be nudged without retyping it. */
  step?: number;
  min?: number;
  max?: number;
  ariaLabel?: string;
  /** Panel-specific sizing; the type, focus ring and behaviour stay shared. */
  className?: string;
}) {
  /* While the field is being typed, the raw keystrokes are shown verbatim.
     A controlled number input would round and clamp on every keystroke, which
     swallows the decimal point in "12.5" and turns a cleared field into 0 —
     so the draft is only parsed when it actually parses, and normalised on
     blur. Escape puts the committed value back. */
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (next: number) => {
    let result = next;
    if (typeof min === "number") result = Math.max(min, result);
    if (typeof max === "number") result = Math.min(max, result);
    return result;
  };
  const commit = (raw: string) => {
    const parsed = Number(raw.trim());
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onChange(clamp(parsed));
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      value={draft ?? String(Math.round(value * 100) / 100)}
      aria-label={ariaLabel}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        commit(raw);
      }}
      onBlur={() => {
        if (draft !== null) commit(draft);
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(null);
          return;
        }
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const typed = draft !== null ? Number(draft.trim()) : NaN;
          const base = draft !== null && Number.isFinite(typed) ? typed : value;
          const delta = (event.key === "ArrowUp" ? 1 : -1) * step;
          const next = clamp(Math.round((base + delta) * 1000) / 1000);
          setDraft(String(next));
          onChange(next);
        }
      }}
      className={cn(numberInput, "w-full", className)}
    />
  );
}

export function ColorField({
  value,
  onChange,
  allowTransparent,
  label = "Choose colour",
}: {
  value: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#161616";
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={label}
        className="size-8 shrink-0 border border-ink/20"
        style={{
          background:
            value === "transparent"
              ? "repeating-conic-gradient(#d8d5cb 0% 25%, #f2f1ed 0% 50%) 50% / 8px 8px"
              : safe,
        }}
      />
      <input
        ref={inputRef}
        type="color"
        value={safe}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} HEX`}
        className={cn(numberInput, "text-left")}
      />
      {allowTransparent && (
        <button
          type="button"
          onClick={() => onChange("transparent")}
          className="shrink-0 border border-ink/20 px-1.5 py-1 text-[9px] uppercase tracking-[0.1em] text-ink/60"
        >
          None
        </button>
      )}
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-ink/60">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
    </div>
  );
}

/**
 * The Fill / Fit choice, as the two-button pair the studio uses everywhere a
 * single value has to be picked from a short list.
 */
export function SegmentedRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Row label={label}>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.hint}
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "h-7 flex-1 border px-1 text-[9px] uppercase tracking-[0.08em] transition-colors",
              value === option.id
                ? "border-ink bg-ink text-[#f2f1ed]"
                : "border-ink/15 text-ink/60 hover:border-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Row>
  );
}
