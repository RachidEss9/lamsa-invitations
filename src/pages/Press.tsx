import { WorkspacePanel, WorkspaceShell } from "@/components/platform/WorkspaceShell";
import { WorkspacePicker } from "@/components/platform/WorkspacePicker";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeDesign, pageSizeOf, type DesignPage } from "@/lib/design";
import { contentFromInvitation, type InvitationContent } from "@/lib/invitation";
import {
  PRESS_FORMATS,
  applyPressFormat,
  columnMeasureMm,
  isOnFormat,
  pressCanvas,
  pressFormat,
  sheetCount,
  spreadPairs,
  type PressFormatId,
} from "@/lib/press";
import { workspaceById } from "@/lib/workspaces";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

/**
 * Press — newspapers and magazines, laid out page by page.
 *
 * The studio edits one page at a time on one canvas. A paper is read as
 * openings, so the workspace shows the spreads a reader actually turns, on the
 * stock the piece is actually printed on. Re-cutting a document onto a press
 * format is a real write: it resizes every page through `resizePage`, keeps
 * every layer's identity, and saves through the studio's own mutation.
 */
export default function Press() {
  const { id } = useParams<{ id: string }>();
  const workspace = useMemo(() => workspaceById("press"), []);

  if (!id) {
    return (
      <WorkspaceShell
        workspace={workspace}
        title="Press"
        note="Newspapers and magazines laid out page by page. Choose a project to see its openings on real press stock."
      >
        <WorkspacePicker workspace={workspace} openPath="/press" actionLabel="Open the press" />
      </WorkspaceShell>
    );
  }

  return <PressWorkspace id={id} />;
}

