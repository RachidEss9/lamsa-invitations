import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, type LucideIcon } from "lucide-react";
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
        aria-expanded={expanded}
        title={expanded ? "Collapse panel" : "Expand panel"}
        className="studio-panel-rail__button studio-panel-rail__toggle"
      >
        {expanded ? (
          <PanelLeftClose aria-hidden size={16} strokeWidth={1.7} />
        ) : (
          <PanelLeftOpen aria-hidden size={16} strokeWidth={1.7} />
        )}
        <span className="sr-only">
          {expanded ? `Collapse ${label}` : `Expand ${label}`}
        </span>
      </button>
    </nav>
  );
}

/** The heading that opens every studio panel. */
export function StudioPanelHeading({
  title,
  note,
  actions,
}: {
  title: string;
  note?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="studio-panel-heading">
      <div className="min-w-0">
        <p className="section-label">{title}</p>
        {note ? <p className="studio-panel-heading__note">{note}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
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
