import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
  Bookmark,
  Heart,
  Layers,
  Type,
  Sparkles,
  Sparkle,
  Film,
  Frame as FrameIcon,
  Eye,
  MousePointer,
  Palette,
  Save,
  Star,
  Trash2,
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

export type LibraryTab =
  | "templates"
  | "saved"
  | "styles"
  | "type"
  | "assets"
  | "frames"
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
}

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
        "grid size-6 place-items-center rounded-full border bg-[var(--paper-light)]/90 backdrop-blur-sm transition-colors",
        active
          ? "border-[var(--gold)]/60 text-[var(--gold)]"
          : "border-ink/10 text-ink/30 hover:border-ink/30 hover:text-ink/60",
        className,
      )}
    >
      <Star
        className="size-3.5"
        strokeWidth={1.6}
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
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
        <span className="flex-1 truncate font-ui text-[13px] font-semibold">
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
        <span className="flex-1 truncate font-ui text-[13px] font-semibold">
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
  onApplyTemplate,
  onApplyOpening,
  onApplyFont,
  onApplyStyle,
  onAddPageLayout,
  onApplyBuiltinAsset,
  onAddFrame,
  onAddRevealPreset,
  onApplyTypeStyle,
  tab: tabProp,
  onTabChange,
}: LibraryPanelProps) {
  const [innerTab, setInnerTab] = useState<LibraryTab>("templates");
  const tab = tabProp ?? innerTab;
  const setTab = onTabChange ?? setInnerTab;
  const [query, setQuery] = useState("");
  const [assetCategory, setAssetCategory] = useState<string>("Backgrounds");
  const [frameGroup, setFrameGroup] = useState<FrameGroup | "All">("All");
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
  const savedItems = useQuery(
    api.library.listMine,
    open ? {} : "skip",
  );
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
      if (selectedIds.length === 0) {
        return;
      }
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
      typeStyleName.trim() ||
      `${fontLabel} ${Math.round(style.fontSize ?? 0)} px`.trim();
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
    const savedDesign = (item.payload as { design?: DesignDocument } | null)
      ?.design;
    if (!savedDesign || !Array.isArray(savedDesign.pages)) {
      toast.error("This saved template has no canvas data.");
      return;
    }
    onApplyTemplate(savedDesign, item.name);
    onClose();
  };

  const deleteSavedTemplate = async (id: string) => {
    setConfirmDelete(null);
    try {
      await removeLibraryItem({ id: id as Id<"libraryItems"> });
      toast.success("Template removed from your library.");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "The template could not be removed.",
      );
    }
  };

  const filteredSaved = useMemo(() => {
    const items = savedTemplates;
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (
        onlyFavourites &&
        !favourites.includes(favouriteKey("saved", item._id))
      ) {
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
      if (
        onlyFavourites &&
        !favourites.includes(favouriteKey("template", template.id))
      ) {
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

  const filteredStyles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return BUILTIN_STYLES.filter((style) => {
      if (
        onlyFavourites &&
        !favourites.includes(favouriteKey("style", style.name))
      ) {
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
        onlyFavourites &&
        !favourites.includes(favouriteKey("font", font.id))
      ) {
        return false;
      }
      if (!needle) return true;
      return (
        font.name.toLowerCase().includes(needle) ||
        font.categories.join(" ").toLowerCase().includes(needle) ||
        (font.note ?? "").toLowerCase().includes(needle)
      );
    });
  }, [query, onlyFavourites, favourites]);

  const filteredAssets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return BUILTIN_ASSETS.filter((asset) => {
      if (!assetCategory || asset.category !== assetCategory) return false;
      if (
        onlyFavourites &&
        !favourites.includes(favouriteKey("asset", asset.id))
      ) {
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
      if (
        onlyFavourites &&
        !favourites.includes(favouriteKey("frame", frame.id))
      ) {
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
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.note.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle),
    );
  }, [query]);

  const selectedFontId =
    selectedIds.length === 1
      ? design.pages.find((pg) => pg.elements.some((e) => e.id === selectedIds[0]))?.elements.find((e) => e.id === selectedIds[0])?.font
      : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] sm:max-w-[min(920px,calc(100%_-_2rem))] gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-ink/12 px-4 py-3">
          <DialogTitle className="flex items-center gap-2.5 font-ui text-xl font-semibold tracking-[-0.01em]">
            <Palette className="size-4 text-[var(--red)]" />
            Libraries
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed text-ink/55">
            Templates, styles, type, frames, assets, page layouts, and reveal
            presets. Every library item is real and applies to this design.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 gap-1 overflow-x-auto border-b border-ink/12 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              ["templates", "Templates", MousePointer],
              ["saved", "Saved", Bookmark],
              ["styles", "Styles", Palette],
              ["type", "Type", Type],
              ["assets", "Assets", Sparkles],
              ["frames", "Frames", FrameIcon],
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
              aria-pressed={tab === id}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.09em] transition-[background-color,border-color,color] duration-150",
                tab === id
                  ? "border-ink/20 bg-[var(--paper-light)] text-ink shadow-[0_1px_2px_rgba(21,21,21,0.06)]"
                  : "border-transparent text-ink/50 hover:border-ink/15 hover:bg-ink/[0.03] hover:text-ink/80",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 border-b border-ink/12 px-4 py-2.5">
          <label className="relative block min-w-0 flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "templates"
                  ? "Search templates…"
                  : tab === "saved"
                  ? "Search your saved templates…"
                  : tab === "styles"
                  ? "Search styles…"
                  : tab === "type"
                  ? "Search Playfair, Naskh…"
                  : tab === "assets"
                  ? "Search backgrounds, motifs…"
                  : tab === "frames"
                  ? "Search frames, botanical, deco…"
                  : tab === "layouts"
                  ? "Search page layouts…"
                  : tab === "opening"
                  ? "Search opening experiences…"
                  : "Search reveal presets…"
              }
              aria-label="Search the library"
              className="h-9 rounded-md border-ink/20 pl-9 text-[12px]"
              autoFocus
            />
            <MousePointer className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink/35" />
          </label>
          <button
            type="button"
            aria-pressed={onlyFavourites}
            aria-label="Show favourites only"
            title="Show favourites only"
            onClick={() => setOnlyFavourites((value) => !value)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[10px] uppercase tracking-[0.09em] transition-[background-color,border-color,color] duration-150",
              onlyFavourites
                ? "border-[var(--gold)]/80 bg-[var(--gold)]/10 text-[#7a5f2a]"
                : "border-ink/20 text-ink/45 hover:border-ink/45 hover:text-ink",
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {onlyFavourites &&
            (tab === "templates" ||
              tab === "saved" ||
              tab === "styles" ||
              tab === "type" ||
              tab === "assets" ||
              tab === "frames") && (
              <p className="mb-3 flex items-center gap-1.5 rounded-md border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-[#7a5f2a]">
                <Star className="size-3 shrink-0" fill="currentColor" />
                Showing favourites only. Star any item to keep it here.
              </p>
            )}
          {tab === "templates" && (
            <div>
              {filteredTemplates.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink/45">
                  {onlyFavourites
                    ? "No favourite templates yet. Star one to keep it here."
                    : "No templates match that search."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredTemplates.map((template) => (
                    <div key={template.id} className="relative">
                      <TemplateCard
                        template={template}
                        selected={content?.templateId === template.id}
                        onApply={() => handleApplyTemplate(template)}
                      />
                      <FavouriteToggle
                        className="absolute right-2 top-2"
                        active={favourites.includes(
                          favouriteKey("template", template.id),
                        )}
                        label={template.name}
                        onToggle={() =>
                          togglePin(favouriteKey("template", template.id))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "saved" && (
            <div className="space-y-4">                <div className="rounded-md border border-ink/12 bg-[var(--paper-deep)]/60 p-3">
                  <p className="text-[11px] font-semibold">
                    Save this design as a template
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink/50">
                    Pages, layers, type, colours, and motion are copied into your
                    private library. This invitation keeps its own words, guests,
                    RSVP, and public link.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={saveName}
                      onChange={(event) => setSaveName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveCurrentTemplate();
                      }}
                      placeholder="Template name"
                      maxLength={80}
                      className="h-8 rounded-md border-ink/20 text-[12px]"
                    />
                    <Button
                      type="button"
                      onClick={() => void saveCurrentTemplate()}
                      disabled={saving || !saveName.trim()}
                      className="h-8 shrink-0 rounded-md px-3 text-[9px] uppercase tracking-[0.12em]"
                    >
                      <Save className="size-3.5" />
                      {saving ? "Saving" : "Save"}
                    </Button>
                  </div>
                </div>


              {savedItems === undefined ? (
                <p className="py-6 text-center text-[11px] text-ink/45">
                  Loading your templates…
                </p>
              ) : filteredSaved.length === 0 ? (
                <p className="border border-dashed border-ink/15 px-3 py-6 text-center text-[11px] leading-relaxed text-ink/50">
                  {savedItems.length === 0
                    ? "No saved templates yet. Design something you love, then save it here to start the next invitation from it."
                    : "No saved templates match that search."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredSaved.map((item) => (                      <div
                        key={item._id}
                        className="flex flex-col gap-2 rounded-md border border-ink/12 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Bookmark className="size-3.5 shrink-0 text-[var(--red)]" />
                          <span className="min-w-0 flex-1 truncate font-ui text-[13px] font-semibold">
                            {item.name}
                          </span>
                          <FavouriteToggle
                            active={favourites.includes(
                              favouriteKey("saved", item._id),
                            )}
                            label={item.name}
                            onToggle={() =>
                              togglePin(favouriteKey("saved", item._id))
                            }
                          />
                        </div>
                        {item.description && (
                          <p className="text-[10px] leading-relaxed text-ink/55">
                            {item.description}
                          </p>
                        )}
                        <p className="text-[9px] uppercase tracking-[0.08em] text-ink/35">
                          Saved {new Date(item.updatedAt).toLocaleDateString()}
                        </p>
                        <div className="mt-auto flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => applySavedTemplate(item)}
                            className="h-7 flex-1 rounded-md px-2 text-[9px] uppercase tracking-[0.1em]"
                          >
                            Use template
                          </Button>
                          {confirmDelete === item._id ? (
                            <>
                              <Button
                                type="button"
                                onClick={() => void deleteSavedTemplate(item._id)}
                                className="h-7 rounded-md px-2 text-[9px] uppercase tracking-[0.1em]"
                              >
                                Delete
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setConfirmDelete(null)}
                                className="h-7 rounded-md px-2 text-[9px] uppercase"
                              >
                                No
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              aria-label={`Delete ${item.name}`}
                              onClick={() => setConfirmDelete(item._id)}
                              className="h-7 rounded-md px-2 text-ink/45"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                  ))}
                </div>
              )}
              <p className="border-t border-ink/10 pt-3 rounded-b-md text-[9px] leading-relaxed text-ink/40">
                Saved templates are stored with your own invitations and are
                never visible to guests or on a public link.
              </p>
            </div>
          )}

          {tab === "styles" && (
            <div>
              {filteredStyles.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink/45">
                  {onlyFavourites
                    ? "No favourite styles yet. Star one to keep it here."
                    : "No styles match that search."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredStyles.map((style) => (
                    <div key={style.name} className="relative">
                      <StyleCard
                        style={style}
                        selected={false}
                        onApply={() => handleApplyStyle(style)}
                      />
                      <FavouriteToggle
                        className="absolute right-2 top-2"
                        active={favourites.includes(
                          favouriteKey("style", style.name),
                        )}
                        label={style.name}
                        onToggle={() =>
                          togglePin(favouriteKey("style", style.name))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "type" && (
            <div>
              {filteredFonts.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink/45">
                  {onlyFavourites
                    ? "No favourite fonts yet. Star one to keep it here."
                    : "No fonts match that search."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredFonts.map((font) => (
                    <div key={font.id} className="relative">
                      <FontCard
                        font={font}
                        selected={font.id === selectedFontId}
                        onApply={() => handleApplyFont(font.id)}
                      />
                      <FavouriteToggle
                        className="absolute right-2 top-2"
                        active={favourites.includes(favouriteKey("font", font.id))}
                        label={font.name}
                        onToggle={() => togglePin(favouriteKey("font", font.id))}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t border-ink/10 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-meta text-[9px] uppercase tracking-[0.16em] text-ink/45">
                    Saved type styles
                  </p>
                  {selectedText && (
                    <span className="truncate text-[9px] text-ink/40">
                      from “{selectedText.name}”
                    </span>
                  )}
                </div>
                {selectedText ? (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={typeStyleName}
                      onChange={(event) => setTypeStyleName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveCurrentTypeStyle();
                      }}
                      placeholder={`${fontById(selectedText.font ?? "cormorant-garamond").name} ${Math.round(selectedText.fontSize ?? 0)} px`}
                      maxLength={80}
                      className="h-8 rounded-none border-ink/20 text-[12px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void saveCurrentTypeStyle()}
                      disabled={savingTypeStyle}
                      className="h-8 shrink-0 rounded-none px-3 text-[9px] uppercase tracking-[0.12em]"
                    >
                      <Save className="size-3.5" />
                      {savingTypeStyle ? "Saving" : "Save"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] leading-relaxed text-ink/45">
                    Select a text layer to save its family, size, weight,
                    spacing, case, and ink as a reusable style.
                  </p>
                )}
                {savedTypeStyles.length > 0 && (
                  <ul className="mt-2 divide-y divide-ink/10 border border-ink/10">
                    {savedTypeStyles.map((item) => (
                      <li
                        key={item._id}
                        className="flex items-center gap-1.5 px-2 py-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => applySavedTypeStyle(item)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-[11px] text-ink/80">
                            {item.name}
                          </span>
                          <span className="block truncate text-[8.5px] uppercase tracking-[0.08em] text-ink/35">
                            {item.description ?? "Type style"}
                          </span>
                        </button>
                        {confirmDelete === item._id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void deleteSavedTemplate(item._id)}
                              className="shrink-0 px-1 text-[9px] uppercase text-[var(--red)]"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(null)}
                              className="shrink-0 px-1 text-[9px] uppercase text-ink/40"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Delete ${item.name}`}
                            onClick={() => setConfirmDelete(item._id)}
                            className="shrink-0 p-1 text-ink/35 hover:text-[var(--red)]"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="mt-4 border-t border-ink/10 pt-3 text-[9px] leading-relaxed text-ink/40">
                {FONT_LIBRARY.length} open-source families. Applied to the
                selected text layer when one is chosen, otherwise shown for
                reference.
              </p>
            </div>
          )}

          {tab === "assets" && (
            <div className="space-y-4">                <div className="flex flex-wrap gap-1.5">
                  {BUILTIN_ASSET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setAssetCategory(cat);
                        setQuery("");
                      }}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[9px] uppercase tracking-[0.1em]",
                        assetCategory === cat
                          ? "border-[var(--red)] bg-[var(--red)] text-white"
                          : "border-ink/15 text-ink/50 hover:border-ink/45 hover:text-ink",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

              <div>
                {filteredAssets.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-ink/45">
                    {onlyFavourites
                      ? "No favourite assets yet. Star one to keep it here."
                      : "No assets match that search."}
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAssets.map((asset) => (
                      <div key={asset.id} className="relative">
                        <AssetCard
                          asset={asset}
                          onApply={() => onApplyBuiltinAsset(asset)}
                        />
                        <FavouriteToggle
                          className="absolute right-2 top-2"
                          active={favourites.includes(
                            favouriteKey("asset", asset.id),
                          )}
                          label={asset.name}
                          onToggle={() =>
                            togglePin(favouriteKey("asset", asset.id))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "frames" && (
            <div className="space-y-4">
              <div className="-mx-1 flex flex-wrap gap-1.5">
                {(["All", ...FRAME_GROUPS] as const).map((group) => (
                  <button
                    key={group}
                    type="button"
                    aria-pressed={frameGroup === group}
                    onClick={() => setFrameGroup(group)}
                    className={cn(
                      "min-h-7 rounded-full border px-2.5 text-[10px] uppercase tracking-[0.08em] transition-[background-color,border-color,color] duration-150",
                      frameGroup === group
                        ? "border-[var(--red)] bg-[var(--red)] text-white"
                        : "border-ink/15 text-ink/55 hover:border-ink/40 hover:text-ink",
                    )}
                  >
                    {group}
                  </button>
                ))}
              </div>

              <p className="rounded-md border border-ink/10 bg-[var(--paper-deep)]/50 px-3 py-2 text-[11px] leading-relaxed text-ink/50">
                Each frame is vector artwork on its own layer. Add it, then
                move, resize, rotate, recolour, or change its stroke weight like
                any other shape.
              </p>

              {filteredFrames.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-ink/45">
                  {onlyFavourites
                    ? "No favourite frames yet. Star one to keep it here."
                    : "No frames match that search."}
                </p>
              ) : (
                /* Two columns on a phone keeps each frame small enough to scan
                   without turning the sheet into a long scroll. */
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                  {filteredFrames.map((frame) => (
                    <div key={frame.id} className="relative">
                      <button
                        type="button"
                        onClick={() => onAddFrame(frame)}
                        aria-label={`Add the ${frame.name} frame`}
                        className="group flex w-full flex-col gap-2 rounded-xl border border-ink/12 bg-card p-2 text-left transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-premium)] hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-[0_10px_24px_rgba(21,21,21,0.08)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/60 focus-visible:outline-none"
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-ink/10 bg-[var(--paper-light)]">
                          <FrameThumb frame={frame} />
                          <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-md bg-ink/85 py-1 text-center text-[9px] uppercase tracking-[0.12em] text-[var(--paper-light)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Add frame
                          </span>
                        </div>
                        <span className="block truncate pr-7 text-[12px] font-medium tracking-[0.01em]">
                          {frame.name}
                        </span>
                        <span className="block truncate text-[9.5px] uppercase tracking-[0.1em] text-ink/45">
                          {frame.group}
                        </span>
                      </button>
                      <FavouriteToggle
                        className="absolute top-2 right-2"
                        active={favourites.includes(
                          favouriteKey("frame", frame.id),
                        )}
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
                        <span className="flex-1 truncate font-ui text-[13px] font-semibold">
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
            <div>                {filteredReveals.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-ink/45">
                    No reveal presets match that search.
                  </p>
                ) : (
                  <div className="rounded-lg border border-ink/10 p-2 sm:grid-cols-2 grid gap-2">
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
                          // Only the experience changes here: the suite's
                          // materials, envelope size, and palette stay.
                          onApplyOpening({
                            ...design.opening,
                            experience: experience.id as OpeningSettings["experience"],
                          });
                          onClose();
                        }}
                        className="flex flex-col gap-2 rounded-md border border-ink/12 p-3 text-left transition-[background-color,border-color,color] duration-150 hover:border-ink/40"
                      >
                        <div className="flex items-center gap-2.5">
                          <Sparkle className="size-4 text-[var(--red)]" />
                          <span className="flex-1 truncate font-ui text-[13px] font-semibold">
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

        <div className="border-t border-ink/12 px-4 py-2 text-[9px] text-ink/40">
          {tab === "templates" &&
            `${filteredTemplates.length} templates`}
          {tab === "saved" &&
            `${filteredSaved.length} saved template${filteredSaved.length === 1 ? "" : "s"}`}
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
