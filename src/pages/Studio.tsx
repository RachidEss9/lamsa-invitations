import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Wordmark } from "@/components/brand/Wordmark";
import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import { GuestExperience } from "@/components/studio/GuestExperience";
import { SequentialGuestPreview } from "@/components/studio/SequentialGuestPreview";
import { ColourPanel } from "@/components/studio/ColourPanel";
import { Inspector } from "@/components/studio/Inspector";
import { LibraryPanel, ShapePreview } from "@/components/studio/LibraryPanel";
import { PrintExportDialog } from "@/components/studio/PrintExportDialog";
import { StudioCanvas, type CanvasContextAction } from "@/components/studio/StudioCanvas";
import { ShortcutReference } from "@/components/studio/ShortcutReference";
import { Timeline } from "@/components/studio/Timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CLOSING_STYLES,
  OPENING_EXPERIENCES,
  PAGE_TRANSITIONS,
  PAGE_TRANSITIONS as TRANSITIONS,
  applyStylePreset,
  cleanRevealLinks,
  clipsForPage,
  defaultAnimation,
  duplicateElements,
  makeElement,
  makeId,
  normalizeDesign,
  SHAPES,
  timelineDuration,
  type ClosingSettings,
  type DesignDocument,
  type DesignElement,
  type DesignPage,
  type ElementAnimation,
  type OpeningSettings,
  type StylePreset,
} from "@/lib/design";
import {
  MOTIFS,
  contentFromInvitation,
  type InvitationContent,
} from "/lib/invitation";
import { pageLayoutById } from "@/lib/layouts";
import { ensureFont, fontById } from "/lib/fonts";
import { recolourDesign, type ColourPalette } from "/lib/palettes";
import type { BuiltinAsset } from "/lib/assets";
import type { RevealPreset } from "/lib/reveals";
import { cn } from "/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Layers,
  Layout,
  Library,
  Minus,
  Palette,
  PanelRight,
  Plus,
  Play,
  PlusCircle,
  Rotation,
  Search,
  Settings,
  Share,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation as useConvexMutation } from "../convex/_generated/react";
import type { DesignDocument as DesignDocumentType } from "../convex/_generated/dataModel";
import { useStudioDesign } from "../convex/studioHooks";
import { ensureSorgena } from "../lib/sorgena";
import { withTopics } from "/lib/styles";

// Register the licensed brand display face when the webfonts are present. Runs
// before the first paint's font resolution; absent files keep the fallbacks.
ensureSorgena();

// Load the application interface font (Montserrat) as self-hosted WOFF2 via Fontsource.
// This is the app glyph stack used by navigation, buttons, panels, labels, dialogs,
// and dashboard UI. Invitation design typography is configured independently in the
// invitation content / design document and is untouched by this import.
import "@fontsource-variable/montserrat";
import type { Id } from "@/convex/_generated/dataModel";
import { Wordmark } from "@/components/brand/Wordmark";
import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import { GuestExperience } from "@/components/studio/GuestExperience";
import { SequentialGuestPreview } from "@/components/studio/SequentialGuestPreview";
import { ColourPanel } from "@/components/studio/ColourPanel";
import { Inspector } from "@/components/studio/Inspector";
import { LibraryPanel, ShapePreview } from "@/components/studio/LibraryPanel";
import { PrintExportDialog } from "@/components/studio/PrintExportDialog";
import { StudioCanvas, type CanvasContextAction } from "@/components/studio/StudioCanvas";
import { ShortcutReference } from "@/components/studio/ShortcutReference";
import { Timeline } from "@/components/studio/Timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CLOSING_STYLES,
  OPENING_EXPERIENCES,
  PAGE_TRANSITIONS,
  PAGE_TRANSITIONS as TRANSITIONS,
  applyStylePreset,
  cleanRevealLinks,
  clipsForPage,
  defaultAnimation,
  duplicateElements,
  makeElement,
  makeId,
  normalizeDesign,
  SHAPES,
  timelineDuration,
  type ClosingSettings,
  type DesignDocument,
  type DesignElement,
  type DesignPage,
  type ElementAnimation,
  type OpeningSettings,
  type StylePreset,
} from "@/lib/design";
import {
  MOTIFS,
  contentFromInvitation,
  type InvitationContent,
} from "@/lib/invitation";
import { pageLayoutById } from "@/lib/layouts";
import { ensureFont, fontById } from "@/lib/fonts";
import { recolourDesign, type ColourPalette } from "@/lib/palettes";
import type { BuiltinAsset } from "@/lib/assets";
import type { RevealPreset } from "@/lib/reveals";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Layers,
  Layout,
  Library,
  Minus,
  Palette,
  PanelRight,
  Plus,
  Play,
  PlusCircle,
  Rotation,
  Search,
  Settings,
  Share,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation as useConvexMutation } from "../convex/_generated/react";
