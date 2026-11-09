import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Circle,
  Columns3,
  Eye,
  FileDown,
  BookOpen,
  Grid2x2,
  History,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  LayoutTemplate,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  Square,
  SquareDashed,
  Type as TypeIcon,
  Undo2,
  Ruler,
} from "lucide-react";
import type { ReactNode } from "react";

import type { PublishingSaveStatus } from "@/lib/publishing/editor-save";
import type { PageChrome } from "./PageView";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zoomPercent } from "@/lib/publishing/viewport";
import { cn } from "@/lib/utils";

/**
 * The editor's only toolbar. Every control here does exactly one real thing:
 * navigate pages, change the real zoom, undo, insert an object that the model
 * stores, toggle a chrome overlay, or save. Nothing fakes progress and nothing
 * is present for decoration.
 */

export interface SaveStatusView {
  status: PublishingSaveStatus;
  message?: string;
}

const SAVE_LABEL: Record<PublishingSaveStatus, string> = {
  saved: "Saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Save failed",
  conflict: "Changed elsewhere",
};

const SAVE_DOT: Record<PublishingSaveStatus, string> = {
  saved: "bg-[var(--olive)]",
  unsaved: "bg-[var(--gold)]",
  saving: "bg-[var(--gold)] animate-pulse",
  error: "bg-[var(--red)]",
  conflict: "bg-[var(--red)]",
};

export interface EditorToolbarProps {
  title: string;
  onTitleChange: (title: string) => void;
  onTitleCommit: () => void;
  save: SaveStatusView;
  pageIndex: number;
  pageCount: number;
  spreadLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  preview: boolean;
  onTogglePreview: () => void;
  chrome: PageChrome;
  onToggleChrome: (key: keyof PageChrome) => void;
  onInsertText: () => void;
  onInsertShape: (shape: "rectangle" | "ellipse") => void;
  onInsertLine: () => void;
  onOpenAssets: () => void;
  onOpenPreflight: () => void;
  onOpenExport: () => void;
  onOpenSmartAlbum: () => void;
  onOpenAssist: () => void;
  onOpenVersions: () => void;
  busy?: boolean;
  onBack: () => void;
}

function ToolButton({
  label,
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title ?? label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "size-7 rounded-[3px] text-[var(--ink-soft)] hover:bg-[color-mix(in_oklab,var(--ink)_7%,transparent)] hover:text-[var(--ink)]",
        active && "bg-[color-mix(in_oklab,var(--red)_10%,transparent)] text-[var(--red)]",
      )}
    >
      {children}
    </Button>
  );
}

