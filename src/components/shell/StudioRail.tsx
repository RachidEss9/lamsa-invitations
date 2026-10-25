import { BrandSymbol, Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

export interface RailChild {
  id: string;
  label: string;
  /** Small colour dot, as in the reference navigation. */
  dot: string;
  to?: string;
  onSelect?: () => void;
  active?: boolean;
}

export interface RailEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  onSelect?: () => void;
  active?: boolean;
  badge?: number | string;
  children?: RailChild[];
}

export interface RailSection {
  id: string;
  label: string;
  entries: RailEntry[];
}

interface StudioRailProps {
  sections: RailSection[];
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
  /** Called after a navigation row is used, for closing a mobile sheet. */
  onNavigate?: () => void;
  footer?: ReactNode;
  className?: string;
}

function RowBody({
  entry,
  collapsed,
  expanded,
}: {
  entry: RailEntry;
  collapsed: boolean;
  expanded: boolean;
}) {
  const Icon = entry.icon;
  return (
    <>
      <Icon
        className="size-[17px] shrink-0"
        strokeWidth={1.65}
        aria-hidden
      />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{entry.label}</span>
          {entry.badge !== undefined && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#f4f2ec] px-1 text-[10px] font-semibold tabular-nums text-[#171716]">
              {entry.badge}
            </span>
          )}
          {entry.children && entry.children.length > 0 && (
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          )}
        </>
      )}
      {collapsed && entry.children && entry.children.length > 0 && (
        <span
          aria-hidden
          className="absolute right-1.5 bottom-1.5 size-1 rounded-full bg-[#f4f2ec]/70"
        />
      )}
    </>
  );
}

/**
 * The studio's navigation rail.
 *
 * A single obsidian panel holds every destination: grouped sections, a coloured
 * dot for each nested view, count badges, and — when the panel is folded to its
 * icon rail — a paper-white tooltip that follows the pointer. The rail is the
 * only dark surface in the interface, so the ivory workspace keeps all of its
 * contrast for the invitation being designed.
 */
