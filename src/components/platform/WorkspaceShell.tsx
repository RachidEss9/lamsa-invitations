import { Wordmark } from "@/components/brand/Wordmark";
import type { Workspace } from "@/lib/workspaces";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import type { ReactNode } from "react";

/**
 * The frame every non-canvas workspace sits in.
 *
 * The studio owns the canvas; the labs own their own surfaces but must still
 * read as the same atelier — same wordmark, same paper, same quiet header. The
 * shell keeps that header in one place so Print Lab, Shape Maker and Press
 * cannot drift apart.
 */
export function WorkspaceShell({
  workspace,
  title,
  note,
  actions,
  children,
}: {
  workspace: Workspace;
  title: string;
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] text-ink">
      <header className="sticky top-0 z-30 border-b border-[var(--edge)] bg-[var(--paper)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            to="/dashboard"
            className="pressable flex items-center gap-2 font-meta text-[10px] uppercase tracking-[0.14em] text-ink/50 transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.8} />
            Studio
          </Link>
          <span className="hidden h-4 w-px bg-[var(--edge)] sm:block" />
          <Wordmark className="h-5 w-auto" />
          <span className="h-4 w-px bg-[var(--edge)]" />
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="font-meta text-[10px] uppercase tracking-[0.16em] text-[var(--red)]">
              {workspace.name}
            </span>
            <span className="hidden truncate font-ui text-[0.72rem] text-ink/45 sm:inline">
              Phase {workspace.phase}
            </span>
          </span>
          <div className="ml-auto flex items-center gap-1.5">{actions}</div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[1.7rem] leading-tight text-ink">{title}</h1>
            {note && (
              <p className="mt-1 max-w-[62ch] font-ui text-[0.76rem] leading-relaxed text-ink/55">
                {note}
              </p>
            )}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

/** A titled card in a workspace column — the labs' only panel primitive. */
export function WorkspacePanel({
  title,
  note,
  actions,
  children,
  className,
}: {
  title: string;
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--edge)] px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="section-label">{title}</p>
          {note && (
            <p className="mt-1 font-ui text-[0.64rem] leading-snug text-ink/45">{note}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