export function EditorToolbar(props: EditorToolbarProps) {
  const {
    title,
    onTitleChange,
    onTitleCommit,
    save,
    pageIndex,
    pageCount,
    spreadLabel,
    canGoPrevious,
    canGoNext,
    onPreviousPage,
    onNextPage,
    zoom,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onFit,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    preview,
    onTogglePreview,
    chrome,
    onToggleChrome,
    onInsertText,
    onInsertShape,
    onInsertLine,
    onOpenAssets,
    onOpenPreflight,
    onOpenExport,
    onOpenSmartAlbum,
    onOpenAssist,
    onOpenVersions,
    busy,
    onBack,
  } = props;

  return (
    <header className="flex min-h-12 shrink-0 flex-wrap items-stretch border-b border-[var(--rule)] bg-[var(--paper-light)] lg:h-12 lg:flex-nowrap">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pl-2 pr-2 lg:flex-none lg:py-0 lg:pr-3">
        <ToolButton label="Back to the library" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-[var(--rule)]" />
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          onBlur={onTitleCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") event.currentTarget.blur();
          }}
          aria-label="Publication title"
          spellCheck={false}
          className="w-[clamp(72px,26vw,260px)] truncate border-0 bg-transparent font-display lg:w-[clamp(120px,18vw,260px)] text-[0.95rem] leading-6 tracking-[0.01em] text-[var(--ink)] outline-none focus-visible:bg-[color-mix(in_oklab,var(--ink)_4%,transparent)]"
        />
        <span
          className="flex items-center gap-1.5 rounded-full border border-[var(--rule)] px-2 py-[3px] font-meta text-[0.55rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]"
          title={save.message ?? SAVE_LABEL[save.status]}
        >
          <span className={cn("size-1.5 rounded-full", SAVE_DOT[save.status])} />
          {SAVE_LABEL[save.status]}
        </span>
      </div>

      <div className="order-3 flex w-full flex-1 items-center justify-center gap-1 border-t border-[var(--rule)] py-1 lg:order-none lg:w-auto lg:border-0 lg:py-0">
        <div className="flex items-center rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-0.5">
          <ToolButton label="Previous page" onClick={onPreviousPage} disabled={!canGoPrevious || busy}>
            <ChevronLeft className="size-4" />
          </ToolButton>
          <span
            title={spreadLabel}
            className="min-w-[86px] px-1 text-center font-meta text-[0.62rem] uppercase tracking-[0.08em] text-[var(--ink)]"
          >
            {pageCount > 0 ? `${pageIndex + 1} / ${pageCount}` : "—"}
            <span className="ml-1.5 hidden text-[color-mix(in_oklab,var(--ink-soft)_80%,transparent)] sm:inline">
              {spreadLabel}
            </span>
          </span>
          <ToolButton label="Next page" onClick={onNextPage} disabled={!canGoNext || busy}>
            <ChevronRight className="size-4" />
          </ToolButton>
        </div>

        <span className="mx-1 h-5 w-px bg-[var(--rule)]" />

        <div className="flex items-center rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-0.5">
          <ToolButton label="Zoom out" onClick={onZoomOut}>
            <Minus className="size-3.5" />
          </ToolButton>
          <button
            type="button"
            onClick={onZoomReset}
            title="Reset to 100%"
            className="min-w-[46px] px-1 text-center font-meta text-[0.62rem] tabular-nums text-[var(--ink)] hover:text-[var(--red)]"
          >
            {zoomPercent(zoom)}%
          </button>
          <ToolButton label="Zoom in" onClick={onZoomIn}>
            <Plus className="size-3.5" />
          </ToolButton>
          <ToolButton label="Fit spread" onClick={onFit}>
            <Maximize2 className="size-3.5" />
          </ToolButton>
        </div>
      </div>

      <div className="flex items-center gap-1 pr-1 lg:pr-2">
        <div className="hidden items-center rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-0.5 lg:flex">
          <ToolButton label="Guides" active={chrome.guides} onClick={() => onToggleChrome("guides")}>
            <Ruler className="size-3.5" />
          </ToolButton>
          <ToolButton label="Margins" active={chrome.margins} onClick={() => onToggleChrome("margins")}>
            <SquareDashed className="size-3.5" />
          </ToolButton>
          <ToolButton label="Column grid" active={chrome.columns} onClick={() => onToggleChrome("columns")}>
            <Columns3 className="size-3.5" />
          </ToolButton>
          <ToolButton label="Baseline grid" active={chrome.baseline} onClick={() => onToggleChrome("baseline")}>
            <Grid2x2 className="size-3.5" />
          </ToolButton>
          <ToolButton label="Bleed outline" active={chrome.bleed} onClick={() => onToggleChrome("bleed")}>
            <LayoutTemplate className="size-3.5" />
          </ToolButton>
        </div>

        <span className="mx-1 h-5 w-px bg-[var(--rule)]" />

        <div className="flex items-center rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-0.5">
          <ToolButton
            label="Undo"
            title="Undo the last edit, including page, master and layer commands (⌘/Ctrl+Z)"
            onClick={onUndo}
            disabled={!canUndo || busy}
          >
            <Undo2 className="size-4" />
          </ToolButton>
          <ToolButton
            label="Redo"
            title="Redo the last undone edit (⇧⌘/Ctrl+Shift+Z)"
            onClick={onRedo}
            disabled={!canRedo || busy}
          >
            <Redo2 className="size-4" />
          </ToolButton>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              className="h-7 gap-1.5 rounded-[3px] px-2 font-meta text-[0.6rem] uppercase tracking-[0.1em] text-[var(--ink)] hover:bg-[color-mix(in_oklab,var(--ink)_7%,transparent)]"
            >
              <BookOpen className="size-3.5" /> Document
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-meta text-[0.55rem] uppercase tracking-[0.12em]">
              Publication tools
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOpenPreflight} className="gap-2 text-[0.78rem]">
              <ShieldCheck className="size-3.5" /> Preflight…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onOpenExport} className="gap-2 text-[0.78rem]">
              <FileDown className="size-3.5" /> Export PDF…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onOpenVersions} className="gap-2 text-[0.78rem]">
              <History className="size-3.5" /> Named versions…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOpenSmartAlbum} className="gap-2 text-[0.78rem]">
              <Sparkles className="size-3.5" /> Smart Album…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onOpenAssist} className="gap-2 text-[0.78rem]">
              <Lightbulb className="size-3.5" /> Layout suggestions…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || preview}
              className="h-7 gap-1.5 rounded-[3px] px-2 font-meta text-[0.6rem] uppercase tracking-[0.1em] text-[var(--ink)] hover:bg-[color-mix(in_oklab,var(--ink)_7%,transparent)]"
            >
              <Plus className="size-3.5" /> Insert
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-meta text-[0.55rem] uppercase tracking-[0.12em]">
              New object on this page
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onInsertText} className="gap-2 text-[0.78rem]">
              <TypeIcon className="size-3.5" /> Text frame
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onInsertShape("rectangle")} className="gap-2 text-[0.78rem]">
              <Square className="size-3.5" /> Rectangle
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onInsertShape("ellipse")} className="gap-2 text-[0.78rem]">
              <Circle className="size-3.5" /> Ellipse
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onInsertLine} className="gap-2 text-[0.78rem]">
              <Minus className="size-3.5" /> Rule / line
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOpenAssets} className="gap-2 text-[0.78rem]">
              <ImageIcon className="size-3.5" /> Place artwork…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolButton label={preview ? "Leave preview" : "Preview without guides"} active={preview} onClick={onTogglePreview}>
          <Eye className="size-4" />
        </ToolButton>
      </div>
    </header>
  );
}