export function StudioRail({
  sections,
  collapsed,
  onCollapsedChange,
  onNavigate,
  footer,
  className,
}: StudioRailProps) {
  const [open, setOpen] = useState<string | null>(
    sections
      .flatMap((section) => section.entries)
      .find((entry) => entry.children?.some((child) => child.active))?.id ?? null,
  );

  const itemClass = (active: boolean, collapsed: boolean) =>
    cn(
      "rail-item pressable relative flex w-full items-center gap-3 rounded-[13px] text-left text-[13px] font-medium",
      collapsed ? "h-10 justify-center px-0" : "h-10 px-3",
      active
        ? "bg-[var(--rail-active)] text-[var(--rail-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        : "text-[color:var(--rail-muted)] hover:bg-white/[0.045] hover:text-[var(--rail-ink)]",
    );

  return (
    <nav
      aria-label="Studio navigation"
      className={cn(
        "rail relative z-30 flex h-full shrink-0 flex-col rounded-[var(--radius-rail)] shadow-[var(--shadow-float)] transition-[width] duration-[var(--dur-2)] ease-[var(--ease-soft)]",
        collapsed ? "w-[68px]" : "w-[238px]",
        className,
      )}
    >
      {/* Window dots and the fold control, borrowed from the reference shell. */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-4 pt-4",
          collapsed && "justify-center px-0",
        )}
      >
        {!collapsed && (
          <span className="flex items-center gap-1.5" aria-hidden>
            <span className="size-[9px] rounded-full bg-[#f36f63]" />
            <span className="size-[9px] rounded-full bg-[#f5bf5a]" />
            <span className="size-[9px] rounded-full bg-[#5ec46a]" />
          </span>
        )}
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          className={cn(
            "pressable grid size-7 shrink-0 place-items-center rounded-full text-[color:var(--rail-muted)] hover:bg-white/[0.07] hover:text-[var(--rail-ink)]",
            !collapsed && "ml-auto",
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" aria-hidden />
          ) : (
            <ChevronLeft className="size-3.5" aria-hidden />
          )}
        </button>
      </div>

      <div className={cn("flex items-center gap-2.5 px-4 pt-5", collapsed && "justify-center px-0")}>
        {collapsed ? (
          <BrandSymbol tone="paper" className="h-[15px]" />
        ) : (
          <>
            <Wordmark tone="paper" className="h-[17px]" />
            <span className="font-meta text-[8px] uppercase tracking-[0.26em] text-[color:var(--rail-muted)]">
              Atelier
            </span>
          </>
        )}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-visible px-2.5 pb-2">
        {sections.map((section) => (
          <div key={section.id} className="flex flex-col gap-0.5">
            {!collapsed && (
              <p className="px-3 pt-1 pb-2 font-meta text-[8.5px] uppercase tracking-[0.24em] text-[color:var(--rail-muted)]/80">
                {section.label}
              </p>
            )}
            {collapsed && (
              <span
                aria-hidden
                className="mx-auto mb-1.5 h-px w-6 bg-[color:var(--rail-line)]"
              />
            )}
            {section.entries.map((entry) => {
              const active = Boolean(entry.active);
              const expanded = open === entry.id;
              const content = (
                <RowBody
                  entry={entry}
                  collapsed={collapsed}
                  expanded={expanded}
                />
              );

              return (
                <div key={entry.id} className="relative">
                  {entry.to ? (
                    <Link
                      to={entry.to}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={itemClass(active, collapsed)}
                    >
                      {content}
                      {collapsed && <span className="rail-tip">{entry.label}</span>}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      aria-expanded={
                        entry.children && entry.children.length > 0
                          ? expanded
                          : undefined
                      }
                      onClick={() => {
                        if (entry.children && entry.children.length > 0) {
                          setOpen(expanded ? null : entry.id);
                          return;
                        }
                        entry.onSelect?.();
                        onNavigate?.();
                      }}
                      className={itemClass(active, collapsed)}
                    >
                      {content}
                      {collapsed && <span className="rail-tip">{entry.label}</span>}
                    </button>
                  )}

                  {!collapsed &&
                    expanded &&
                    entry.children?.map((child) =>
                      child.to ? (
                        <Link
                          key={child.id}
                          to={child.to}
                          onClick={onNavigate}
                          aria-current={child.active ? "page" : undefined}
                          className={cn(
                            "pressable flex h-9 items-center gap-3 rounded-[11px] pl-11 pr-3 text-[12.5px]",
                            child.active
                              ? "text-[var(--rail-ink)]"
                              : "text-[color:var(--rail-muted)] hover:text-[var(--rail-ink)]",
                          )}
                        >
                          <span
                            aria-hidden
                            className="size-[7px] shrink-0 rounded-full"
                            style={{ background: child.dot }}
                          />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      ) : (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => {
                            child.onSelect?.();
                            onNavigate?.();
                          }}
                          className={cn(
                            "pressable flex h-9 w-full items-center gap-3 rounded-[11px] pl-11 pr-3 text-left text-[12.5px]",
                            child.active
                              ? "text-[var(--rail-ink)]"
                              : "text-[color:var(--rail-muted)] hover:text-[var(--rail-ink)]",
                          )}
                        >
                          <span
                            aria-hidden
                            className="size-[7px] shrink-0 rounded-full"
                            style={{ background: child.dot }}
                          />
                          <span className="truncate">{child.label}</span>
                        </button>
                      ),
                    )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {footer && (
        <div
          className={cn(
            "mt-auto border-t border-[color:var(--rail-line)] p-2.5",
            collapsed && "px-2",
          )}
        >
          {footer}
        </div>
      )}
    </nav>
  );
}

/** The rail's own row styling, reused by the mobile sheet footer. */
export function RailAction({
  icon: Icon,
  label,
  onClick,
  collapsed,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  collapsed?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rail-item pressable relative flex h-10 w-full items-center gap-3 rounded-[13px] text-left text-[13px] font-medium text-[color:var(--rail-muted)] hover:bg-white/[0.045] hover:text-[var(--rail-ink)]",
        collapsed ? "justify-center px-0" : "px-3",
        danger && "hover:text-[#ff8f8f]",
      )}
    >
      <Icon className="size-[17px] shrink-0" strokeWidth={1.65} aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && <span className="rail-tip">{label}</span>}
    </button>
  );
}
