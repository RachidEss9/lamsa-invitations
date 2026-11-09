import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Columns3,
  Eye,
  FileDown,
  Grid2x2,
  History,
  Image as ImageIcon,
  LayoutTemplate,
  Lightbulb,
  Maximize2,
  Minus,
  PanelLeft,
  PanelRight,
  Plus,
  Redo2,
  Ruler,
  ShieldCheck,
  Sparkles,
  Square,
  SquareDashed,
  Type as TypeIcon,
  Undo2,
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
import { StudioHeader, StudioSaveState } from "@/components/workspace/StudioChrome";
import { zoomPercent } from "@/lib/publishing/viewport";
import { cn } from "@/lib/utils";

/**
 * The publishing workspace bar.
 *
 * Document identity sits on the left, view controls in the centre and document
 * actions on the right. Nothing here is decorative: each control is bound to
 * the same editor session and history as before the redesign.
 */

export interface SaveStatusView {
  status: PublishingSaveStatus;
  message?: string;
}

const SAVE_LABEL: Record<PublishingSaveStatus, string> = {
  saved: "Saved",
  unsaved: "Unsaved",
  saving: "Saving",
  error: "Save failed",
  conflict: "Changed elsewhere",
};

const SAVE_TONE: Record<PublishingSaveStatus, "saved" | "unsaved" | "saving" | "error"> = {
  saved: "saved",
  unsaved: "unsaved",
  saving: "saving",
  error: "error",
  conflict: "error",
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
  leftOpen?: boolean;
  rightOpen?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
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
    <button
      type="button"
      title={title ?? label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="studio-tool"
      data-active={active}
    >
      {children}
    </button>
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
    leftOpen = true,
    rightOpen = true,
    onToggleLeft,
    onToggleRight,
  } = props;

  const chromeItems: Array<[keyof PageChrome, string, ReactNode]> = [
    ["guides", "Guides", <Ruler key="guides" className="size-3.5" />],
    ["margins", "Margins", <SquareDashed key="margins" className="size-3.5" />],
    ["columns", "Column grid", <Columns3 key="columns" className="size-3.5" />],
    ["baseline", "Baseline grid", <Grid2x2 key="baseline" className="size-3.5" />],
    ["bleed", "Bleed outline", <LayoutTemplate key="bleed" className="size-3.5" />],
  ];

  return (
    <StudioHeader
      product="Publishing Studio"
      backLabel="Back to the publishing library"
      onBack={onBack}
      title={
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          onBlur={onTitleCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.currentTarget.blur();
            }
          }}
          aria-label="Publication title"
          spellCheck={false}
          className="studio-title-input"
        />
      }
      meta={
        <>
          <StudioSaveState
            tone={SAVE_TONE[save.status]}
            label={SAVE_LABEL[save.status]}
            title={save.message ?? SAVE_LABEL[save.status]}
          />
          <span aria-hidden className="studio-meta-separator" />
          <span>
            Page {pageCount > 0 ? pageIndex + 1 : "—"} of {pageCount || "—"}
          </span>
          <span aria-hidden className="studio-meta-separator" />
          <span className="truncate">{spreadLabel}</span>
        </>
      }
      center={
        <>
          <div className="studio-toolgroup">
            <ToolButton
              label="Previous page"
              onClick={onPreviousPage}
              disabled={!canGoPrevious || busy}
            >
              <ChevronLeft className="size-4" />
            </ToolButton>
            <button
              type="button"
              title={`${spreadLabel} — click to fit`}
              onClick={onFit}
              className="min-w-[5.4rem] px-1 text-center font-meta text-[0.58rem] uppercase tracking-[0.08em] text-ink/70 transition-colors hover:text-[var(--red)]"
            >
              {pageCount > 0 ? `${pageIndex + 1} / ${pageCount}` : "—"}
              <span className="ml-1.5 hidden text-ink/35 xl:inline">{spreadLabel}</span>
            </button>
            <ToolButton
              label="Next page"
              onClick={onNextPage}
              disabled={!canGoNext || busy}
            >
              <ChevronRight className="size-4" />
            </ToolButton>
          </div>

          <div className="studio-toolgroup">
            <ToolButton label="Zoom out" onClick={onZoomOut}>
              <Minus className="size-3.5" />
            </ToolButton>
            <button
              type="button"
              onClick={onZoomReset}
              title="Reset to 100%"
              className="min-w-[2.8rem] px-1 text-center font-meta text-[0.56rem] tabular-nums text-ink/75 transition-colors hover:text-[var(--red)]"
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
        </>
      }
      actions={
        <>
          {onToggleLeft ? (
            <button
              type="button"
              onClick={onToggleLeft}
              aria-label={leftOpen ? "Hide left panel" : "Show left panel"}
              aria-pressed={leftOpen}
              title={leftOpen ? "Hide left panel" : "Show left panel"}
              className="studio-icon-button hidden lg:grid"
            >
              <PanelLeft className="size-4" aria-hidden />
            </button>
          ) : null}
          {onToggleRight ? (
            <button
              type="button"
              onClick={onToggleRight}
              aria-label={rightOpen ? "Hide inspector" : "Show inspector"}
              aria-pressed={rightOpen}
              title={rightOpen ? "Hide inspector" : "Show inspector"}
              className="studio-icon-button hidden lg:grid"
            >
              <PanelRight className="size-4" aria-hidden />
            </button>
          ) : null}
          <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-[var(--workspace-line)] lg:block" />

          <div className="studio-toolgroup">
            <ToolButton
              label="Undo"
              title="Undo the last edit (⌘/Ctrl+Z)"
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
              <button
                type="button"
                className="studio-action-button studio-action-button--quiet hidden px-2 sm:inline-flex"
                aria-label="Insert"
                title="Insert an object"
              >
                <Plus className="size-3.5" aria-hidden />
                <span className="hidden xl:inline">Insert</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>New object on this page</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onInsertText} className="gap-2 text-[0.78rem]">
                <TypeIcon className="size-3.5" /> Text frame
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onInsertShape("rectangle")}
                className="gap-2 text-[0.78rem]"
              >
                <Square className="size-3.5" /> Rectangle
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onInsertShape("ellipse")}
                className="gap-2 text-[0.78rem]"
              >
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="studio-action-button studio-action-button--quiet hidden px-2 md:inline-flex"
                aria-label="View"
                title="Drawing aids"
              >
                <Grid2x2 className="size-3.5" aria-hidden />
                <span className="hidden xl:inline">View</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Drawing aids</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {chromeItems.map(([key, label, icon]) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => onToggleChrome(key)}
                  className="gap-2 text-[0.78rem]"
                >
                  {icon}
                  <span className="flex-1">{label}</span>
                  {chrome[key] ? <Check className="size-3.5 text-[var(--red)]" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="studio-action-button studio-action-button--quiet px-2"
                aria-label="Document"
                title="Document tools"
              >
                <BookOpen className="size-3.5" aria-hidden />
                <span className="hidden lg:inline">Document</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Publication tools</DropdownMenuLabel>
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

          <button
            type="button"
            onClick={onTogglePreview}
            aria-label={preview ? "Leave preview" : "Preview without guides"}
            aria-pressed={preview}
            title={preview ? "Leave preview" : "Preview without guides"}
            className="studio-icon-button"
            data-active={preview}
          >
            <Eye className="size-4" aria-hidden />
          </button>

          <Button
            type="button"
            onClick={onOpenExport}
            disabled={busy}
            className="hidden h-[1.95rem] gap-1.5 rounded-[8px] px-3 text-[0.58rem] uppercase tracking-[0.1em] sm:inline-flex"
          >
            <FileDown className="size-3.5" aria-hidden />
            <span className="hidden xl:inline">Export</span>
          </Button>
        </>
      }
      className={cn(preview && "bg-[color-mix(in_oklab,var(--surface-overlay)_98%,transparent)]")}
    />
  );
}
