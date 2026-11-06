import { AlertTriangle, ArrowLeft, BookOpen, Loader2, RefreshCw, Save } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { PUBLISHING_LIBRARY_PATH } from "@/lib/publishing/routes";

/**
 * The states a long-lived editor actually reaches: loading, not found, a
 * server error, a save conflict, and an unsaved local draft. Each is a full
 * explanation with the next action attached — never a spinner that never
 * ends, and never a silent overwrite.
 */

export function StudioStatePanel({
  icon,
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  icon?: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md border border-[var(--rule)] bg-[var(--paper-light)] px-8 py-9 shadow-[var(--shadow-soft)]">
        <div className="mb-5 flex items-center gap-2 font-meta text-[0.55rem] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          {icon ?? <BookOpen className="size-3.5 text-[var(--red)]" />}
          {eyebrow}
        </div>
        <h1 className="font-display text-[1.6rem] leading-tight text-[var(--ink)]">{title}</h1>
        <p className="mt-2 text-[0.82rem] leading-6 text-[var(--ink-soft)]">{description}</p>
        {children ? <div className="mt-6 flex flex-wrap gap-2">{children}</div> : null}
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}

export function EditorLoading({ label = "Opening the publication" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--paper-deep)]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-5 animate-spin text-[var(--red)]" />
        <span className="font-meta text-[0.58rem] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          {label}
        </span>
      </div>
    </div>
  );
}

export function PublicationNotFound() {
  return (
    <StudioStatePanel
      icon={<AlertTriangle className="size-3.5 text-[var(--red)]" />}
      eyebrow="Publishing studio"
      title="That publication is not here"
      description="The link may be mistyped, or the publication belongs to another studio account. Nothing was changed."
    >
      <Button asChild size="sm" className="rounded-[3px]">
        <Link to={PUBLISHING_LIBRARY_PATH}>
          <ArrowLeft className="mr-1.5 size-3.5" /> Back to the library
        </Link>
      </Button>
    </StudioStatePanel>
  );
}

export function PublicationError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <StudioStatePanel
      icon={<AlertTriangle className="size-3.5 text-[var(--red)]" />}
      eyebrow="Connection"
      title="The publication could not be opened"
      description={
        message ||
        "The studio could not load this document. Your last saved version is safe on the server."
      }
    >
      <Button size="sm" variant="outline" className="rounded-[3px]" onClick={onRetry}>
        <RefreshCw className="mr-1.5 size-3.5" /> Try again
      </Button>
      <Button asChild size="sm" variant="ghost" className="rounded-[3px]">
        <Link to={PUBLISHING_LIBRARY_PATH}>Library</Link>
      </Button>
    </StudioStatePanel>
  );
}

/** A conflict banner: the save was refused because the page changed elsewhere. */
export function ConflictBanner({
  message,
  busy,
  onKeepLocal,
  onTakeServer,
}: {
  message?: string;
  busy?: boolean;
  onKeepLocal: () => void;
  onTakeServer: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 border-b border-[color-mix(in_oklab,var(--red)_35%,var(--rule))] bg-[color-mix(in_oklab,var(--red)_7%,var(--paper-light))] px-3 py-2"
    >
      <Save className="size-3.5 shrink-0 text-[var(--red)]" />
      <p className="min-w-0 flex-1 text-[0.74rem] leading-5 text-[var(--ink)]">
        {message || "This publication changed in another tab or on another device."} Your local
        edits are still here; nothing has been overwritten.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="h-6 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.08em]"
        disabled={busy}
        onClick={onTakeServer}
      >
        Use server copy
      </Button>
      <Button
        size="sm"
        className="h-6 rounded-[3px] bg-[var(--red)] font-meta text-[0.55rem] uppercase tracking-[0.08em] text-white hover:bg-[color-mix(in_oklab,var(--red)_88%,black)]"
        disabled={busy}
        onClick={onKeepLocal}
      >
        Keep my edits
      </Button>
    </div>
  );
}

/** An unsaved draft found in this browser, offered before it is discarded. */
export function RecoveryBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const when = new Date(savedAt);
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 border-b border-[color-mix(in_oklab,var(--gold)_45%,var(--rule))] bg-[color-mix(in_oklab,var(--gold)_10%,var(--paper-light))] px-3 py-2"
    >
      <p className="min-w-0 flex-1 text-[0.74rem] leading-5 text-[var(--ink)]">
        An unsaved draft from this browser was found —{" "}
        {Number.isNaN(when.getTime()) ? "unknown time" : when.toLocaleString()}. Restore it only if
        it holds work the server does not.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="h-6 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.08em]"
        onClick={onDiscard}
      >
        Discard draft
      </Button>
      <Button
        size="sm"
        className="h-6 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.08em]"
        onClick={onRestore}
      >
        Restore draft
      </Button>
    </div>
  );
}

export function ConflictIcon() {
  return <AlertTriangle className="size-3.5" />;
}
