import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BUILTIN_ASSETS,
  BUILTIN_ASSET_CATEGORIES,
  type BuiltinAsset,
} from "@/lib/assets";
import { PAGE_LAYOUTS } from "@/lib/layouts";
import {
  FRAMES,
  FRAME_GROUPS,
  type FrameGroup,
  type FrameSpec,
} from "@/lib/frames";
import { FrameThumb } from "@/components/invitation/FrameArt";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { Motif } from "@/components/invitation/Motif";
import { REVEAL_PRESETS, type RevealPreset } from "@/lib/reveals";
import { BUILTIN_STYLES, type BuiltinStyle } from "@/lib/styles";
import { FONT_LIBRARY, fontById, fontSamples } from "@/lib/fonts";
import { TEMPLATES, type InvitationTemplate } from "@/lib/invitation";
import { OPENING_EXPERIENCES } from "@/lib/design";
import type { ShapeKind } from "@/lib/design";
import { PALETTES, PALETTE_GROUPS, type ColourPalette } from "@/lib/palettes";
import { paletteSwatches as deriveSwatches } from "@/lib/library-colour";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  Brush,
  Frame as FrameIcon,
  Eye,
  Film,
  LayoutTemplate,
  Palette,
  Save,
  Search,
  Shapes,
  Sparkle,
  Star,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  favouriteKey,
  readFavourites,
  toggleFavouriteKey,
  writeFavourites,
} from "@/lib/library-favourites";
import {
  describeTypeStyle,
  extractTypeStyle,
  type TypeStyle,
} from "@/lib/type-styles";
import {
  makeElement,
  makeId,
  defaultAnimation,
  type DesignDocument,
  type DesignElement,
  type DesignPage,
  type ElementAnimation,
  type OpeningSettings,
} from "@/lib/design";

/* -------------------------------------------------------------------------- */
/* Shape preview                                                              */
/* -------------------------------------------------------------------------- */

