import { Button } from "@/components/ui/button";
import { makeId, type DesignElement, type DesignPage } from "@/lib/design";
import {
  GRADIENT_PRESETS,
  PALETTES,
  PALETTE_GROUPS,
  paletteFromPage,
  readRecentColours,
  readSavedColours,
  readSavedPalettes,
  rememberColour,
  removeSavedColour,
  removeSavedPalette,
  saveColour,
  upsertSavedPalette,
  writeSavedPalettes,
  type ColourPalette,
  type SavedPalette,
} from "@/lib/palettes";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

interface ColourPanelProps {
  page: DesignPage;
  selected: DesignElement[];
  onPatch: (id: string, patch: Partial<DesignElement>) => void;
  onPagePatch: (patch: Partial<DesignPage>) => void;
  onApplyPalette: (palette: ColourPalette) => void;
}

/** Which colour a swatch writes to, based on the current selection. */
function colourTarget(element: DesignElement | null) {
  if (!element) {
    return { label: "Page background", field: "background" as const, value: "" };
  }
  if (element.kind === "text") {
    return {
      label: `${element.name} · text`,
      field: "color" as const,
      value: element.color ?? "#161616",
    };
  }
  if (element.kind === "shape") {
    return {
      label: `${element.name} · fill`,
      field: "fill" as const,
      value: element.fill ?? "#161616",
    };
  }
  return {
    label: `${element.name} · ink`,
    field: "color" as const,
    value: element.color ?? "#161616",
  };
}