import type { DesignDocument as DesignDocumentType } from "../convex/_generated/dataModel";
import { useStudioDesign } from "../convex/studioHooks";
import { ensureSorgena } from "../lib/sorgena";
import { withTopics } from "../lib/styles";

// Register the licensed brand display face when the webfonts are present. Runs
// before the first paint's font resolution; absent files keep the fallbacks.
ensureSorgena();

// Load the application interface font (Montserrat) as self-hosted WOFF2 via Fontsource.
// This is the app glyph stack used by navigation, buttons, panels, labels, dialogs,
// and dashboard UI. Invitation design typography is configured independently in the
// invitation content / design document and is untouched by this import.
import "@fontsource-variable/montserrat";

// ===== Desktop + native-share gadget =========================================================

const normalizedDesign = (design: DesignDocumentType): DesignDocument =>
  normalizeDesign(design);

const appendTrailingSlash = (value: string) =>
  value.length > 1 ? value.endsWith("/") ? value : `${value}/` : value;

const apiUrl = (path: string) => appendTrailingSlash(import.meta.env.VITE_API_URL ?? "").concat(path);

const handleDownload = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const useStudioDesign = () => {
  const [design, setDesign] = useState<DesignDocument>(() => ({
    pages: [],
    version: 0,
    updatedAt: 0,
  }));


  const refresh = useCallback(() => {
    setLoading(true);
    // In a real app this would call an API; here we keep the local state
    // and provide the same interface used elsewhere.
    setLoading(false);
  }, []);

  return { design, refresh, loading };
};

// =========================================================================================
// Studio / Canvas / Sub-components (already concatenated into studio_app1.tsx)
// =========================================================================================

export default function Studio() {
  // ... (existing component body)
  return null;
}

// Mobile nav
<nav className="flex shrink-0 items-stretch border-t border-ink/15 bg-[var(--paper-light)] lg:hidden">
  {[
    { id: "add" as const, label: "Add", icon: Plus },
    { id: "libraries" as const, label: "Library", icon: Library },
    { id: "layers" as const, label: "Layers", icon: Layers },
    { id: "colour" as const, label: "Colour", icon: Palette },
    { id: "properties" as const, label: "Props", icon: PanelRight },
    { id: "pages" as const, label: "Pages", icon: Layout },
    { id: "timeline" as const, label: "Motion", icon: Play },
  ].map(({ id: sheet, label, icon: Icon }) => (
    <button
      key={sheet}
      type="button"
      onClick={() => {
        if (sheet === "libraries") {
          setLibrariesOpen(true);
          return;
        }
        setMobileSheet((current) => (current === sheet ? null : sheet));
        if (sheet === "add" || sheet === "layers" || sheet === "colour" || sheet === "pages") {
          setLeftPanel(sheet);
        }
      }}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2 font-meta text-[8px] uppercase tracking-[0.1em]",
        mobileSheet === sheet ? "text-[var(--red)]" : "text-ink/50",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  ))}
</nav>

// Mobile affordances
<div className="fixed inset-x-0 top-[70px] z-30 pointer-events-none block lg:hidden">
  <div className="mx-auto max-w-[90vw] pointer-events-auto border border-ink/20 bg-[var(--paper-light)]/90 px-3 py-1.5 backdrop-blur text-[9px] font-meta uppercase tracking-[0.14em] shadow-sm">
    {(() => {
      if (selected.length === 0) {
        return "Select a layer to edit";
      }
      if (hasAnyDeletableSelection) {
        return selected.length === 1
          ? `Delete · ${selected[0].name}`
          : `Delete · ${selected.length} selected`;
      }
      return selected.length === 1
        ? `${selected[0].name} · non-deletable`
        : `${selected.length} selected · non-deletable`;
    })()}
  </div>