export function ShapePreview({
  shape,
  fill,
  stroke,
}: {
  shape: ShapeKind;
  fill?: string;
  stroke?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {shape === "rect" || shape === "frame" || shape === "capsule" ? (
        <rect
          x={shape === "frame" ? 14 : 6}
          y={shape === "frame" ? 14 : 6}
          width={shape === "frame" ? 72 : 88}
          height={shape === "frame" ? 72 : 88}
          rx={shape === "capsule" ? 44 : shape === "frame" ? 8 : 2}
          fill={shape === "frame" ? "transparent" : fill ?? "var(--red)"}
          stroke={shape === "frame" ? stroke ?? fill ?? "var(--red)" : undefined}
          strokeWidth={shape === "frame" ? 2 : 0}
        />
      ) : shape === "ellipse" ? (
        <ellipse
          cx={50}
          cy={50}
          rx={44}
          ry={44}
          fill={fill ?? "var(--red)"}
          stroke={stroke}
          strokeWidth={stroke ? 2 : 0}
        />
      ) : shape === "line" ? (
        <line
          x1={10}
          y1={50}
          x2={90}
          y2={50}
          stroke={fill ?? "var(--red)"}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ) : (
        <path
          d={
            shape === "triangle"
              ? "M50 8 L94 92 L6 92 Z"
              : shape === "diamond"
                ? "M50 6 L94 50 L50 94 L6 50 Z"
                : shape === "hexagon"
                  ? "M30 6 L70 6 L94 50 L70 94 L30 94 L6 50 Z"
                  : shape === "heart"
                    ? "M50 89 C22 69 4 52 4 34 C4 18 16 8 30 8 C40 8 47 14 50 22 C53 14 60 8 70 8 C84 8 96 18 96 34 C96 52 78 69 50 89 Z"
                    : shape === "arch"
                      ? "M6 97 L6 47 C6 23 26 4 50 4 C74 4 94 23 94 47 L94 97 Z"
                      : shape === "leaf"
                        ? "M50 3 C84 20 95 55 50 97 C5 55 16 20 50 3 Z"
                        : shape === "star"
                          ? "M50 3 L61.8 36.5 L97 38.2 L69.3 59.8 L78.5 94 L50 74.2 L21.5 94 L30.7 59.8 L3 38.2 L38.2 36.5 Z"
                          : shape === "shield"
                            ? "M50 3 C68 12 84 14 96 14 L96 48 C96 76 76 92 50 98 C24 92 4 76 4 48 L4 14 C16 14 32 12 50 3 Z"
                            : shape === "scallop"
                              ? "M50 3 C60 3 68 8 73 14 C81 11 91 15 95 24 C99 32 96 41 92 47 C97 54 97 65 91 72 C93 81 86 90 77 92 C72 98 62 100 55 96 C50 100 42 100 37 96 C30 100 20 98 15 92 C6 90 -1 81 1 72 C-5 65 -5 54 0 47 C-4 41 -7 32 -3 24 C1 15 11 11 19 14 C24 8 32 3 42 3 Z"
                              : "M50 8 L94 92 L6 92 Z"
          }
          fill={fill ?? "var(--red)"}
          stroke={stroke}
          strokeWidth={stroke ? 2 : 0}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Library categories                                                         */
/* -------------------------------------------------------------------------- */

export type LibraryTab =
  | "templates"
  | "saved"
  | "colours"
  | "type"
  | "styles"
  | "assets"
  | "frames"
  | "layouts"
  | "reveals"
  | "opening";

interface CategorySpec {
  id: LibraryTab;
  label: string;
  icon: LucideIcon;
  blurb: string;
  placeholder: string;
}

const CATEGORIES: CategorySpec[] = [
  {
    id: "templates",
    label: "Templates",
    icon: LayoutTemplate,
    blurb: "Finished designs, ready to restyle with your own words.",
    placeholder: "Search templates…",
  },
  {
    id: "saved",
    label: "Saved",
    icon: Bookmark,
    blurb: "Your own templates and type styles, kept with this account.",
    placeholder: "Search your saved designs…",
  },
  {
    id: "colours",
    label: "Colours",
    icon: Palette,
    blurb: "Curated palettes and single swatches for layer or page.",
    placeholder: "Search champagne, zellige, ink…",
  },
  {
    id: "type",
    label: "Type",
    icon: Type,
    blurb: "Latin and Arabic families, previewed in their own letterforms.",
    placeholder: "Search Playfair, Naskh…",
  },
  {
    id: "styles",
    label: "Styles",
    icon: Brush,
    blurb: "House palettes and font pairings applied in one tap.",
    placeholder: "Search styles…",
  },
  {
    id: "assets",
    label: "Assets",
    icon: Shapes,
    blurb: "Backgrounds, botanicals, ornaments, seals and shapes.",
    placeholder: "Search backgrounds, motifs…",
  },
  {
    id: "frames",
    label: "Frames",
    icon: FrameIcon,
    blurb: "Editable vector borders, drawn for the page's own ratio.",
    placeholder: "Search botanical, deco…",
  },
  {
    id: "layouts",
    label: "Pages",
    icon: Film,
    blurb: "Ready-made page compositions, previewed as real artwork.",
    placeholder: "Search page layouts…",
  },
  {
    id: "reveals",
    label: "Reveals",
    icon: Eye,
    blurb: "Cover-and-reveal moments for a card or a photograph.",
    placeholder: "Search reveals…",
  },
  {
    id: "opening",
    label: "Opening",
    icon: Sparkle,
    blurb: "The moment a guest first meets the invitation.",
    placeholder: "Search openings…",
  },
];

interface LibraryPanelProps {
  open: boolean;
  onClose: () => void;
  content: import("@/lib/invitation").InvitationContent | null;
  design: DesignDocument;
  selectedIds: string[];
  selectedAnimations: ElementAnimation[];
  onApplyTemplate: (next: DesignDocument, name: string) => void;
  onApplyOpening: (opening: OpeningSettings) => void;
  onApplyAnimation: (animation: ElementAnimation) => void;
  onApplyFont: (fontId: string) => void;
  onApplyStyle: (style: BuiltinStyle) => void;
  onAddPageLayout: (layoutId: string) => void;
  onApplyBuiltinAsset: (asset: BuiltinAsset) => void;
  onAddFrame: (frame: FrameSpec) => void;
  onAddRevealPreset: (preset: RevealPreset) => void;
  /** Current tab, when the studio wants to preselect one (e.g. Frames). */
  tab?: LibraryTab;
  onTabChange?: (tab: LibraryTab) => void;
  /** Applies saved lettering to the current text selection. */
  onApplyTypeStyle?: (style: TypeStyle) => void;
  /** Recolours the whole design with a curated palette. */
  onApplyPalette?: (palette: ColourPalette) => void;
  /** Recolours the selection, or the page background when nothing is selected. */
  onApplyColour?: (hex: string) => void;
}

/* -------------------------------------------------------------------------- */
/* Small shared pieces                                                        */
/* -------------------------------------------------------------------------- */

function FavouriteToggle({
  active,
  label,
  onToggle,
  className,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
      title={active ? "Remove from favourites" : "Add to favourites"}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "grid size-6 place-items-center rounded-full border bg-[var(--surface-overlay)]/95 backdrop-blur-sm transition-colors",
        active
          ? "border-[var(--gold)]/60 text-[var(--gold)]"
          : "border-[var(--edge)] text-ink/30 hover:border-[var(--edge-strong)] hover:text-ink/70",
        className,
      )}
    >
      <Star
        className="size-3"
        strokeWidth={1.7}
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[var(--radius-tile)] border border-dashed border-[var(--edge-strong)] px-4 py-10 text-center font-ui text-[0.76rem] leading-relaxed text-ink/45">
      {children}
    </p>
  );
}

function GroupChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T | "All";
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar"
    >
      {(["All", ...options] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option as T)}
          className="chip"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Template + style cards                                                     */
/* -------------------------------------------------------------------------- */

function DesignThumb({ page, className }: { page: DesignPage; className?: string }) {
  const width = page.width ?? 1000;
  const height = page.height ?? 1400;
  return (
    <DesignStage width={width} height={height} className={cn("pointer-events-none select-none", className)}>
      {() => (
        <DesignPageView
          page={{ ...page, elements: page.elements.map((element) => ({ ...element, animation: { ...element.animation, enabled: false } })) }}
          time={60_000}
          imageUrls={{}}
          className="pointer-events-none"
        />
      )}
    </DesignStage>
  );
}

function TemplateTile({
  template,
  page,
  selected,
  onApply,
  favourite,
  onFavourite,
}: {
  template: InvitationTemplate;
  page?: DesignPage;
  selected: boolean;
  onApply: () => void;
  favourite: boolean;
  onFavourite: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onApply}
        data-selected={selected}
        className="ui-tile group"
      >
        <span className="ui-tile-art aspect-[3/4] w-full">
          {page ? (
            <DesignThumb page={page} className="h-full w-full" />
          ) : (
            <span
              className="grid h-full w-full place-items-center font-display text-[15px]"
              style={{
                background: template.palette.background ?? "var(--surface-sunk)",
                color: template.palette.ink,
              }}
            >
              {template.name}
            </span>
          )}
          <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-ink/85 py-1 text-center font-ui text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[var(--paper-light)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            Use design
          </span>
        </span>
        <span className="block px-1 pb-0.5">
          <span className="block truncate font-ui text-[0.76rem] font-semibold text-ink">
            {template.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-ui text-[0.6rem] uppercase tracking-[0.09em] text-ink/40">
            <span className="truncate">{template.occasion}</span>
            {template.rtl && <span>· Arabic</span>}
          </span>
        </span>
      </button>
      <FavouriteToggle
        className="absolute top-2 right-2"
        active={favourite}
        label={template.name}
        onToggle={onFavourite}
      />
    </div>
  );
}

function StyleTile({
  style,
  onApply,
  favourite,
  onFavourite,
}: {
  style: BuiltinStyle;
  onApply: () => void;
  favourite: boolean;
  onFavourite: () => void;
}) {
  const activeFont = fontById(style.fontPair);
  return (
    <div className="relative">
      <button type="button" onClick={onApply} className="ui-tile group">
        <span
          className="ui-tile-art grid aspect-[4/3] w-full place-items-center px-3"
          style={{
            backgroundColor: style.palette.background ?? "var(--surface-sunk)",
            backgroundImage: style.palette.background?.includes("gradient")
              ? style.palette.background
              : undefined,
            color: style.palette.ink,
          }}
        >
          <span
            className="block w-full truncate text-center text-[19px] leading-tight"
            style={{ fontFamily: activeFont.family }}
          >
            {activeFont.script === "arabic" ? "أهلاً وسهلاً" : "Alexandra & Omar"}
          </span>
          <span
            className="mt-2 block h-px w-10 justify-self-center"
            style={{ background: style.palette.accent }}
          />
        </span>
        <span className="flex items-center justify-between gap-2 px-1 pb-0.5">
          <span className="min-w-0">
            <span className="block truncate font-ui text-[0.76rem] font-semibold text-ink">
              {style.name}
            </span>
            <span className="mt-0.5 block truncate font-ui text-[0.6rem] text-ink/45">
              {style.note}
            </span>
          </span>
          <span className="flex shrink-0 items-center" aria-hidden>
            {[style.palette.background, style.palette.ink, style.palette.accent].map(
              (colour, index) => (
                <span
                  key={`${colour}-${index}`}
                  className="swatch-dot -ml-1 size-4 first:ml-0"
                  style={{ background: colour }}
                />
              ),
            )}
          </span>
        </span>
      </button>
      <FavouriteToggle
        className="absolute top-2 right-2"
        active={favourite}
        label={style.name}
        onToggle={onFavourite}
      />
    </div>
  );
}

function FontTile({
  font,
  selected,
  onApply,
  favourite,
  onFavourite,
}: {
  font: (typeof FONT_LIBRARY)[number];
  selected: boolean;
  onApply: () => void;
  favourite: boolean;
  onFavourite: () => void;
}) {
  const samples = fontSamples(font, "Alexandra & Omar");
  const arabicPrimary = font.script === "arabic";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onApply}
        data-selected={selected}
        className="ui-tile gap-1 px-2.5 py-2 sm:px-3 sm:py-2.5"
      >
        <span className="flex items-baseline justify-between gap-2 pr-6">
          <span className="min-w-0">
            <span className="block truncate font-ui text-[0.7rem] font-semibold text-ink">
              {font.name}
            </span>
            <span className="mt-0.5 block truncate font-ui text-[0.58rem] text-ink/40">
              {font.categories.join(" · ")}
              {font.weights.length > 1 ? ` · ${font.weights.join("/")}` : ""}
            </span>
          </span>
          {selected && (
            <span className="shrink-0 rounded-full bg-[var(--red)]/8 px-1.5 py-0.5 font-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[var(--red)]">
              In use
            </span>
          )}
        </span>
        <span
          className="mt-1 block truncate text-[19px] leading-[1.15] text-ink sm:text-[24px]"
          style={{ fontFamily: font.family }}
          dir={arabicPrimary ? "rtl" : "ltr"}
        >
          {arabicPrimary ? samples.arabic : samples.latin}
        </span>
        {font.script !== "latin" && (
          <span
            className="block truncate text-[12px] leading-tight text-ink/45"
            style={{ fontFamily: font.family }}
            dir={arabicPrimary ? "ltr" : "rtl"}
          >
            {arabicPrimary ? samples.latin : samples.arabic}
          </span>
        )}
      </button>
      <FavouriteToggle
        className="absolute top-2 right-2"
        active={favourite}
        label={font.name}
        onToggle={onFavourite}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Asset thumbnails                                                           */
/* -------------------------------------------------------------------------- */

const CANVAS_W = 1000;
const CANVAS_H = 1400;

function tokenColour(token: "accent" | "ink" | "paper" | undefined, fallback: string) {
  if (token === "accent") return "var(--red)";
  if (token === "ink") return "var(--ink)";
  if (token === "paper") return "var(--paper-light)";
  return fallback;
}

/** The real composition the asset inserts, scaled into a square well. */
function AssetThumb({ asset }: { asset: BuiltinAsset }) {
  if (asset.background) {
    return (
      <span className="absolute inset-0" style={{ background: asset.background }}>
        <span className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20" />
      </span>
    );
  }
  if (!asset.elements || asset.elements.length === 0) {
    return (
      <span className="grid h-full w-full place-items-center text-ink/25">
        <Shapes className="size-6" strokeWidth={1.4} />
      </span>
    );
  }
  return (
    <span className="absolute inset-0">
      {asset.elements.map((element, index) => (
        <span
          key={`${asset.id}-${index}`}
          className="absolute"
          style={{
            left: `${(element.x / CANVAS_W) * 100}%`,
            top: `${(element.y / CANVAS_H) * 100}%`,
            width: `${(element.w / CANVAS_W) * 100}%`,
            height: `${(element.h / CANVAS_H) * 100}%`,
            opacity: element.opacity ?? 1,
            transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
          }}
        >
          {element.kind === "motif" ? (
            <Motif
              id={element.motif ?? "sprig"}
              className="h-full w-full"
              strokeWidth={1.2}
            />
          ) : (
            <ShapePreview
              shape={element.shape ?? "rect"}
              fill={
                element.fill ??
                tokenColour(element.fillToken, "transparent")
              }
              stroke={
                element.stroke ??
                (element.strokeToken ? tokenColour(element.strokeToken, "transparent") : undefined)
              }
            />
          )}
        </span>
      ))}
    </span>
  );
}

function AssetTile({
  asset,
  onApply,
  favourite,
  onFavourite,
}: {
  asset: BuiltinAsset;
  onApply: () => void;
  favourite: boolean;
  onFavourite: () => void;
}) {
  return (
    <div className="relative">
      <button type="button" onClick={onApply} className="ui-tile group gap-1.5">
        <span className="ui-tile-art relative aspect-square w-full overflow-hidden">
          <span className="absolute inset-2 text-ink/80">
            <AssetThumb asset={asset} />
          </span>
          <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 rounded-full bg-ink/85 py-1 text-center font-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[var(--paper-light)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            Add
          </span>
        </span>
        <span className="block px-1 pb-0.5">
          <span className="block truncate font-ui text-[0.7rem] font-medium text-ink">
            {asset.name}
          </span>
          <span className="mt-0.5 block truncate font-ui text-[0.58rem] text-ink/40">
            {asset.category}
          </span>
        </span>
      </button>
      <FavouriteToggle
        className="absolute top-1.5 right-1.5 size-5"
        active={favourite}
        label={asset.name}
        onToggle={onFavourite}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reveal + colour tiles                                                      */
/* -------------------------------------------------------------------------- */

function RevealCoverGlyph({ preset }: { preset: RevealPreset }) {
  if (preset.cover.kind === "motif") {
    return <Motif id="star" className="size-7 text-[var(--red)]" strokeWidth={1.2} />;
  }
  return (
    <span className="block size-7 text-[var(--red)]">
      <ShapePreview
        shape={preset.cover.shape ?? "rect"}
        fill="var(--red)"
      />
    </span>
  );
}

function RevealTile({ preset, onAdd }: { preset: RevealPreset; onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} className="ui-tile group gap-1.5">
      <span className="ui-tile-art grid aspect-[4/3] w-full place-items-center">
        <RevealCoverGlyph preset={preset} />
        <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-ink/85 py-1 text-center font-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[var(--paper-light)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Add reveal
        </span>
      </span>
      <span className="block px-1 pb-0.5">
        <span className="block truncate font-ui text-[0.72rem] font-medium text-ink">
          {preset.name}
        </span>
        <span className="mt-0.5 block truncate font-ui text-[0.58rem] uppercase tracking-[0.08em] text-ink/40">
          {preset.category} · {preset.effect}
        </span>
      </span>
    </button>
  );
}

function PaletteTile({
  palette,
  onApply,
}: {
  palette: ColourPalette;
  onApply: () => void;
}) {
  const roles: { label: string; colour: string }[] = [
    { label: "Paper", colour: palette.paper },
    { label: "Ink", colour: palette.ink },
    { label: "Accent", colour: palette.accent },
  ];
  return (
    <button
      type="button"
      onClick={onApply}
      className="ui-tile group gap-1.5 p-2"
      title={`${palette.name} · ${palette.group}`}
    >
      <span
        className="ui-tile-art relative grid aspect-[4/3] w-full place-items-center px-3"
        style={{
          backgroundImage: palette.background?.includes("gradient")
            ? palette.background
            : undefined,
          backgroundColor: palette.paper,
        }}
      >
        <span
          className="block w-full truncate text-center font-display text-[17px] leading-tight"
          style={{ color: palette.ink }}
        >
          {palette.name}
        </span>
        <span
          className="mt-1.5 block h-px w-9"
          style={{ background: palette.accent }}
        />
        <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-ink/85 py-1 text-center font-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[var(--paper-light)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Apply palette
        </span>
      </span>
      <span className="flex items-center justify-between gap-2 px-1 pb-0.5">
        <span className="min-w-0">
          <span className="block truncate font-ui text-[0.72rem] font-medium text-ink">
            {palette.name}
          </span>
          <span className="mt-0.5 block truncate font-ui text-[0.58rem] uppercase tracking-[0.08em] text-ink/40">
            {palette.group}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {roles.map((role) => (
            <span
              key={role.label}
              title={`${role.label} ${role.colour}`}
              className="swatch-dot size-4"
              style={{ background: role.colour }}
            />
          ))}
        </span>
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Library panel                                                              */
/* -------------------------------------------------------------------------- */

export function LibraryPanel({
  open,
  onClose,
  content,
  design,
  selectedIds,
  onApplyTemplate,
  onApplyOpening,
  onApplyFont,
  onApplyStyle,
  onAddPageLayout,
  onApplyBuiltinAsset,
  onAddFrame,
  onAddRevealPreset,
  onApplyTypeStyle,
  onApplyPalette,
  onApplyColour,
  tab: tabProp,
  onTabChange,
}: LibraryPanelProps) {
  const [innerTab, setInnerTab] = useState<LibraryTab>("templates");
  const tab = tabProp ?? innerTab;
  const setTab = onTabChange ?? setInnerTab;
  const [query, setQuery] = useState("");
  const [assetCategory, setAssetCategory] = useState<string>("Backgrounds");
  const [frameGroup, setFrameGroup] = useState<FrameGroup | "All">("All");
  const [paletteGroup, setPaletteGroup] = useState<string | "All">("All");
  const [fontScript, setFontScript] = useState<"all" | "latin" | "arabic">("all");
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<string[]>(() => readFavourites());
  const [onlyFavourites, setOnlyFavourites] = useState(false);
  const [typeStyleName, setTypeStyleName] = useState("");
  const [savingTypeStyle, setSavingTypeStyle] = useState(false);

  const selectedText = useMemo(() => {
    if (selectedIds.length === 0) return null;
    for (const page of design.pages) {
      for (const element of page.elements) {
        if (element.kind === "text" && selectedIds.includes(element.id)) {
          return element;
        }
      }
    }
    return null;
  }, [design, selectedIds]);

  const togglePin = useCallback((key: string) => {
    setFavourites((current) => writeFavourites(toggleFavouriteKey(current, key)));
  }, []);

  // The owner's own saved templates live in Convex, next to the invitation
  // itself, so they survive a new browser and are never shared with guests.
  const savedItems = useQuery(api.library.listMine, open ? {} : "skip");
  const createLibraryItem = useMutation(api.library.create);
  const removeLibraryItem = useMutation(api.library.remove);

  const savedTemplates = useMemo(
    () => (savedItems ?? []).filter((item) => item.kind === "template"),
    [savedItems],
  );
  const savedTypeStyles = useMemo(
    () => (savedItems ?? []).filter((item) => item.kind === "style"),
    [savedItems],
  );

  const handleApplyTemplate = useCallback(
    (template: InvitationTemplate) => {
      if (!content) return;
      const nextDesign = buildFullDesign(template, content);
      onApplyTemplate(nextDesign, template.name);
    },
    [content, onApplyTemplate],
  );

  const handleApplyStyle = useCallback(
    (style: BuiltinStyle) => {
      onApplyStyle(style);
      onClose();
    },
    [onApplyStyle, onClose],
  );

  const handleApplyFont = useCallback(
    (fontId: string) => {
      if (selectedIds.length === 0) return;
      onApplyFont(fontId);
      onClose();
    },
    [onApplyFont, onClose, selectedIds],
  );

  const saveCurrentTemplate = async () => {
    const name = saveName.trim();
    if (!name) {
      toast.error("Give this template a name first.");
      return;
    }
    setSaving(true);
    try {
      // A deep copy: the saved template is a source, and later edits on this
      // canvas must never reach back into it.
      const snapshot = JSON.parse(JSON.stringify(design)) as DesignDocument;
      await createLibraryItem({
        kind: "template",
        name,
        description: `${snapshot.pages.length} page${
          snapshot.pages.length === 1 ? "" : "s"
        } · saved from this invitation`,
        payload: { design: snapshot },
      });
      setSaveName("");
      toast.success("Template saved to your library. This invitation is unchanged.");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "The template could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveCurrentTypeStyle = async () => {
    if (!selectedText) {
      toast.error("Select a text layer to save its lettering.");
      return;
    }
    const style = extractTypeStyle(selectedText);
    if (Object.keys(style).length === 0) {
      toast.error("This layer has no type settings to save.");
      return;
    }
    const fontLabel = fontById(selectedText.font ?? "cormorant-garamond").name;
    const name =
      typeStyleName.trim() || `${fontLabel} ${Math.round(style.fontSize ?? 0)} px`.trim();
    setSavingTypeStyle(true);
    try {
      await createLibraryItem({
        kind: "style",
        name,
        category: "typography",
        description: describeTypeStyle(style, fontLabel),
        payload: { style },
      });
      setTypeStyleName("");
      toast.success("Type style saved. Apply it to any text layer.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "The type style could not be saved.",
      );
    } finally {
      setSavingTypeStyle(false);
    }
  };

  const applySavedTypeStyle = (item: { name: string; payload: unknown }) => {
    const style = (item.payload as { style?: TypeStyle } | null)?.style;
    if (!style || typeof style !== "object") {
      toast.error("This saved style has no lettering data.");
      return;
    }
    if (!onApplyTypeStyle) {
      toast.error("Select a text layer before applying a type style.");
      return;
    }
    onApplyTypeStyle(style);
  };

  const applySavedTemplate = (item: { name: string; payload: unknown }) => {
    const savedDesign = (item.payload as { design?: DesignDocument } | null)?.design;
    if (!savedDesign || !Array.isArray(savedDesign.pages)) {
      toast.error("This saved template has no canvas data.");
      return;
    }
    onApplyTemplate(savedDesign, item.name);
    onClose();
  };

  const deleteSavedItem = async (id: string) => {
    setConfirmDelete(null);
    try {
      await removeLibraryItem({ id: id as Id<"libraryItems"> });
      toast.success("Removed from your library.");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "This item could not be removed.",
      );
    }
  };

  /* ------------------------------------------------------------ filtering */

  const filteredSaved = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return savedTemplates.filter((item) => {
      if (onlyFavourites && !favourites.includes(favouriteKey("saved", item._id))) {
        return false;
      }
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        (item.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [savedTemplates, query, onlyFavourites, favourites]);

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return TEMPLATES.filter((template) => {
      if (onlyFavourites && !favourites.includes(favouriteKey("template", template.id))) {
        return false;
      }
      if (!needle) return true;
      return (
        template.name.toLowerCase().includes(needle) ||
        template.description.toLowerCase().includes(needle) ||
        template.occasion.toLowerCase().includes(needle)
      );
    });
  }, [query, onlyFavourites, favourites]);

  const templatePreviews = useMemo(() => {
    const map = new Map<string, DesignPage>();
    if (!content) return map;
    for (const template of TEMPLATES) {
      map.set(template.id, buildFullDesign(template, content).pages[0]);
    }
    return map;
  }, [content]);

  const layoutPreviews = useMemo(() => {
    const map = new Map<string, DesignPage>();
    if (!content) return map;
    for (const layout of PAGE_LAYOUTS) {
      map.set(layout.id, layout.build(content));
    }
    return map;
  }, [content]);

  const filteredStyles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return BUILTIN_STYLES.filter((style) => {
      if (onlyFavourites && !favourites.includes(favouriteKey("style", style.name))) {
        return false;
      }
      if (!needle) return true;
      return (
        style.name.toLowerCase().includes(needle) ||
        style.note.toLowerCase().includes(needle)
      );
    });
  }, [query, onlyFavourites, favourites]);

  const filteredFonts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return FONT_LIBRARY.filter((font) => {
      if (
        fontScript !== "all" &&
        font.script !== fontScript &&
        font.script !== "both"
      ) {
        return false;
      }
      if (onlyFavourites && !favourites.includes(favouriteKey("font", font.id))) {
        return false;
      }
      if (!needle) return true;
      return (
        font.name.toLowerCase().includes(needle) ||
        font.categories.join(" ").toLowerCase().includes(needle) ||
        (font.note ?? "").toLowerCase().includes(needle)
      );
    });
  }, [query, onlyFavourites, favourites, fontScript]);

  const filteredAssets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return BUILTIN_ASSETS.filter((asset) => {
      if (assetCategory !== "All" && asset.category !== assetCategory) return false;
      if (onlyFavourites && !favourites.includes(favouriteKey("asset", asset.id))) {
        return false;
      }
      if (!needle) return true;
      return (
        asset.name.toLowerCase().includes(needle) ||
        asset.category.toLowerCase().includes(needle) ||
        asset.note.toLowerCase().includes(needle)
      );
    });
  }, [query, assetCategory, onlyFavourites, favourites]);

  const filteredFrames = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return FRAMES.filter((frame) => {
      if (frameGroup !== "All" && frame.group !== frameGroup) return false;
      if (onlyFavourites && !favourites.includes(favouriteKey("frame", frame.id))) {
        return false;
      }
      if (!needle) return true;
      return (
        frame.name.toLowerCase().includes(needle) ||
        frame.group.toLowerCase().includes(needle) ||
        frame.note.toLowerCase().includes(needle)
      );
    });
  }, [query, frameGroup, onlyFavourites, favourites]);

  const filteredReveals = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return REVEAL_PRESETS;
    return REVEAL_PRESETS.filter(
      (preset) =>
        preset.name.toLowerCase().includes(needle) ||
        preset.note.toLowerCase().includes(needle) ||
        preset.category.toLowerCase().includes(needle),
    );
  }, [query]);

  const filteredPalettes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PALETTES.filter((palette) => {
      if (paletteGroup !== "All" && palette.group !== paletteGroup) return false;
      if (!needle) return true;
      return (
        palette.name.toLowerCase().includes(needle) ||
        palette.group.toLowerCase().includes(needle)
      );
    });
  }, [query, paletteGroup]);

  /** The distinct colours of the curated palettes, as single swatches. */
  const paletteSwatches = useMemo(
    () => deriveSwatches(filteredPalettes),
    [filteredPalettes],
  );

  const selectedFontId =
    selectedIds.length === 1
      ? design.pages
          .find((page) => page.elements.some((element) => element.id === selectedIds[0]))
          ?.elements.find((element) => element.id === selectedIds[0])?.font
      : undefined;

  const category = CATEGORIES.find((item) => item.id === tab) ?? CATEGORIES[0];

  const countFor = (id: LibraryTab): number => {
    switch (id) {
      case "templates":
        return TEMPLATES.length;
      case "saved":
        return savedTemplates.length;
      case "colours":
        return PALETTES.length;
      case "type":
        return FONT_LIBRARY.length;
      case "styles":
        return BUILTIN_STYLES.length;
      case "assets":
        return BUILTIN_ASSETS.length;
      case "frames":
        return FRAMES.length;
      case "layouts":
        return PAGE_LAYOUTS.length;
      case "reveals":
        return REVEAL_PRESETS.length;
      case "opening":
        return OPENING_EXPERIENCES.filter((item) => item.id !== "none").length;
    }
  };

  const footerCount = (() => {
    switch (tab) {
      case "templates":
        return `${filteredTemplates.length} of ${TEMPLATES.length} templates`;
      case "saved":
        return `${filteredSaved.length} saved template${filteredSaved.length === 1 ? "" : "s"}`;
      case "colours":
        return `${filteredPalettes.length} palettes · ${paletteSwatches.length} swatches`;
      case "type":
        return `${filteredFonts.length} of ${FONT_LIBRARY.length} families`;
      case "styles":
        return `${filteredStyles.length} styles`;
      case "assets":
        return `${filteredAssets.length} in ${assetCategory}`;
      case "frames":
        return `${filteredFrames.length} frames`;
      case "layouts":
        return `${PAGE_LAYOUTS.length} page layouts`;
      case "reveals":
        return `${filteredReveals.length} reveal presets`;
      case "opening":
        return `${countFor("opening")} opening experiences`;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        showCloseButton
        className="grid h-[min(92dvh,880px)] max-h-[92dvh] w-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[min(1080px,calc(100%-2rem))]"
      >
        <div className="flex min-w-0 items-center gap-3 border-b border-[var(--edge)] px-4 py-3.5 pr-14 sm:px-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--paper-deep)] text-[var(--red)]">
            <Palette className="size-4" strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <DialogTitle className="font-ui text-[16px] font-semibold tracking-[-0.01em] text-ink">
              Library
              <span className="ml-2 font-ui text-[10px] font-medium uppercase tracking-[0.14em] text-ink/35">
                {category.label}
              </span>
            </DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-[0.72rem] leading-relaxed text-ink/50">
              {category.blurb}
            </DialogDescription>
          </div>
        </div>

        <div className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden sm:flex-row">
          {/* Category rail: horizontal on a phone, a quiet column on desktop. */}
          <nav
            aria-label="Library categories"
            className="flex w-full min-w-0 max-w-full shrink-0 gap-1 overflow-x-auto border-b border-[var(--edge)] px-3 py-2 no-scrollbar sm:w-[196px] sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:border-b-0 sm:border-r sm:px-2.5 sm:py-3"
          >
            <p className="section-label mb-1 hidden px-2 sm:block">Categories</p>
            {CATEGORIES.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setQuery("");
                  }}
                  aria-pressed={active}
                  className={cn(
                    "pressable flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-left font-ui text-[0.72rem] font-medium transition-colors",
                    active
                      ? "border-transparent bg-[var(--ink)] text-[var(--paper-light)] shadow-[var(--shadow-xs)]"
                      : "border-transparent text-ink/60 hover:bg-ink/[0.055] hover:text-ink",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" strokeWidth={1.7} />
                  <span className="flex-1">{item.label}</span>
                  <span
                    className={cn(
                      "hidden font-meta text-[0.58rem] tabular-nums sm:inline",
                      active ? "text-[var(--paper-light)]/50" : "text-ink/30",
                    )}
                  >
                    {countFor(item.id)}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Search + favourites */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--edge)] px-3 py-2.5 sm:px-4">
              <label className="relative block min-w-0 flex-1">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={category.placeholder}
                  aria-label="Search the library"
                  className="h-8 rounded-full border-[var(--edge)] bg-[var(--surface-card)] pl-8 text-[0.76rem]"
                />
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink/35" />
              </label>
              <button
                type="button"
                aria-pressed={onlyFavourites}
                aria-label="Show favourites only"
                title="Show favourites only"
                onClick={() => setOnlyFavourites((value) => !value)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-ui text-[0.66rem] font-medium transition-colors",
                  onlyFavourites
                    ? "border-[var(--gold)]/60 bg-[var(--gold)]/12 text-[#6d5324]"
                    : "border-[var(--edge)] text-ink/50 hover:border-[var(--edge-strong)] hover:text-ink",
                )}
              >
                <Star
                  className="size-3.5"
                  fill={onlyFavourites ? "currentColor" : "none"}
                  strokeWidth={1.6}
                />
                <span className="hidden sm:inline">Favourites</span>
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 scroll-slim sm:px-4 sm:py-4">
              {onlyFavourites &&
                (tab === "templates" ||
                  tab === "saved" ||
                  tab === "styles" ||
                  tab === "type" ||
                  tab === "assets" ||
                  tab === "frames") && (
                  <p className="mb-3 flex items-center gap-1.5 rounded-full border border-[var(--gold)]/45 bg-[var(--gold)]/10 px-3 py-1.5 font-ui text-[0.66rem] leading-relaxed text-[#6d5324]">
                    <Star className="size-3 shrink-0" fill="currentColor" />
                    Showing favourites only. Star any item to keep it here.
                  </p>
                )}

              {tab === "templates" && (
                <>
                  {filteredTemplates.length === 0 ? (
                    <EmptyNote>
                      {onlyFavourites
                        ? "No favourite templates yet. Star one to keep it here."
                        : "No templates match that search."}
                    </EmptyNote>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                      {filteredTemplates.map((template) => (
                        <TemplateTile
                          key={template.id}
                          template={template}
                          page={templatePreviews.get(template.id)}
                          selected={content?.templateId === template.id}
                          onApply={() => handleApplyTemplate(template)}
                          favourite={favourites.includes(
                            favouriteKey("template", template.id),
                          )}
                          onFavourite={() =>
                            togglePin(favouriteKey("template", template.id))
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === "saved" && (
                <div className="space-y-4">
                  <div className="surface-card p-3">
                    <p className="font-ui text-[0.76rem] font-semibold text-ink">
                      Save this design as a template
                    </p>
                    <p className="mt-1 font-ui text-[0.68rem] leading-relaxed text-ink/50">
                      Pages, layers, type, colours and motion are copied into your
                      private library. This invitation keeps its own words, guests,
                      RSVP and public link.
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <Input
                        value={saveName}
                        onChange={(event) => setSaveName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveCurrentTemplate();
                        }}
                        placeholder="Template name"
                        maxLength={80}
                        className="h-8 text-[0.76rem]"
                      />
                      <Button
                        type="button"
                        onClick={() => void saveCurrentTemplate()}
                        disabled={saving || !saveName.trim()}
                        size="sm"
                      >
                        <Save className="size-3.5" />
                        {saving ? "Saving" : "Save"}
                      </Button>
                    </div>
                  </div>

                  {savedItems === undefined ? (
                    <p className="py-6 text-center font-ui text-[0.72rem] text-ink/45">
                      Loading your templates…
                    </p>
                  ) : filteredSaved.length === 0 ? (
                    <EmptyNote>
                      {savedItems.length === 0
                        ? "No saved templates yet. Design something you love, then save it here to start the next invitation from it."
                        : "No saved templates match that search."}
                    </EmptyNote>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {filteredSaved.map((item) => (
                        <div
                          key={item._id}
                          className="flex flex-col gap-2 rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-card)] p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Bookmark className="size-3.5 shrink-0 text-[var(--red)]" />
                            <span className="min-w-0 flex-1 truncate font-ui text-[0.78rem] font-semibold text-ink">
                              {item.name}
                            </span>
                            <FavouriteToggle
                              active={favourites.includes(favouriteKey("saved", item._id))}
                              label={item.name}
                              onToggle={() => togglePin(favouriteKey("saved", item._id))}
                            />
                          </div>
                          {item.description && (
                            <p className="font-ui text-[0.66rem] leading-relaxed text-ink/55">
                              {item.description}
                            </p>
                          )}
                          <p className="font-meta text-[0.58rem] uppercase tracking-[0.08em] text-ink/35">
                            Saved {new Date(item.updatedAt).toLocaleDateString()}
                          </p>
                          <div className="mt-auto flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="subtle"
                              size="sm"
                              onClick={() => applySavedTemplate(item)}
                              className="flex-1"
                            >
                              Use template
                            </Button>
                            {confirmDelete === item._id ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void deleteSavedItem(item._id)}
                                >
                                  Delete
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmDelete(null)}
                                >
                                  No
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Delete ${item.name}`}
                                onClick={() => setConfirmDelete(item._id)}
                                className="text-ink/45"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="border-t border-[var(--edge)] pt-3 font-ui text-[0.62rem] leading-relaxed text-ink/40">
                    Saved templates are stored with your own invitations and are
                    never visible to guests or on a public link.
                  </p>
                </div>
              )}

              {tab === "colours" && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2.5 rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-sunk)]/60 px-3 py-2.5">
                    <Palette className="mt-0.5 size-3.5 shrink-0 text-[var(--red)]" />
                    <p className="font-ui text-[0.68rem] leading-relaxed text-ink/60">
                      {selectedIds.length > 0
                        ? `A swatch recolours the ${selectedIds.length === 1 ? "selected layer" : `${selectedIds.length} selected layers`}. A palette remaps every existing colour in the design.`
                        : "A swatch sets this page's background. Select a layer first to recolour just that layer."}
                    </p>
                  </div>

                  <GroupChips
                    label="Palette groups"
                    options={PALETTE_GROUPS}
                    value={paletteGroup}
                    onChange={setPaletteGroup}
                  />

                  <section className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="section-label">Palettes</h3>
                      <span className="font-meta text-[0.58rem] tabular-nums text-ink/35">
                        {filteredPalettes.length}
                      </span>
                    </div>
                    {filteredPalettes.length === 0 ? (
                      <EmptyNote>No palettes match that search.</EmptyNote>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                        {filteredPalettes.map((palette) => (
                          <PaletteTile
                            key={palette.id}
                            palette={palette}
                            onApply={() => {
                              if (onApplyPalette) {
                                onApplyPalette(palette);
                              } else {
                                onApplyColour?.(palette.accent);
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </section>

                  {(
                    [
                      ["paper", "Paper"],
                      ["ink", "Ink"],
                      ["accent", "Accent"],
                    ] as const
                  ).map(([role, label]) => {
                    const group = paletteSwatches.filter(
                      (swatch) => swatch.role === role,
                    );
                    if (group.length === 0) return null;
                    return (
                      <section key={role} className="space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="section-label">{label}</h3>
                          <span className="font-meta text-[0.56rem] tabular-nums text-ink/35">
                            {group.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.map((swatch) => (
                            <button
                              key={swatch.hex}
                              type="button"
                              onClick={() => onApplyColour?.(swatch.hex)}
                              title={`${swatch.hex} · ${swatch.palette}`}
                              aria-label={`Apply ${swatch.hex} from ${swatch.palette}`}
                              className="swatch-dot size-8"
                              style={{ background: swatch.hex }}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              {tab === "type" && (
                <div className="space-y-4">
                  <div
                    role="group"
                    aria-label="Font scripts"
                    className="flex flex-wrap gap-1.5"
                  >
                    {(
                      [
                        ["all", "All scripts"],
                        ["latin", "Latin"],
                        ["arabic", "Arabic"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={fontScript === id}
                        onClick={() => setFontScript(id)}
                        className="chip"
                      >
                        {label}
                      </button>
                    ))}
                    <span className="ml-auto self-center font-meta text-[0.56rem] tabular-nums text-ink/35">
                      {filteredFonts.length}
                    </span>
                  </div>
                  {filteredFonts.length === 0 ? (
                    <EmptyNote>
                      {onlyFavourites
                        ? "No favourite fonts yet. Star one to keep it here."
                        : "No fonts match that search."}
                    </EmptyNote>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:gap-2.5">
                      {filteredFonts.map((font) => (
                        <FontTile
                          key={font.id}
                          font={font}
                          selected={font.id === selectedFontId}
                          onApply={() => handleApplyFont(font.id)}
                          favourite={favourites.includes(favouriteKey("font", font.id))}
                          onFavourite={() => togglePin(favouriteKey("font", font.id))}
                        />
                      ))}
                    </div>
                  )}

                  <section className="space-y-2 border-t border-[var(--edge)] pt-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="section-label">Saved type styles</h3>
                      {selectedText && (
                        <span className="truncate font-ui text-[0.62rem] text-ink/40">
                          from “{selectedText.name}”
                        </span>
                      )}
                    </div>
                    {selectedText ? (
                      <div className="flex gap-2">
                        <Input
                          value={typeStyleName}
                          onChange={(event) => setTypeStyleName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void saveCurrentTypeStyle();
                          }}
                          placeholder={`${fontById(selectedText.font ?? "cormorant-garamond").name} ${Math.round(selectedText.fontSize ?? 0)} px`}
                          maxLength={80}
                          className="h-8 text-[0.76rem]"
                        />
                        <Button
                          type="button"
                          variant="subtle"
                          size="sm"
                          onClick={() => void saveCurrentTypeStyle()}
                          disabled={savingTypeStyle}
                        >
                          <Save className="size-3.5" />
                          {savingTypeStyle ? "Saving" : "Save"}
                        </Button>
                      </div>
                    ) : (
                      <p className="font-ui text-[0.66rem] leading-relaxed text-ink/45">
                        Select a text layer to save its family, size, weight, spacing,
                        case and ink as a reusable style.
                      </p>
                    )}
                    {savedTypeStyles.length > 0 && (
                      <ul className="divide-y divide-[var(--edge)] overflow-hidden rounded-[var(--radius-tile)] border border-[var(--edge)]">
                        {savedTypeStyles.map((item) => (
                          <li key={item._id} className="flex items-center gap-1.5 px-2.5 py-2">
                            <button
                              type="button"
                              onClick={() => applySavedTypeStyle(item)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span className="block truncate font-ui text-[0.72rem] text-ink">
                                {item.name}
                              </span>
                              <span className="block truncate font-ui text-[0.6rem] uppercase tracking-[0.08em] text-ink/35">
                                {item.description ?? "Type style"}
                              </span>
                            </button>
                            {confirmDelete === item._id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void deleteSavedItem(item._id)}
                                  className="shrink-0 px-1 font-ui text-[0.6rem] uppercase tracking-[0.08em] text-[var(--red)]"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(null)}
                                  className="shrink-0 px-1 font-ui text-[0.6rem] uppercase tracking-[0.08em] text-ink/40"
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                aria-label={`Delete ${item.name}`}
                                onClick={() => setConfirmDelete(item._id)}
                                className="shrink-0 rounded-full p-1 text-ink/35 transition-colors hover:text-[var(--red)]"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="font-ui text-[0.62rem] leading-relaxed text-ink/40">
                      {FONT_LIBRARY.length} open-source families. A font applies to the
                      selected text layer.
                    </p>
                  </section>
                </div>
              )}

              {tab === "styles" && (
                <>
                  {filteredStyles.length === 0 ? (
                    <EmptyNote>
                      {onlyFavourites
                        ? "No favourite styles yet. Star one to keep it here."
                        : "No styles match that search."}
                    </EmptyNote>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                      {filteredStyles.map((style) => (
                        <StyleTile
                          key={style.name}
                          style={style}
                          onApply={() => handleApplyStyle(style)}
                          favourite={favourites.includes(favouriteKey("style", style.name))}
                          onFavourite={() => togglePin(favouriteKey("style", style.name))}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === "assets" && (
                <div className="space-y-3">
                  <GroupChips
                    label="Asset categories"
                    options={BUILTIN_ASSET_CATEGORIES}
                    value={assetCategory as (typeof BUILTIN_ASSET_CATEGORIES)[number]}
                    onChange={(next) => {
                      setAssetCategory(next);
                      setQuery("");
                    }}
                  />
                  {filteredAssets.length === 0 ? (
                    <EmptyNote>
                      {onlyFavourites
                        ? "No favourite assets yet. Star one to keep it here."
                        : "No assets match that search."}
                    </EmptyNote>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                      {filteredAssets.map((asset) => (
                        <AssetTile
                          key={asset.id}
                          asset={asset}
                          onApply={() => onApplyBuiltinAsset(asset)}
                          favourite={favourites.includes(favouriteKey("asset", asset.id))}
                          onFavourite={() => togglePin(favouriteKey("asset", asset.id))}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "frames" && (
                <div className="space-y-3">
                  <GroupChips
                    label="Frame groups"
                    options={FRAME_GROUPS}
                    value={frameGroup}
                    onChange={setFrameGroup}
                  />
                  <p className="rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-sunk)]/60 px-3 py-2 font-ui text-[0.66rem] leading-relaxed text-ink/55">
                    Each frame is vector artwork on its own layer. Add it, then move,
                    resize, rotate, recolour or change its stroke weight like any other
                    shape.
                  </p>
                  {filteredFrames.length === 0 ? (
                    <EmptyNote>
                      {onlyFavourites
                        ? "No favourite frames yet. Star one to keep it here."
                        : "No frames match that search."}
                    </EmptyNote>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                      {filteredFrames.map((frame) => (
                        <div key={frame.id} className="relative">
                          <button
                            type="button"
                            onClick={() => onAddFrame(frame)}
                            aria-label={`Add the ${frame.name} frame`}
                            className="ui-tile group"
                          >
                            <span className="ui-tile-art aspect-[3/4] w-full">
                              <FrameThumb frame={frame} />
                              <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-ink/85 py-1 text-center font-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[var(--paper-light)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                Add frame
                              </span>
                            </span>
                            <span className="block px-1 pb-0.5">
                              <span className="block truncate font-ui text-[0.72rem] font-medium text-ink">
                                {frame.name}
                              </span>
                              <span className="mt-0.5 block truncate font-ui text-[0.58rem] uppercase tracking-[0.09em] text-ink/40">
                                {frame.group}
                              </span>
                            </span>
                          </button>
                          <FavouriteToggle
                            className="absolute top-2 right-2"
                            active={favourites.includes(favouriteKey("frame", frame.id))}
                            label={frame.name}
                            onToggle={() => togglePin(favouriteKey("frame", frame.id))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "layouts" && (
                <>
                  {PAGE_LAYOUTS.length === 0 ? (
                    <EmptyNote>No page layouts available.</EmptyNote>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                      {PAGE_LAYOUTS.map((layout) => {
                        const page = layoutPreviews.get(layout.id);
                        return (
                          <button
                            key={layout.id}
                            type="button"
                            onClick={() => onAddPageLayout(layout.id)}
                            className="ui-tile group"
                          >
                            <span className="ui-tile-art grid aspect-[3/4] w-full place-items-center bg-[var(--paper-deep)]/50">
                              {page ? (
                                <DesignThumb page={page} className="h-full w-full" />
                              ) : (
                                <Film className="size-5 text-ink/25" />
                              )}
                              <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-ink/85 py-1 text-center font-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[var(--paper-light)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                Add page
                              </span>
                            </span>
                            <span className="block px-1 pb-0.5">
                              <span className="block truncate font-ui text-[0.72rem] font-medium text-ink">
                                {layout.name}
                              </span>
                              <span className="mt-0.5 block truncate font-ui text-[0.58rem] uppercase tracking-[0.09em] text-ink/40">
                                {layout.category}
                                {layout.size ? " · A6" : ""}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {tab === "reveals" && (
                <>
                  {filteredReveals.length === 0 ? (
                    <EmptyNote>No reveal presets match that search.</EmptyNote>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                      {filteredReveals.map((preset) => (
                        <RevealTile
                          key={preset.id}
                          preset={preset}
                          onAdd={() => onAddRevealPreset(preset)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === "opening" && (
                <>
                  {OPENING_EXPERIENCES.filter((experience) => experience.id !== "none")
                    .length === 0 ? (
                    <EmptyNote>No opening experiences available.</EmptyNote>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                      {OPENING_EXPERIENCES.filter(
                        (experience) => experience.id !== "none",
                      ).map((experience) => (
                        <button
                          key={experience.id}
                          type="button"
                          onClick={() => {
                            // Only the experience changes here: the suite's
                            // materials, envelope size and palette stay.
                            onApplyOpening({
                              ...design.opening,
                              experience:
                                experience.id as OpeningSettings["experience"],
                            });
                            onClose();
                          }}
                          className="ui-tile group gap-1.5"
                        >
                          <span className="ui-tile-art grid aspect-[4/3] w-full place-items-center bg-[var(--paper-deep)]/45">
                            <span className="flex size-10 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--surface-card)] text-[var(--red)]">
                              <Sparkle className="size-4" strokeWidth={1.6} />
                            </span>
                            <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-ink/85 py-1 text-center font-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[var(--paper-light)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              Use opening
                            </span>
                          </span>
                          <span className="block px-1 pb-0.5">
                            <span className="block truncate font-ui text-[0.72rem] font-medium text-ink">
                              {experience.label}
                            </span>
                            <span className="mt-0.5 line-clamp-2 font-ui text-[0.6rem] leading-snug text-ink/45">
                              {experience.note}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--edge)] px-3 py-2 sm:px-4">
              <span className="font-meta text-[0.6rem] text-ink/40">{footerCount}</span>
              <span className="hidden font-ui text-[0.62rem] text-ink/35 sm:inline">
                {onlyFavourites ? "Favourites only" : "Everything here is editable artwork"}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Design builders                                                            */
/* -------------------------------------------------------------------------- */

function buildFullDesign(
  template: InvitationTemplate,
  content: import("@/lib/invitation").InvitationContent,
): DesignDocument {
  const primaryFont = template.fontPair;
  const ink = template.palette.ink;
  const accent = template.palette.accent;
  const paper = template.palette.background;

  const elements: DesignElement[] = [
    makeElement("motif", {
      name:
        template.motif === "none"
          ? "Ornament"
          : template.motif.charAt(0).toUpperCase() + template.motif.slice(1),
      motif: template.motif === "none" ? "sprig" : template.motif,
      x: 400,
      y: 180,
      w: 200,
      h: 200,
      color: accent,
      opacity: 0.85,
      animation: defaultAnimation("fade", 0),
    }),
    makeElement("text", {
      name: "Eyebrow",
      text: content.eyebrow || "You are invited",
      font: primaryFont,
      fontSize: 17,
      fontWeight: 400,
      letterSpacing: 0.34,
      lineHeight: 1.4,
      align: "center",
      color: ink,
      opacity: 0.8,
      uppercase: true,
      x: 120,
      y: 330,
      w: 760,
      h: 50,
      animation: defaultAnimation("fade", 200),
    }),
    makeElement("text", {
      name: "Names",
      text: [content.names.primary, content.names.secondary]
        .filter(Boolean)
        .join(content.names.secondary ? "\n& " : "\n"),
      font: primaryFont,
      fontSize: 88,
      fontWeight: 400,
      letterSpacing: -0.01,
      lineHeight: 1.04,
      align: "center",
      color: ink,
      x: 80,
      y: 410,
      w: 840,
      h: 320,
      animation: defaultAnimation("fadeUp", 500),
    }),
    makeElement("shape", {
      name: "Rule",
      shape: "line",
      x: 400,
      y: 760,
      w: 200,
      h: 2,
      fill: accent,
      opacity: 0.7,
      animation: defaultAnimation("draw", 900),
    }),
    makeElement("text", {
      name: "Date & time",
      text: [content.date, content.time].filter(Boolean).join(" · "),
      font: primaryFont,
      fontSize: 22,
      fontWeight: 400,
      letterSpacing: 0.18,
      lineHeight: 1.4,
      align: "center",
      color: ink,
      opacity: 0.85,
      uppercase: true,
      x: 120,
      y: 820,
      w: 760,
      h: 50,
      animation: defaultAnimation("fade", 1100),
    }),
    makeElement("text", {
      name: "Venue",
      text: [content.venueName, content.venueAddress].filter(Boolean).join("\n"),
      font: primaryFont,
      fontSize: 17,
      fontWeight: 400,
      letterSpacing: 0.14,
      lineHeight: 1.5,
      align: "center",
      color: ink,
      opacity: 0.6,
      uppercase: true,
      x: 120,
      y: 900,
      w: 760,
      h: 90,
      animation: defaultAnimation("fade", 1300),
    }),
  ];

  if (template.cornerMotif && template.cornerMotif !== "none") {
    elements.push(
      makeElement("motif", {
        name: "Corner ornament",
        motif: template.cornerMotif,
        x: 780,
        y: 1040,
        w: 120,
        h: 120,
        color: accent,
        opacity: 0.5,
        animation: defaultAnimation("fade", 1500),
      }),
    );
  }

  const page: DesignPage = {
    id: makeId("page"),
    name: template.name,
    background: paper,
    elements,
  };

  return {
    version: 1,
    pages: [page],
    opening: {
      experience: "none",
      duration: 1200,
      autoOpen: false,
      welcome: "",
    },
    closing: {
      enabled: false,
      style: "message",
      message: "With love",
      duration: 800,
    },
    transition: {
      preset: "fade",
      duration: 600,
    },
  };
}
