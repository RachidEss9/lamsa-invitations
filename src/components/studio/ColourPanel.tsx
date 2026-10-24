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
    return { label: `${element.name} · text`, field: "color" as const, value: element.color ?? "#161616" };
  }
  if (element.kind === "shape") {
    return { label: `${element.name} · fill`, field: "fill" as const, value: element.fill ?? "#161616" };
  }
  return { label: `${element.name} · ink`, field: "color" as const, value: element.color ?? "#161616" };
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
        className={cn(
          "block h-7 w-full border transition-transform hover:scale-[1.04]",
          active ? "border-[var(--red)] ring-1 ring-[var(--red)]" : "border-ink/20",
        )}
        style={{ background: value }}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${value}`}
          className="absolute -right-1 -top-1 hidden size-3.5 place-items-center rounded-full bg-ink text-[#f2f1ed] group-hover:grid"
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
    if (element) onPatch(element.id, { [target.field]: colour } as Partial<DesignElement>);
    else onPagePatch({ background: colour });
    setRecent(rememberColour(colour));
    setDraft(null);
  };

  const groups = useMemo(
    () => PALETTE_GROUPS.filter((name) => PALETTES.some((palette) => palette.group === name)),
    [],
  );
  const shown = PALETTES.filter((palette) => palette.group === group);

  return (
    <div className="pb-4">
      <div className="border-b border-ink/12 px-4 py-3">
        <p className="font-meta text-[9px] uppercase tracking-[0.2em] text-ink/40">
          Colour
        </p>
        <p className="mt-1 truncate text-[11px] text-ink/70">{target.label}</p>
      </div>

      <div className="space-y-2 border-b border-ink/12 p-3">
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={safe}
            onChange={(event) => apply(event.target.value)}
            aria-label="Colour picker"
            className="size-8 shrink-0 cursor-pointer border border-ink/20 bg-transparent p-0"
          />
          <input
            value={value}
            onChange={(event) => setDraft({ key: targetKey, value: event.target.value })}
            onBlur={() => {
              if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())) apply(value.trim());
              else setDraft(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            aria-label="Hex colour"
            className="h-8 min-w-0 flex-1 border border-ink/20 bg-transparent px-2 font-meta text-[10px] uppercase tracking-[0.08em]"
          />
          <button
            type="button"
            onClick={() => setSaved(saveColour(current))}
            title="Save this colour"
            className="grid size-8 shrink-0 place-items-center border border-ink/20 text-ink/60 hover:border-ink hover:text-ink"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => apply(current)}
          className="h-7 w-full border border-ink/20 text-[9px] uppercase tracking-[0.12em] text-ink/60 hover:border-ink hover:text-ink"
        >
          Apply to {element ? target.label.split(" · ")[1] ?? "layer" : "page"}
        </button>
      </div>

      {saved.length > 0 && (
        <div className="border-b border-ink/12 p-3">
          <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
            Saved colours
          </p>
          <div className="grid grid-cols-8 gap-1">
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
        </div>
      )}

      <div className="border-b border-ink/12 p-3">
        <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
          Your palettes
        </p>
        <div className="flex items-center gap-2">
          <span className="flex overflow-hidden border border-ink/15">
            {[derivedPalette.paper, derivedPalette.ink, derivedPalette.accent].map(
              (colour) => (
                <span
                  key={colour}
                  className="block size-5"
                  style={{ background: colour }}
                  title={colour}
                />
              ),
            )}
          </span>
          <span className="text-[9px] text-ink/40">from this page</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            value={paletteName}
            onChange={(event) => setPaletteName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const name = paletteName.trim();
              if (!name) return;
              setCustomPalettes((current) =>
                writeSavedPalettes(
                  upsertSavedPalette(current, {
                    id: makeId("palette"),
                    name,
                    ...derivedPalette,
                  }),
                ),
              );
              setPaletteName("");
            }}
            placeholder="Name this palette"
            aria-label="Palette name"
            maxLength={60}
            className="h-7 min-w-0 flex-1 border border-ink/20 bg-transparent px-2 text-[10px] outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => {
              const name =
                paletteName.trim() || `My palette ${customPalettes.length + 1}`;
              setCustomPalettes((current) =>
                writeSavedPalettes(
                  upsertSavedPalette(current, {
                    id: makeId("palette"),
                    name,
                    ...derivedPalette,
                  }),
                ),
              );
              setPaletteName("");
            }}
            className="shrink-0 border border-ink/20 px-2 text-[8px] uppercase tracking-[0.1em] text-ink/60 hover:border-ink hover:text-ink"
          >
            Save
          </button>
        </div>
        {customPalettes.length > 0 && (
          <ul className="mt-2 divide-y divide-ink/10 border border-ink/10">
            {customPalettes.map((palette) => (
              <li key={palette.id} className="flex items-center gap-1 px-1.5 py-1">
                <span className="flex shrink-0 overflow-hidden border border-ink/10">
                  {[palette.paper, palette.ink, palette.accent].map((colour) => (
                    <span
                      key={colour}
                      className="block size-3.5"
                      style={{ background: colour }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-ink/70">
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
                  className="shrink-0 border border-ink/20 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-ink/60 hover:border-ink hover:text-ink"
                >
                  Apply
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${palette.name}`}
                  onClick={() =>
                    setCustomPalettes((current) =>
                      writeSavedPalettes(removeSavedPalette(current, palette.id)),
                    )
                  }
                  className="shrink-0 p-0.5 text-ink/35 hover:text-[var(--red)]"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recent.length > 0 && (
        <div className="border-b border-ink/12 p-3">
          <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
            Recent
          </p>
          <div className="grid grid-cols-7 gap-1">
            {recent.map((colour) => (
              <Swatch key={colour} value={colour} onPick={() => apply(colour)} label={colour} />
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-ink/12 px-3 py-2">
        <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
          Palettes
        </p>
        <div className="flex flex-wrap gap-1">
          {groups.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setGroup(name)}
              className={cn(
                "border px-1.5 py-1 text-[8px] uppercase tracking-[0.08em]",
                group === name
                  ? "border-ink bg-ink text-[#f2f1ed]"
                  : "border-ink/15 text-ink/55 hover:border-ink",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 p-3">
        {shown.map((palette) => (
          <div key={palette.id} className="border border-ink/12 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[10px] text-ink/70">{palette.name}</span>
              <button
                type="button"
                onClick={() => onApplyPalette(palette)}
                className="shrink-0 border border-ink/20 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-ink/60 hover:border-ink hover:text-ink"
              >
                Apply all
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
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

      <div className="border-t border-ink/12 p-3">
        <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
          Page washes
        </p>
        <div className="grid grid-cols-2 gap-1">
          {GRADIENT_PRESETS.map((gradient) => (
            <button
              key={gradient.id}
              type="button"
              onClick={() => {
                onPagePatch({ background: gradient.value });
                setRecent(rememberColour(gradient.value));
              }}
              className={cn(
                "flex h-9 items-end border px-1.5 pb-1 text-[8px] uppercase tracking-[0.08em]",
                page.background === gradient.value
                  ? "border-[var(--red)] text-ink"
                  : "border-ink/15 text-ink/60 hover:border-ink",
              )}
              style={{ background: gradient.value }}
            >
              {gradient.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[9px] leading-relaxed text-ink/35">
          Apply all remaps the design's dominant ink and accent, leaving photographs
          and hand-picked colours alone. Single swatches only touch the selected layer.
        </p>
      </div>
    </div>
  );
}
