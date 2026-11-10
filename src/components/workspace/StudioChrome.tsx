import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

export type StudioSaveTone = "saved" | "saving" | "unsaved" | "error";

const SAVE_COLOR: Record<StudioSaveTone, string> = {
  saved: "var(--olive)",
  saving: "var(--gold)",
  unsaved: "var(--gold)",
  error: "var(--red)",
};

/**
 * The application bar shared by both creative studios.
 *
 * It answers three questions in a fixed order: which LAMSA studio am I in,
 * which document is open and whether it is safe, and what can I do with it.
 * Everything contextual lives below it, never in the global bar.
 */
export function StudioHeader({
  product,
  title,
  meta,
  onBack,
  backLabel,
  center,
  actions,
  className,
}: {
  product: string;
  title: ReactNode;
  meta?: ReactNode;
  onBack: () => void;
  backLabel: string;
  center?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("studio-topbar", className)} data-studio-header>
      <div className="studio-topbar__identity">
        <button
          type="button"
          onClick={onBack}
          className="studio-back-button"
          aria-label={backLabel}
          title={backLabel}
        >
          <ArrowLeft className="size-4" strokeWidth={1.7} aria-hidden />
        </button>
        <Link
          to="/dashboard"
          className="studio-brand"
          aria-label="LAMSA — back to the studio"
          title="LAMSA Studio"
        >
          <img
            src={brand.logos.symbolCrimson}
            alt=""
            aria-hidden
            draggable={false}
            className="studio-brand__symbol"
          />
        </Link>
        <span className="studio-brand__rule" aria-hidden />
        <div className="min-w-0">
          <p className="studio-context">
            <span>LAMSA</span>
            <span aria-hidden className="studio-context__slash">/</span>
            <span className="studio-context__product">{product}</span>
          </p>
          <div className="studio-title-row">{title}</div>
          {meta ? <div className="studio-meta-line">{meta}</div> : null}
        </div>
      </div>

      {center ? <div className="studio-topbar__center">{center}</div> : null}

      <div className="studio-topbar__actions">{actions}</div>
    </header>
  );
}

/** A compact status pill used in the document identity. */
export function StudioSaveState({
  tone,
  label,
  onClick,
  title,
}: {
  tone: StudioSaveTone;
  label: string;
  onClick?: () => void;
  title?: string;
}) {
  const content = (
    <>
      <span
        aria-hidden
        className="studio-save-state__dot"
        style={{ background: SAVE_COLOR[tone] }}
      />
      {label}
    </>
  );
  if (!onClick) {
    return (
      <span className="studio-save-state" title={title}>
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="studio-save-state"
      title={title}
    >
      {content}
    </button>
  );
}

export interface StudioPanelItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

/**
 * The vertical icon rail that fronts a studio's panel column. Both editors use
 * the same shape, tooltip and selected state; only the panel list differs.
 */
export function StudioPanelRail<T extends string>({
  label,
  items,
  active,
  expanded,
  onSelect,
  onToggle,
}: {
  label: string;
  items: readonly StudioPanelItem<T>[];
  active: T;
  expanded: boolean;
  onSelect: (id: T) => void;
  onToggle: () => void;
}) {
  return (
    <nav className="studio-panel-rail" aria-label={label}>
      <div className="studio-panel-rail__items">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = expanded && active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selected}
              title={item.label}
              className="studio-panel-rail__button"
              data-active={selected}
            >
              <Icon aria-hidden size={16} strokeWidth={1.7} />
              <span className="sr-only">{item.label}</span>
              <span aria-hidden className="studio-panel-rail__tip">{item.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onToggle}
        title={`Hide ${label}`}
        className="studio-panel-rail__button studio-panel-rail__toggle"
      >
        <PanelLeftClose aria-hidden size={16} strokeWidth={1.7} />
        <span className="sr-only">{`Hide ${label}`}</span>
        <span aria-hidden className="studio-panel-rail__tip">{`Hide ${label}`}</span>
      </button>
    </nav>
  );
}

/**
 * The heading that opens every studio panel. When a `collapse` handler is
 * supplied it also carries the panel's own show/hide control, so the column can
 * be folded away without losing the tool rail beside it.
 */