function Swatch({
  value,
  active,
  onPick,
  onRemove,
  label,
}: {
  value: string;
  active?: boolean;
  onPick: () => void;
  onRemove?: () => void;
  label?: string;
}) {
  return (
    <span className="group relative block">
      <button
        type="button"
        onClick={onPick}
        title={label ?? value}
        aria-label={label ?? `Use ${value}`}
        data-selected={active ? "true" : undefined}
        className="swatch-dot aspect-square w-full"
        style={{ background: value }}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${value}`}
          className="absolute -top-1 -right-1 hidden size-3.5 place-items-center rounded-full bg-ink text-[var(--paper-light)] group-hover:grid group-focus-within:grid"
        >
          <X className="size-2.5" />
        </button>
      )}
    </span>
  );
}

export function ColourPanel({
  page,
  selected,
  onPatch,
  onPagePatch,
  onApplyPalette,
}: ColourPanelProps) {
  const element = selected.length === 1 ? selected[0] : null;
  const target = colourTarget(element);
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null);
  const [saved, setSaved] = useState<string[]>(() => readSavedColours());
  const [recent, setRecent] = useState<string[]>(() => readRecentColours());
  const [group, setGroup] = useState<string>("Luxury");
  const [customPalettes, setCustomPalettes] = useState<SavedPalette[]>(() =>
    readSavedPalettes(),
  );
  const [paletteName, setPaletteName] = useState("");
  const derivedPalette = useMemo(() => paletteFromPage(page), [page]);

  const current = target.value || page.background;
  const safe = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(current) ? current : "#f2f1ed";
  // The hex field follows the selection, and only keeps a draft for the exact
  // layer it was typed into, so switching layers never carries text over.
  const targetKey = element ? `${element.id}:${target.field}` : `page:${page.id}`;
  const value = draft && draft.key === targetKey ? draft.value : current;

  const apply = (colour: string) => {
    if (element) {
      onPatch(element.id, { [target.field]: colour } as Partial<DesignElement>);
    } else {
      onPagePatch({ background: colour });
    }
    setRecent(rememberColour(colour));
    setDraft(null);
  };

  const savePalette = (name: string) => {
    setCustomPalettes((existing) =>
      writeSavedPalettes(
        upsertSavedPalette(existing, {
          id: makeId("palette"),
          name,
          ...derivedPalette,
        }),
      ),
    );
    setPaletteName("");
  };

  const groups = useMemo(
    () =>
      PALETTE_GROUPS.filter((name) =>
        PALETTES.some((palette) => palette.group === name),
      ),
    [],
  );
  const shown = PALETTES.filter((palette) => palette.group === group);

  return (
    <div className="pb-4">
      <div className="border-b border-[var(--edge)] px-4 py-3">
        <p className="section-label">Colour</p>
        <p className="mt-1 truncate font-ui text-[0.7rem] text-ink/65">
          {target.label}
        </p>
      </div>

      <div className="space-y-2 border-b border-[var(--edge)] p-3">
        <div className="flex items-center gap-1.5">
          <label
            className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-full border border-[var(--edge)] shadow-[var(--shadow-xs)]"
            style={{ background: safe }}
            title="Open the colour picker"
          >
            <span className="sr-only">Colour picker</span>
            <input
              type="color"
              value={safe}
              onChange={(event) => apply(event.target.value)}
              aria-label="Colour picker"
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
          <input
            value={value}
            onChange={(event) =>
              setDraft({ key: targetKey, value: event.target.value })
            }
            onBlur={() => {
              if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())) {
                apply(value.trim());
              } else {
                setDraft(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            aria-label="Hex colour"
            className="field-compact h-8 flex-1 rounded-full px-2.5 font-meta text-[10px] uppercase tracking-[0.08em]"
          />
          <button
            type="button"
            onClick={() => setSaved(saveColour(current))}
            title="Save this colour"
            aria-label="Save this colour"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--edge)] bg-[var(--surface-card)] text-ink/60 shadow-[var(--shadow-xs)] transition-[border-color,color] hover:border-[var(--edge-strong)] hover:text-ink"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => apply(current)}
          className="pressable h-8 w-full rounded-full border border-[var(--edge)] bg-[var(--surface-card)] font-ui text-[0.66rem] font-medium text-ink/70 shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--edge-strong)] hover:text-ink"
        >
          Apply to{" "}
          {element ? target.label.split(" · ")[1] ?? "layer" : "page"}
        </button>
      </div>

      {saved.length > 0 && (
        <section className="border-b border-[var(--edge)] p-3">
          <p className="section-label mb-2">Saved colours</p>
          <div className="grid grid-cols-7 gap-1.5">
            {saved.map((colour) => (
              <Swatch
                key={colour}
                value={colour}
                active={colour.toLowerCase() === current.toLowerCase()}
                onPick={() => apply(colour)}
                onRemove={() => setSaved(removeSavedColour(colour))}
                label={colour}
              />
            ))}
          </div>
        </section>
      )}

      <section className="border-b border-[var(--edge)] p-3">
        <p className="section-label mb-2">Your palettes</p>
        <div className="flex items-center gap-2">
          <span className="flex shrink-0 -space-x-1.5">
            {[derivedPalette.paper, derivedPalette.ink, derivedPalette.accent].map(
              (colour) => (
                <span
                  key={colour}
                  className="swatch-dot size-5 border border-[var(--paper-light)]"
                  style={{ background: colour }}
                  title={colour}
                />
              ),
            )}
          </span>
          <span className="font-ui text-[0.62rem] text-ink/45">from this page</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            value={paletteName}
            onChange={(event) => setPaletteName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const name = paletteName.trim();
              if (!name) return;
              savePalette(name);
            }}
            placeholder="Name this palette"
            aria-label="Palette name"
            maxLength={60}
            className="field-compact h-7 flex-1"
          />
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={() => {
              const name =
                paletteName.trim() || `My palette ${customPalettes.length + 1}`;
              savePalette(name);
            }}
          >
            Save
          </Button>
        </div>
        {customPalettes.length > 0 && (
          <ul className="mt-2 space-y-1">
            {customPalettes.map((palette) => (
              <li
                key={palette.id}
                className="flex items-center gap-1.5 rounded-full border border-[var(--edge)] bg-[var(--surface-card)] py-1 pr-1 pl-1.5"
              >
                <span className="flex shrink-0 -space-x-1">
                  {[palette.paper, palette.ink, palette.accent].map((colour) => (
                    <span
                      key={colour}
                      className="swatch-dot size-3.5 border border-[var(--paper-light)]"
                      style={{ background: colour }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1 truncate font-ui text-[0.68rem] text-ink/70">
                  {palette.name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onApplyPalette({
                      id: palette.id,
                      name: palette.name,
                      group: "Yours",
                      paper: palette.paper,
                      ink: palette.ink,
                      accent: palette.accent,
                    })
                  }
                  className="shrink-0 rounded-full px-2 py-0.5 font-ui text-[0.6rem] font-medium text-ink/60 transition-colors hover:bg-ink/[0.06] hover:text-ink"
                >
                  Apply
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${palette.name}`}
                  onClick={() =>
                    setCustomPalettes((existing) =>
                      writeSavedPalettes(removeSavedPalette(existing, palette.id)),
                    )
                  }
                  className="grid size-6 shrink-0 place-items-center rounded-full text-ink/40 transition-colors hover:bg-[var(--red)]/[0.07] hover:text-[var(--red)]"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section className="border-b border-[var(--edge)] p-3">
          <p className="section-label mb-2">Recent</p>
          <div className="grid grid-cols-7 gap-1.5">
            {recent.map((colour) => (
              <Swatch
                key={colour}
                value={colour}
                active={colour.toLowerCase() === current.toLowerCase()}
                onPick={() => apply(colour)}
                label={colour}
              />
            ))}
          </div>
        </section>
      )}

      <section className="border-b border-[var(--edge)] px-3 py-2.5">
        <p className="section-label mb-2">Palettes</p>
        <div className="flex flex-wrap gap-1.5">
          {groups.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={group === name}
              onClick={() => setGroup(name)}
              className="chip h-6 px-2 text-[0.6rem]"
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-2 p-3">
        {shown.map((palette) => (
          <div
            key={palette.id}
            className="rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-card)] p-2 shadow-[var(--shadow-xs)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-ui text-[0.7rem] font-medium text-ink/80">
                {palette.name}
              </span>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => onApplyPalette(palette)}
                className="h-6 px-2 text-[0.56rem]"
              >
                Apply all
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[palette.paper, palette.ink, palette.accent].map((colour) => (
                <Swatch
                  key={colour}
                  value={colour}
                  active={colour.toLowerCase() === current.toLowerCase()}
                  onPick={() => apply(colour)}
                  label={`${palette.name} · ${colour}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="border-t border-[var(--edge)] p-3">
        <p className="section-label mb-2">Page washes</p>
        <div className="grid grid-cols-2 gap-1.5">
          {GRADIENT_PRESETS.map((gradient) => (
            <button
              key={gradient.id}
              type="button"
              onClick={() => {
                onPagePatch({ background: gradient.value });
                setRecent(rememberColour(gradient.value));
              }}
              aria-pressed={page.background === gradient.value}
              className={cn(
                "flex h-10 min-w-0 items-end justify-between gap-1.5 rounded-[var(--radius-control)] border px-2 pb-1 text-left font-ui text-[0.58rem] uppercase tracking-[0.08em] transition-[border-color,box-shadow]",
                page.background === gradient.value
                  ? "border-[var(--red)] ring-1 ring-[var(--red)]"
                  : "border-[var(--edge)] hover:border-[var(--edge-strong)]",
              )}
              style={{ background: gradient.value }}
            >
              <span className="truncate text-ink/75">{gradient.name}</span>
              <span className="shrink-0 font-meta text-[0.52rem] text-ink/45">
                use
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 font-ui text-[0.62rem] leading-relaxed text-ink/40">
          Apply all remaps the design's dominant ink and accent, leaving
          photographs and hand-picked colours alone. Single swatches only touch
          the selected layer.
        </p>
      </section>
    </div>
  );
}