function PressWorkspace({ id }: { id: string }) {
  const workspace = useMemo(() => workspaceById("press"), []);
  const valid = /^[a-z0-9]{26,32}$/.test(id);
  const invitation = useQuery(
    api.invitations.getMine,
    valid ? { id: id as Id<"invitations"> } : "skip",
  );
  const saveDesign = useMutation(api.invitations.saveDesign);

  const design = useMemo(() => {
    if (!invitation) return null;
    return normalizeDesign(
      invitation.design,
      contentFromInvitation(invitation as unknown as InvitationContent),
    );
  }, [invitation]);

  const imageUrls = (invitation?.designImageUrls ?? {}) as Record<string, string>;
  const title = (invitation?.title as string | undefined) ?? "Project";

  const [formatId, setFormatId] = useState<PressFormatId>("magazine");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const format = pressFormat(formatId);
  const spreads = useMemo(() => spreadPairs(design?.pages ?? []), [design]);
  const settled = design ? isOnFormat(design, format) : false;

  const recut = async () => {
    if (!design) return;
    setSaving(true);
    try {
      await saveDesign({ id: id as Id<"invitations">, design: applyPressFormat(design, format) });
      toast.success(`Re-cut onto ${format.label}`, {
        description: `${design.pages.length} pages at ${format.widthMm} × ${format.heightMm} mm.`,
      });
      setConfirming(false);
    } catch (error) {
      toast.error("The document could not be re-cut", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!valid) {
    return (
      <WorkspaceShell workspace={workspace} title="Press" note="That project link is not one of yours.">
        <p className="font-ui text-[0.8rem] text-ink/55">
          <Link to="/press" className="underline underline-offset-4">
            Choose a project
          </Link>
        </p>
      </WorkspaceShell>
    );
  }

  if (invitation === undefined) {
    return (
      <WorkspaceShell workspace={workspace} title="Press" note="Reading the project…">
        <span className="flex items-center gap-2 font-meta text-[10px] uppercase tracking-[0.14em] text-ink/45">
          <Loader2 className="size-3.5 animate-spin" /> Reading the project
        </span>
      </WorkspaceShell>
    );
  }

  if (!invitation || !design) {
    return (
      <WorkspaceShell workspace={workspace} title="Press" note="This project could not be opened.">
        <p className="font-ui text-[0.8rem] text-ink/55">
          <Link to="/press" className="underline underline-offset-4">
            Choose another project
          </Link>
        </p>
      </WorkspaceShell>
    );
  }

  const size = pressCanvas(format);

  return (
    <WorkspaceShell
      workspace={workspace}
      title={title}
      note="Every opening on the stock the paper is printed on. Pick a format, look through the spreads, then re-cut the document onto it."
      actions={
        <>
          <Link
            to={`/studio/${id}`}
            className="pressable inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--edge)] bg-[var(--surface-card)] px-3 font-meta text-[9px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-[var(--edge-strong)] hover:text-ink"
          >
            <ExternalLink className="size-3.5" strokeWidth={1.8} /> Studio
          </Link>
          <Button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={settled}
            className="h-8 rounded-full bg-[var(--ink)] px-3.5 font-meta text-[9px] uppercase tracking-[0.14em] text-[var(--paper)] disabled:opacity-55"
          >
            <Newspaper className="size-3.5" strokeWidth={1.8} />
            {settled ? "On this stock" : "Re-cut"}
          </Button>
        </>
      }
    >
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-3">
          <WorkspacePanel title="Format" note="Press stock, in millimetres">
            <div className="p-1.5">
              {PRESS_FORMATS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormatId(item.id)}
                  aria-pressed={item.id === formatId}
                  className={cn(
                    "pressable mb-0.5 flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-tile)] px-2.5 py-2 text-left transition-colors",
                    item.id === formatId
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "text-ink/70 hover:bg-[var(--paper-deep)]/60",
                  )}
                >
                  <span className="flex w-full items-baseline justify-between gap-2">
                    <span className="font-ui text-[0.72rem]">{item.label}</span>
                    <span
                      className={cn(
                        "font-meta text-[8px] uppercase tracking-[0.1em]",
                        item.id === formatId ? "text-[var(--paper)]/60" : "text-ink/35",
                      )}
                    >
                      {item.widthMm} × {item.heightMm}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "font-ui text-[0.62rem] leading-snug",
                      item.id === formatId ? "text-[var(--paper)]/60" : "text-ink/40",
                    )}
                  >
                    {item.note}
                  </span>
                </button>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="The paper" note="Counted the way a printer counts">
            <dl className="divide-y divide-[var(--edge)]">
              <Brief label="Pages" value={String(design.pages.length)} />
              <Brief label="Openings" value={String(spreads.length)} />
              <Brief label="Sheets" value={String(sheetCount(design.pages.length))} />
              <Brief label="Columns" value={String(format.columns)} />
              <Brief label="Measure" value={`${columnMeasureMm(format, 10)} mm`} />
              <Brief label="Canvas" value={`${size.width} × ${size.height} px`} />
            </dl>
            <p className="border-t border-[var(--edge)] px-3 py-2.5 font-ui text-[0.62rem] leading-relaxed text-ink/40">
              {settled
                ? `This document is already on ${format.label} stock.`
                : "Re-cutting fits every page to the new stock and centres its artwork; layers, reveals and clips are kept."}
            </p>
          </WorkspacePanel>
        </div>

        <WorkspacePanel
          title="Openings"
          note={`${spreads.length} spread${spreads.length === 1 ? "" : "s"} · ${format.label} · ${format.widthMm} × ${format.heightMm} mm`}
          className="min-h-0"
        >
          <div className="scroll-slim grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-2">
            {spreads.map((spread) => (
              <div
                key={spread.index}
                className="rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--paper-light)]/60 p-2.5"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="font-meta text-[8px] uppercase tracking-[0.14em] text-ink/40">
                    {spread.cover ? "Cover" : `Spread ${spread.index}`}
                  </span>
                  <span className="font-meta text-[8px] uppercase tracking-[0.1em] text-ink/30">
                    {spread.left ? "verso" : ""}
                    {spread.left && spread.right ? " · " : ""}
                    {spread.right ? "recto" : ""}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  {[spread.left, spread.right].map((page, side) =>
                    page ? (
                      <SpreadPage
                        key={page.id}
                        page={page}
                        imageUrls={imageUrls}
                        label={side === 0 && !spread.cover ? "verso" : "recto"}
                      />
                    ) : (
                      <div
                        key={`blank-${side}`}
                        className="flex-1 rounded-[2px] border border-dashed border-[var(--edge)] bg-[var(--paper-deep)]/40"
                        style={{ aspectRatio: `${format.widthMm} / ${format.heightMm}` }}
                        aria-hidden
                      />
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-ui text-lg">Re-cut onto {format.label}?</DialogTitle>
            <DialogDescription className="text-[11px] leading-relaxed text-ink/55">
              All {design.pages.length} pages become {format.widthMm} × {format.heightMm} mm.
              Artwork is fitted and centred, never stretched, and every layer keeps its
              identity. You can undo this in the studio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              className="h-9 rounded-none text-[10px] uppercase tracking-[0.12em]"
            >
              Keep it
            </Button>
            <Button
              type="button"
              onClick={() => void recut()}
              disabled={saving}
              className="h-9 rounded-none bg-[var(--ink)] text-[10px] uppercase tracking-[0.12em] text-[var(--paper)]"
            >
              {saving ? "Re-cutting…" : `Re-cut onto ${format.label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}

function Brief({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <dt className="font-meta text-[8px] uppercase tracking-[0.14em] text-ink/40">{label}</dt>
      <dd className="font-ui text-[0.72rem] text-ink">{value}</dd>
    </div>
  );
}

function SpreadPage({
  page,
  imageUrls,
  label,
}: {
  page: DesignPage;
  imageUrls: Record<string, string>;
  label: string;
}) {
  const size = pageSizeOf(page);
  return (
    <div className="min-w-0 flex-1">
      <div className="overflow-hidden border border-[var(--edge)] bg-white shadow-[var(--shadow-xs)]">
        <DesignStage width={size.width} height={size.height}>
          {() => (
            <DesignPageView
              page={page}
              time={100000}
              imageUrls={imageUrls}
              materialPreview={false}
              ignoreExit
            />
          )}
        </DesignStage>
      </div>
      <p className="mt-1 truncate font-meta text-[7px] uppercase tracking-[0.12em] text-ink/35">
        {label} · {page.name}
      </p>
    </div>
  );
}