export function StudioPanelHeading({
  title,
  note,
  actions,
  collapse,
}: {
  title: string;
  note?: string;
  actions?: ReactNode;
  collapse?: {
    open: boolean;
    onToggle: () => void;
    label: string;
    side?: "left" | "right";
  };
}) {
  const CollapseIcon =
    collapse?.side === "right"
      ? collapse.open
        ? PanelRightClose
        : PanelRightOpen
      : collapse?.open
        ? PanelLeftClose
        : PanelLeftOpen;

  return (
    <div className="studio-panel-heading">
      <div className="min-w-0">
        <p className="section-label">{title}</p>
        {note ? <p className="studio-panel-heading__note">{note}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        {collapse ? (
          <button
            type="button"
            onClick={collapse.onToggle}
            aria-expanded={collapse.open}
            aria-label={
              collapse.open ? `Hide ${collapse.label}` : `Show ${collapse.label}`
            }
            title={
              collapse.open ? `Hide ${collapse.label}` : `Show ${collapse.label}`
            }
            className="studio-icon-button"
          >
            <CollapseIcon className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The control pair every studio header carries: fold the left panel, fold the
 * inspector, or give the canvas the whole window in one press.
 *
 * These are desktop affordances only — the compact layout keeps its dock.
 */
export function StudioPaneControls({
  leftOpen,
  rightOpen,
  leftLabel = "left panel",
  rightLabel = "inspector",
  onToggleLeft,
  onToggleRight,
  onToggleBoth,
}: {
  leftOpen: boolean;
  rightOpen: boolean;
  leftLabel?: string;
  rightLabel?: string;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleBoth: () => void;
}) {
  const bothHidden = !leftOpen && !rightOpen;
  return (
    <div className="studio-pane-controls">
      <button
        type="button"
        onClick={onToggleLeft}
        aria-pressed={leftOpen}
        aria-label={leftOpen ? `Hide ${leftLabel}` : `Show ${leftLabel}`}
        title={
          leftOpen ? `Hide ${leftLabel} (Alt+[)` : `Show ${leftLabel} (Alt+[)`
        }
        className="studio-icon-button"
      >
        {leftOpen ? (
          <PanelLeftClose className="size-4" aria-hidden />
        ) : (
          <PanelLeftOpen className="size-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={onToggleBoth}
        aria-pressed={bothHidden}
        aria-label={bothHidden ? "Restore side panels" : "Maximize canvas"}
        title={
          bothHidden
            ? "Restore side panels (Alt+\\)"
            : "Maximize canvas — hide both panels (Alt+\\)"
        }
        className="studio-icon-button studio-pane-controls__both"
        data-active={bothHidden}
      >
        {bothHidden ? (
          <Minimize2 className="size-4" aria-hidden />
        ) : (
          <Maximize2 className="size-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={onToggleRight}
        aria-pressed={rightOpen}
        aria-label={rightOpen ? `Hide ${rightLabel}` : `Show ${rightLabel}`}
        title={
          rightOpen ? `Hide ${rightLabel} (Alt+])` : `Show ${rightLabel} (Alt+])`
        }
        className="studio-icon-button"
      >
        {rightOpen ? (
          <PanelRightClose className="size-4" aria-hidden />
        ) : (
          <PanelRightOpen className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}

/**
 * The persistent edge control that brings a hidden panel back. It sits against
 * the canvas edge, never over the artwork, and is anchored for screen readers.
 */
export function StudioReopenHandle({
  side,
  label,
  onOpen,
}: {
  side: "left" | "right";
  label: string;
  onOpen: () => void;
}) {
  const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;
  return (
    <div className={side === "left" ? "studio-float-left" : "studio-float-right"}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        title={label}
        className="studio-float-button"
      >
        <Icon className="size-4" aria-hidden />
        <span className="studio-float-button__tip" aria-hidden>
          {label}
        </span>
      </button>
    </div>
  );
}



export interface StudioDockItem {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

/** The five-slot mobile dock. Extra tools live behind "More". */
export function StudioDock({
  items,
  onSelect,
  label = "Studio tools",
}: {
  items: readonly StudioDockItem[];
  onSelect: (id: string) => void;
  label?: string;
}) {
  return (
    <nav className="studio-dock" aria-label={label}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="studio-dock__item"
            data-active={Boolean(item.active)}
            aria-pressed={item.active}
          >
            <Icon aria-hidden size={18} strokeWidth={1.7} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