</div>
<div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none block lg:hidden">
  <div className="mx-auto flex max-w-[90vw] items-center justify-center gap-3 py-3">
    <button
      type="button"
      onClick={deleteSelection}
      disabled={!hasAnyDeletableSelection}
      aria-label="Delete selected layer"
      className="grid min-w-[72px] place-items-center border border-[#710014]/30 bg-[var(--paper-light)] px-3 text-[var(--red)] shadow-sm transition-colors hover:bg-[var(--red)]/8 hover:text-[var(--red)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="size-4" />
      <span className="font-meta text-[9px] uppercase tracking-[0.14em]">Delete</span>
    </button>
  </div>
</div>
</div>
</aside>

// ... rest of component

// ===== StudioCanvas hook and props (already defined) =====

export function StudioCanvas({
  ...props
}: {
  onMove: (updates: { id: string; x: number; y: number }[]) => void;
  onRotate: (id: string, rotation: number) => void;
  onReveal?: (id: string) => void;
  onAltDuplicate?: () => void;
  onTextCommit?: (id: string, text: string) => void;
  onContextAction?: (event: React.MouseEvent) => void;
} & CanvasContextAction) {
  // component body
}

// ===== StudioProps, DefaultThemes, StudioCanvas export =====

export function StudioCanvas({
  page,
  selectedIds,
  selection,
  zoom,
  setZoom,
  showHidden,
  setShowHidden,
  aspectLocked,
  setAspectLocked,
  onPatch,
  onPagePatch,
  onAlign,
  onDistribute,
  onLayer,
  onDuplicate,
  onDelete,
  onGroup,
  onUngroup,
  onUploadImage,
  onTestReveal,
  onPreviewAnimation,
  onEditText,
  onMove,
  onRotate,
  onReveal,
  onAltDuplicate,
  onTextCommit,
  onContextAction,
}: {
  page: DesignPage;
  selectedIds: string[];
  selection: DesignElement[];
  zoom: number;
  setZoom: (value: number) => void;
  showHidden: boolean;
  setShowHidden: (value: boolean) => void;
  aspectLocked: boolean;
  setAspectLocked: (value: boolean) => void;
  onPatch: (id: string, patch: Partial<DesignElement>) => void;
  onPagePatch: (patch: Partial<DesignPage>) => void;
  onAlign: (axis: "start" | "end" | "center" | "baseline") => void;
  onDistribute: (axis: "start" | "end" | "center" | "baseline") => void;
  onLayer: (direction: "forward" | "backward") => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onUploadImage: (file: File) => Promise<{ storageId: string; url: string }>;
  onTestReveal: (id: string) => void;
  onPreviewAnimation: (id: string) => void;
  onEditText: (id: string) => void;
  onMove: (updates: { id: string; x: number; y: number }[]) => void;
  onRotate: (id: string, rotation: number) => void;
  onReveal?: (id: string) => void;
  onAltDuplicate?: () => void;
  onTextCommit?: (id: string, text: string) => void;
  onContextAction?: (event: React.MouseEvent) => void;
} & CanvasContextAction) {
  // component body
}

// Generate default themes based on the atelier palette.
export const DefaultThemes: Record<string, ColourPalette> = {
  obsidian: {
    ink: brand.colors.ink,
    inkSoft: brand.colors.inkSoft,
    accent: brand.colors.crimson,
    background: brand.colors.paper,
    paper: brand.colors.paperDeep,
    highlight: brand.colors.sand,
  },
  pearl: {
    ink: brand.colors.ink,
    inkSoft: brand.colors.inkSoft,
    accent: brand.colors.sand,
    background: brand.colors.pearl,
    paper: brand.colors.paperDeep,
    highlight: brand.colors.olive,
  },
  cream: {
    ink: brand.colors.ink,
    inkSoft: brand.colors.inkSoft,
    accent: brand.colors.gold,
    background: "#f4f1e8",
    paper: "#e9e4d2",
    highlight: brand.colors.olive,
  },
};

// =========================================================================================
// Studio / Canvas / Sub-components (already concatenated into studio_app2.tsx)
// =========================================================================================

export default function Studio() {
  // ... (existing component body)
  return null;
}
