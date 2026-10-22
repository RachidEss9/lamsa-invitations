import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  BUILTIN_ASSETS,
  BUILTIN_ASSET_CATEGORIES,
  type BuiltinAsset,
} from "@/lib/assets";
import { PAGE_LAYOUTS } from "@/lib/layouts";
import { REVEAL_PRESETS, type RevealPreset } from "@/lib/reveals";
import { BUILTIN_STYLES, type BuiltinStyle } from "@/lib/styles";
import { FONT_LIBRARY, fontById, fontSamples } from "@/lib/fonts";
import {
  TEMPLATES,
  type InvitationTemplate,
} from "@/lib/invitation";
import {
  OPENING_EXPERIENCES,
} from "@/lib/design";
import type { ShapeKind } from "@/lib/design";
import { cn } from "@/lib/utils";
import {
  Heart,
  Layers,
  Type,
  Sparkles,
  Sparkle,
  Film,
  Eye,
  MousePointer,
  Palette,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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

export function ShapePreview({ shape, fill, stroke }: { shape: ShapeKind; fill?: string; stroke?: string }) {
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
          fill={shape === "frame" ? "transparent" : fill ?? "#710014"}
          stroke={shape === "frame" ? stroke ?? fill ?? "#710014" : undefined}
          strokeWidth={shape === "frame" ? 2 : 0}
        />
      ) : shape === "ellipse" ? (
        <ellipse
          cx={50}
          cy={50}
          rx={44}
          ry={44}
          fill={fill ?? "#710014"}
          stroke={stroke}
          strokeWidth={stroke ? 2 : 0}
        />
      ) : shape === "line" ? (
        <line
          x1={10}
          y1={50}
          x2={90}
          y2={50}
          stroke={fill ?? "#710014"}
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
          fill={fill ?? "#710014"}
          stroke={stroke}
          strokeWidth={stroke ? 2 : 0}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Library panel                                                              */
/* -------------------------------------------------------------------------- */

type LibraryTab =
  | "templates"
  | "styles"
  | "type"
  | "assets"
  | "layouts"
  | "reveals"
  | "opening";

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
  onApplyStyle: (style: BuiltinStyle) => void;
  onPlaceAsset: (storageId: string, name: string, url?: string | null) => void;
  onAddPageLayout: (layoutId: string) => void;
  onApplyBuiltinAsset: (asset: BuiltinAsset) => void;
  onAddRevealPreset: (preset: RevealPreset) => void;
}

function TemplateCard({
  template,
  selected,
  onApply,
}: {
  template: InvitationTemplate;
  selected: boolean;
  onApply: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onApply}
      className={cn(
        "group flex w-full flex-col gap-2 border p-3 text-left transition-colors",
        selected
          ? "border-[var(--red)] bg-[var(--red)]/5"
          : "border-ink/12 hover:border-ink/40",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 items-center justify-center rounded-full border border-black/5"
          style={{ backgroundColor: template.palette.background }}
        >
          <span
            className="size-2.5 rounded-full border border-black/10"
            style={{ backgroundColor: template.palette.ink }}
          />
          <span
            className="ml-1.5 size-2 rounded-full border border-black/10"
            style={{ backgroundColor: template.palette.accent }}
          />
        </span>
        <span className="flex-1 truncate font-display text-[13px]">
          {template.name}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-ink/60">
        {template.description}
      </p>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.1em] text-ink/40">
        <span>{template.occasion}</span>
        {template.rtl && <span>Arabic</span>}
        {template.layout && (
          <span className="ml-auto">{template.layout}</span>
        )}
      </div>
    </button>
  );
}

function StyleCard({
  style,
  selected,
  onApply,
}: {
  style: BuiltinStyle;
  selected: boolean;
  onApply: () => void;
}) {
  const activeFont = fontById(style.fontPair);
  return (
    <button
      type="button"
      onClick={onApply}
      className={cn(
        "flex w-full flex-col gap-2 border p-3 text-left transition-colors",
        selected
          ? "border-[var(--red)] bg-[var(--red)]/5"
          : "border-ink/12 hover:border-ink/40",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 items-center justify-center rounded-full border border-black/5"
          style={{ backgroundColor: style.palette.background }}
        >
          <span
            className="size-2.5 rounded-full border border-black/10"
            style={{ backgroundColor: style.palette.ink }}
          />
          <span
            className="ml-1.5 size-2 rounded-full border border-black/10"
            style={{ backgroundColor: style.palette.accent }}
          />
        </span>
        <span className="flex-1 truncate font-display text-[13px]">
          {style.name}
        </span>
      </div>
      <p className="text-[11px] text-ink/60">{style.note}</p>
      <div
        className="h-6 w-full overflow-hidden rounded text-[11px] text-center tracking-wide"
        style={{
          fontFamily: activeFont.family,
          color: style.palette.ink,
          backgroundColor:
            style.palette.background ??
            "transparent",
        }}
      >
        {activeFont.script === "arabic"
          ? "أهلاً وسهلاً"
          : "Alexandra & Omar"}
      </div>
    </button>
  );
}

function FontCard({
  font,
  selected,
  onApply,
}: {
  font: (typeof FONT_LIBRARY)[number];
  selected: boolean;
  onApply: () => void;
}) {
  const samples = fontSamples(font, "Alexandra & Omar");
  const arabicPrimary = font.script === "arabic";
  return (
    <button
      type="button"
      onClick={onApply}
      className={cn(
        "flex w-full flex-col gap-1.5 border p-2.5 text-left transition-colors",
        selected
          ? "border-[var(--red)] bg-[var(--red)]/5"
          : "border-ink/12 hover:border-ink/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-medium uppercase tracking-[0.1em] text-ink/70">
            {font.name}
          </span>
          <span className="mt-0.5 block truncate text-[9px] text-ink/40">
            {font.categories.join(" · ")}
            {font.weights.length > 1 ? ` · ${font.weights.join("/")}` : ""}
          </span>
        </span>
        {selected && (
          <Sparkle className="mt-0.5 size-3.5 shrink-0 text-[var(--red)]" />
        )}
      </div>
      <span
        className="block truncate text-[19px] leading-[1.2] text-ink"
        style={{ fontFamily: font.family }}
        dir={arabicPrimary ? "rtl" : "ltr"}
      >
        {arabicPrimary ? samples.arabic : samples.latin}
      </span>
      {font.script !== "latin" && (
        <span
          className="block truncate text-[11px] leading-[1.3] text-ink/50"
          style={{ fontFamily: font.family }}
          dir={arabicPrimary ? "ltr" : "rtl"}
        >
          {arabicPrimary ? samples.latin : samples.arabic}
        </span>
      )}
    </button>
  );
}

function assetPreview(asset: BuiltinAsset) {
  if (asset.background) {
    return (
      <div
        className="flex size-14 items-center justify-center rounded-md border border-ink/10 overflow-hidden"
        style={{ background: asset.background }}
      >
        <div className="size-full bg-gradient-to-t from-black/10 to-transparent" />
      </div>
    );
  }
  if (asset.elements && asset.elements.length === 1) {
    const [element] = asset.elements;
    if (element.kind === "motif") {
      return (
        <div
          className="flex size-14 items-center justify-center rounded-md border border-ink/10"
          style={{ color: element.fill ?? "#161616" }}
        >
          <Sparkles className="h-7 w-7" strokeWidth={1.2} />
        </div>
      );
    }
    if (element.kind === "shape") {
      return (
        <div className="flex size-14 items-center justify-center">
          <ShapePreview
            shape={element.shape ?? "rect"}
            fill={element.fill ?? undefined}
            stroke={element.stroke ?? undefined}
          />
        </div>
      );
    }
  }
  return (
    <div className="flex size-14 items-center justify-center rounded-md border border-ink/10 bg-ink/5">
      <Layers className="h-5 w-5 text-ink/50" />
    </div>
  );
}

function AssetCard({
  asset,
  onApply,
}: {
  asset: BuiltinAsset;
  onApply: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onApply}
      className="flex flex-col gap-2 border border-ink/12 p-3 text-left transition-colors hover:border-ink/40"
    >
      <div className="flex items-center gap-2.5">
        {assetPreview(asset)}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium">
            {asset.name}
          </span>
          <span className="mt-0.5 block truncate text-[9px] text-ink/40">
            {asset.category}
          </span>
        </span>
      </div>
      <p className="text-[10px] leading-relaxed text-ink/55">{asset.note}</p>
    </button>
  );
}

function RevealCard({ preset, onAdd }: { preset: RevealPreset; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex flex-col gap-2 border border-ink/12 p-3 text-left transition-colors hover:border-ink/40"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex size-12 items-center justify-center rounded-full border border-ink/10 bg-ink/5"
          style={{
            color:
              preset.cover.kind === "motif"
                ? "var(--red)"
                : preset.cover.fillToken === "paper"
                ? "#f2f1ed"
                : "var(--red)",
          }}
        >
          {preset.cover.kind === "motif" ? (
            <Sparkles className="h-5 w-5" strokeWidth={1.4} />
          ) : preset.cover.shape === "heart" ? (
            <Heart className="h-5 w-5" />
          ) : preset.cover.shape === "ellipse" ? (
            <circle
              className="h-4 w-4 fill-current"
              cx="12"
              cy="12"
              r="9"
              style={{
                fill:
                  preset.cover.fillToken === "paper"
                    ? "#f2f1ed"
                    : "var(--red)",
              }}
            />
          ) : preset.cover.shape === "arch" ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path
                d="M4 20V12C4 6.48 9.48 2 15 2C17.995 2 20.607 3.13 22.32 5"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <span
              className="size-5 rounded border border-current"
              style={{
                backgroundColor:
                  preset.cover.fillToken === "paper"
                    ? "#f2f1ed"
                    : "var(--red)",
              }}
            />
          )}
        </div>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium">
            {preset.name}
          </span>
          <span className="mt-0.5 block truncate text-[9px] text-ink/40">
            {preset.category} · {preset.effect}
          </span>
        </span>
      </div>
      <p className="text-[10px] leading-relaxed text-ink/55">{preset.note}</p>
      <p className="text-[9px] uppercase tracking-[0.08em] text-ink/35">
        Hint: {preset.hint}
      </p>
    </button>
  );
}

export function LibraryPanel({
  open,
  onClose,
  content,
  design,
  selectedIds,
  selectedAnimations,
  onApplyTemplate,
  onApplyOpening,
  onApplyAnimation,
  onApplyStyle,
  onPlaceAsset,
  onAddPageLayout,
  onApplyBuiltinAsset,
  onAddRevealPreset,
}: LibraryPanelProps) {
  const [tab, setTab] = useState<LibraryTab>("templates");
  const [query, setQuery] = useState("");
  const [assetCategory, setAssetCategory] = useState<string>("Backgrounds");

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

  const handleApplyFont = useCallback(() => {
      if (selectedIds.length === 0) {
        onClose();
        return;
      }
      const existing = selectedAnimations[0];
      onApplyAnimation(
        existing ?? {
          enabled: true,
          preset: "fadeUp",
          trigger: "load",
          delay: 0,
          duration: 1200,
          easing: "easeOut",
        },
      );
      onClose();
    },
    [selectedIds, selectedAnimations, onApplyAnimation, onClose],
  );

  const handlePlaceAsset = useCallback(
    (asset: BuiltinAsset) => {
      onPlaceAsset("", asset.name);
    },
    [onPlaceAsset],
  );

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TEMPLATES;
    return TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle) ||
        t.occasion.toLowerCase().includes(needle),
    );
  }, [query]);

  const filteredStyles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return BUILTIN_STYLES;
    return BUILTIN_STYLES.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.note.toLowerCase().includes(needle),
    );
  }, [query]);

  const filteredFonts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return FONT_LIBRARY.filter(
      (font) =>
        !needle ||
        font.name.toLowerCase().includes(needle) ||
        font.categories.join(" ").toLowerCase().includes(needle) ||
        (font.note ?? "").toLowerCase().includes(needle),
    );
  }, [query]);

  const filteredAssets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return BUILTIN_ASSETS.filter(
      (asset) =>
        (!assetCategory || asset.category === assetCategory) &&
        (!needle ||
          asset.name.toLowerCase().includes(needle) ||
          asset.category.toLowerCase().includes(needle) ||
          asset.note.toLowerCase().includes(needle)),
    );
  }, [query, assetCategory]);

  const filteredReveals = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return REVEAL_PRESETS;
    return REVEAL_PRESETS.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.note.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle),
    );
  }, [query]);

  const selectedFontId = selectedIds.length === 1 ? design.pages[0]?.elements.find((e) => e.id === selectedIds[0])?.font : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-[920px] gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-ink/12 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Palette className="size-4 text-[var(--red)]" />
            Libraries
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed text-ink/50">
            Templates, styles, type, assets, page layouts, and reveal presets.
            Every library item is real and applies to this design.
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-ink/12 px-3 py-1">
          {(
            [
              ["templates", "Templates", MousePointer],
              ["styles", "Styles", Palette],
              ["type", "Type", Type],
              ["assets", "Assets", Sparkles],
              ["layouts", "Pages", Film],
              ["reveals", "Reveals", Eye],
              ["opening", "Opening", Sparkle],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setQuery("");
              }}
              className={cn(
                "flex-1 border-t-2 border-transparent py-2 text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-ink/30",
                tab === id
                  ? "border-[var(--red)] text-ink"
                  : "text-ink/50",
              )}
            >
              <Icon className="inline size-3 mr-1" />
              {label}
            </button>
          ))}
        </div>

        <div className="border-b border-ink/12 px-5 py-3">
          <label className="relative block">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "templates"
                  ? "Search templates…"
                  : tab === "styles"
                  ? "Search styles…"
                  : tab === "type"
                  ? "Search Playfair, Naskh…"
                  : tab === "assets"
                  ? "Search backgrounds, motifs…"
                  : tab === "layouts"
                  ? "Search page layouts…"
                  : tab === "opening"
                  ? "Search opening experiences…"
                  : "Search reveal presets…"
              }
              className="h-8 rounded-none border-ink/20 pl-8 text-[12px]"
              autoFocus
            />
            <MousePointer className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink/35" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "templates" && (
            <div>
              {filteredTemplates.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink/45">
                  No templates match that search.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      selected={content?.templateId === template.id}
                      onApply={() => handleApplyTemplate(template)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "styles" && (
            <div>
              {filteredStyles.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink/45">
                  No styles match that search.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredStyles.map((style) => (
                    <StyleCard
                      key={style.name}
                      style={style}
                      selected={false}
                      onApply={() => handleApplyStyle(style)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "type" && (
            <div>
              {filteredFonts.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink/45">
                  No fonts match that search.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredFonts.map((font) => (
                    <FontCard
                      key={font.id}
                      font={font}
                      selected={font.id === selectedFontId}
                      onApply={() => handleApplyFont()}
                    />
                  ))}
                </div>
              )}
              <p className="mt-4 border-t border-ink/10 pt-3 text-[9px] leading-relaxed text-ink/40">
                {FONT_LIBRARY.length} open-source families. Applied to the
                selected text layer when one is chosen, otherwise shown for
                reference.
              </p>
            </div>
          )}

          {tab === "assets" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1">
                {BUILTIN_ASSET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setAssetCategory(cat);
                      setQuery("");
                    }}
                    className={cn(
                      "border px-2 py-1 text-[9px] uppercase tracking-[0.1em]",
                      assetCategory === cat
                        ? "border-[var(--red)] bg-[var(--red)] text-white"
                        : "border-ink/15 text-ink/50 hover:border-ink",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div>
                {filteredAssets.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-ink/45">
                    No assets match that search.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAssets.map((asset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        onApply={() => { onApplyBuiltinAsset(asset); handlePlaceAsset(asset); } }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "layouts" && (
            <div>
              {PAGE_LAYOUTS.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink/45">
                  No page layouts available.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {PAGE_LAYOUTS.map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() => onAddPageLayout(layout.id)}
                      className="flex flex-col gap-2 border border-ink/12 p-3 text-left transition-colors hover:border-ink/40"
                    >
                      <div className="flex items-center gap-2">
                        <Film className="size-4 text-[var(--red)]" />
                        <span className="flex-1 truncate font-display text-[13px]">
                          {layout.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink/60">{layout.note}</p>
                      <span className="text-[9px] uppercase tracking-[0.1em] text-ink/40">
                        {layout.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "reveals" && (
            <div>
              {filteredReveals.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink/45">
                  No reveal presets match that search.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredReveals.map((preset) => (
                    <RevealCard
                      key={preset.id}
                      preset={preset}
                      onAdd={() => onAddRevealPreset(preset)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "opening" && (
            <div>
              {OPENING_EXPERIENCES.filter((e) => e.id !== "none").length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink/45">
                  No opening experiences available.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {OPENING_EXPERIENCES
                    .filter((e) => e.id !== "none")
                    .map((experience) => (
                      <button
                        key={experience.id}
                        type="button"
                        onClick={() => {
                          onApplyOpening({
                            experience: experience.id as OpeningSettings["experience"],
                            duration: design.opening.duration,
                            autoOpen: design.opening.autoOpen,
                            welcome: design.opening.welcome,
                          } as OpeningSettings);
                          onClose();
                        }}
                        className="flex flex-col gap-2 border border-ink/12 p-3 text-left transition-colors hover:border-ink/40"
                      >
                        <div className="flex items-center gap-2.5">
                          <Sparkle className="size-4 text-[var(--red)]" />
                          <span className="flex-1 truncate font-display text-[13px]">
                            {experience.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink/60">{experience.note}</p>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-ink/12 px-5 py-2.5 text-[9px] text-ink/40">
          {tab === "templates" &&
            `${filteredTemplates.length} templates`}
          {tab === "styles" && `${filteredStyles.length} styles`}
          {tab === "type" && `${filteredFonts.length} fonts`}
          {tab === "assets" &&
            `${filteredAssets.length} assets`}
          {tab === "layouts" &&
            `${PAGE_LAYOUTS.length} page layouts`}
          {tab === "reveals" &&
            `${filteredReveals.length} reveal presets`}
          {tab === "opening" &&
            `${OPENING_EXPERIENCES.filter((e) => e.id !== "none").length} opening experiences`}
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
      name: template.motif === "none" ? "Ornament" : template.motif.charAt(0).toUpperCase() + template.motif.slice(1),
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
      text: [content.date, content.time]
        .filter(Boolean)
        .join(" · "),
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
      text: [content.venueName, content.venueAddress]
        .filter(Boolean)
        .join("\n"),
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
