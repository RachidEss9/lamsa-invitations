import { WorkspacePanel, WorkspaceShell } from "@/components/platform/WorkspaceShell";
import { WorkspacePicker } from "@/components/platform/WorkspacePicker";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { PrintExportDialog } from "@/components/studio/PrintExportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DEFAULT_PRINT_SETTINGS,
  cropMarkSegments,
  preflightDesign,
  sheetCellRect,
  type PaperId,
  type PrintSettings,
  type SheetLayout,
} from "@/lib/print";
import { planPiece, SHEET_STOCKS, sheetStockLabel } from "@/lib/print-lab";
import { normalizeDesign, pageSizeOf } from "@/lib/design";
import { contentFromInvitation, type InvitationContent } from "@/lib/invitation";
import { piecePages, pieceTrimMm, suiteOf } from "@/lib/suite";
import { workspaceById } from "@/lib/workspaces";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { ExternalLink, Loader2, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";

/**
 * Print Lab — imposition for the whole suite.
 *
 * The studio prints one page at a time; the lab answers the stationer's
 * question instead: how many of this piece fit on a sheet, which turn wastes
 * less paper, and what does a run of fifty cost. Every number comes from
 * `print.ts` and `print-lab.ts`; nothing here measures the sheet again.
 */
export default function PrintLab() {
  const { id } = useParams<{ id: string }>();
  const workspace = useMemo(() => workspaceById("print"), []);

  if (!id) {
    return (
      <WorkspaceShell
        workspace={workspace}
        title="Print Lab"
        note="Press-ready cards, menus and tags with bleed, marks and sheets. Choose a project to impose its pieces onto real stock."
      >
        <WorkspacePicker workspace={workspace} openPath="/print" actionLabel="Open the sheets" />
      </WorkspaceShell>
    );
  }

  return <SheetWorkspace id={id} />;
}

function SheetWorkspace({ id }: { id: string }) {
  const workspace = useMemo(() => workspaceById("print"), []);
  const valid = /^[a-z0-9]{26,32}$/.test(id);
  const invitation = useQuery(
    api.invitations.getMine,
    valid ? { id: id as Id<"invitations"> } : "skip",
  );

  const design = useMemo(() => {
    if (!invitation) return null;
    return normalizeDesign(
      invitation.design,
      contentFromInvitation(invitation as unknown as InvitationContent),
    );
  }, [invitation]);

  const imageUrls = (invitation?.designImageUrls ?? {}) as Record<string, string>;
  const title = (invitation?.title as string | undefined) ?? "Project";

  const pieces = useMemo(() => (design ? suiteOf(design) : []), [design]);
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [paper, setPaper] = useState<PaperId>("a4");
  const [quantity, setQuantity] = useState("50");
  const [printOpen, setPrintOpen] = useState(false);

  const piece = pieces.find((item) => item.id === pieceId) ?? pieces[0] ?? null;
  const pages = useMemo(
    () => (design ? piecePages(design, piece) : []),
    [design, piece],
  );
  // A project saved before suites existed has no pieces; its pages are still
  // imposable, so the lab falls back to the document's first page.
  const fallbackPage = design?.pages[0] ?? null;
  const page = pages[Math.min(pageIndex, pages.length - 1)] ?? fallbackPage;

  const trim = useMemo(() => {
    if (piece && design) return pieceTrimMm(design, piece);
    if (page) {
      const size = pageSizeOf(page);
      return { widthMm: (size.width * 25.4) / 96, heightMm: (size.height * 25.4) / 96 };
    }
    return { widthMm: 0, heightMm: 0 };
  }, [design, piece, page]);

  const bleedMm = piece?.print.bleedMm ?? 0;
  const wanted = Math.max(1, Math.min(5000, Number(quantity) || 1));
  const plan = useMemo(
    () => planPiece({ trim, paper, bleedMm, quantity: wanted }),
    [trim, paper, bleedMm, wanted],
  );
  const layout = plan.imposition.layout;

  const preflight = useMemo(() => {
    if (!design || !page) return [];
    const designIndex = design.pages.findIndex((item) => item.id === page.id);
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "custom",
      customWidth: Math.round(trim.widthMm * 10) / 10,
      customHeight: Math.round(trim.heightMm * 10) / 10,
      unit: "mm",
      bleed: bleedMm,
      cropMarks: piece?.print.cropMarks ?? false,
      scope: "current",
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    };
    return preflightDesign(design, settings, Math.max(0, designIndex)).slice(0, 6);
  }, [design, page, trim.widthMm, trim.heightMm, bleedMm, piece?.print.cropMarks]);

  if (!valid) {
    return (
      <WorkspaceShell workspace={workspace} title="Print Lab" note="That project link is not one of yours.">
        <p className="font-ui text-[0.8rem] text-ink/55">
          <Link to="/print" className="underline underline-offset-4">
            Choose a project
          </Link>
        </p>
      </WorkspaceShell>
    );
  }

  if (invitation === undefined) {
    return (
      <WorkspaceShell workspace={workspace} title="Print Lab" note="Reading the project…">
        <span className="flex items-center gap-2 font-meta text-[10px] uppercase tracking-[0.14em] text-ink/45">
          <Loader2 className="size-3.5 animate-spin" /> Reading the project
        </span>
      </WorkspaceShell>
    );
  }

  if (!invitation || !design || !page) {
    return (
      <WorkspaceShell workspace={workspace} title="Print Lab" note="This project could not be opened.">
        <p className="font-ui text-[0.8rem] text-ink/55">
          <Link to="/print" className="underline underline-offset-4">
            Choose another project
          </Link>
        </p>
      </WorkspaceShell>
    );
  }

  const errors = preflight.filter((issue) => issue.severity === "error").length;
  const warnings = preflight.filter((issue) => issue.severity === "warning").length;

  return (
    <WorkspaceShell
      workspace={workspace}
      title={title}
      note="Every piece in the suite, imposed onto the stock you actually buy. Bleed and crop marks come from the piece's own print brief."
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
            onClick={() => setPrintOpen(true)}
            className="h-8 rounded-full bg-[var(--ink)] px-3.5 font-meta text-[9px] uppercase tracking-[0.14em] text-[var(--paper)]"
          >
            <Printer className="size-3.5" strokeWidth={1.8} /> Export
          </Button>
        </>
      }
    >
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        <WorkspacePanel
          title="Pieces"
          note={pieces.length > 0 ? `${pieces.length} in the suite` : "No suite yet"}
          className="min-h-0"
        >
          <div className="scroll-slim max-h-[62vh] overflow-y-auto p-1.5">
            {(pieces.length > 0 ? pieces : [null]).map((item, index) => {
              const active = item ? item.id === piece?.id : index === 0;
              const trimOf = item && design ? pieceTrimMm(design, item) : trim;
              return (
                <button
                  key={item?.id ?? "document"}
                  type="button"
                  onClick={() => {
                    if (!item) return;
                    setPieceId(item.id);
                    setPageIndex(0);
                  }}
                  className={cn(
                    "pressable flex w-full items-baseline justify-between gap-2 rounded-[var(--radius-tile)] px-2.5 py-2 text-left transition-colors",
                    active
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "text-ink/70 hover:bg-[var(--paper-deep)]/60",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-ui text-[0.72rem]">
                      {item?.name ?? "Whole document"}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block font-meta text-[8px] uppercase tracking-[0.12em]",
                        active ? "text-[var(--paper)]/60" : "text-ink/35",
                      )}
                    >
                      {Math.round(trimOf.widthMm)} × {Math.round(trimOf.heightMm)} mm
                    </span>
                  </span>
                  {item && (
                    <span
                      className={cn(
                        "shrink-0 font-meta text-[8px] uppercase tracking-[0.1em]",
                        active ? "text-[var(--paper)]/70" : "text-ink/40",
                      )}
                    >
                      {item.print.unit}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </WorkspacePanel>

        <div className="flex min-h-0 flex-col gap-3">
          <WorkspacePanel
            title="Press sheet"
            note={`${sheetStockLabel(paper)} · ${plan.copies} up · ${Math.round(plan.waste * 100)}% waste`}
            actions={
              <div className="flex items-center gap-1.5">
                <Select value={paper} onValueChange={(value) => setPaper(value as PaperId)}>
                  <SelectTrigger className="h-7 w-[104px] rounded-none text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHEET_STOCKS.map((stock) => (
                      <SelectItem key={stock.id} value={stock.id}>
                        {stock.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <div className="p-3">
              <SheetPlate layout={layout} label={piece?.name ?? "Sheet"} />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="Copies / sheet" value={String(plan.copies)} />
                <Metric label="Sheets" value={String(plan.sheets)} />
                <Metric
                  label="Last sheet"
                  value={plan.remainder === 0 ? "Full" : `${plan.remainder} up`}
                />
                <Metric label="Waste" value={`${Math.round(plan.waste * 100)}%`} />
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            title="Copy"
            note={`${page.name} · ${Math.round(trim.widthMm)} × ${Math.round(trim.heightMm)} mm`}
            actions={
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pageIndex <= 0}
                  onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
                  className="h-7 rounded-none px-2 text-[9px]"
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pageIndex >= pages.length - 1}
                  onClick={() => setPageIndex((index) => index + 1)}
                  className="h-7 rounded-none px-2 text-[9px]"
                >
                  Next
                </Button>
              </div>
            }
          >
            <div className="flex items-start justify-center bg-[var(--paper-deep)]/30 p-4">
              <div className="w-full max-w-[240px] border border-[var(--edge)] bg-white shadow-[var(--shadow-xs)]">
                <DesignStage width={pageSizeOf(page).width} height={pageSizeOf(page).height}>
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
            </div>
          </WorkspacePanel>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <WorkspacePanel title="The run" note="Paper, bleed and quantity">
            <div className="space-y-2.5 p-3">
              <Row label="Stock">
                <span className="font-ui text-[0.72rem] text-ink">
                  {sheetStockLabel(paper)} · {Math.round(layout.sheet.widthMm)} ×{" "}
                  {Math.round(layout.sheet.heightMm)} mm
                </span>
              </Row>
              <Row label="Trim">
                <span className="font-ui text-[0.72rem] text-ink">
                  {Math.round(trim.widthMm * 10) / 10} × {Math.round(trim.heightMm * 10) / 10} mm
                </span>
              </Row>
              <Row label="Bleed">
                <span className="font-ui text-[0.72rem] text-ink">{bleedMm} mm</span>
              </Row>
              <Row label="Quantity">
                <Input
                  value={quantity}
                  inputMode="numeric"
                  onChange={(event) => setQuantity(event.target.value.replace(/[^\d]/g, ""))}
                  className="h-7 w-[74px] rounded-none text-right text-[11px]"
                />
              </Row>
              <div className="border-t border-[var(--edge)] pt-2.5">
                <p className="font-ui text-[0.66rem] leading-relaxed text-ink/55">
                  {plan.copies === 0
                    ? "This copy is larger than the stock — choose a bigger sheet."
                    : `The ${plan.imposition.rotate ? "turned" : "upright"} turn fits ${plan.copies} ${
                        plan.copies === 1 ? "copy" : "copies"
                      }; the other fits ${plan.imposition.other.count}.`}
                </p>
                <p className="mt-1 font-ui text-[0.66rem] leading-relaxed text-ink/40">
                  {wanted} copies over {plan.sheets} {plan.sheets === 1 ? "sheet" : "sheets"}.
                </p>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            title="Preflight"
            note={
              errors + warnings === 0
                ? "Nothing blocking"
                : `${errors} error${errors === 1 ? "" : "s"} · ${warnings} warning${warnings === 1 ? "" : "s"}`
            }
            className="min-h-0"
          >
            <div className="scroll-slim max-h-[38vh] overflow-y-auto">
              {preflight.length === 0 ? (
                <p className="px-3 py-4 font-ui text-[0.7rem] leading-relaxed text-ink/45">
                  This page passes the checks the lab can run without a browser: size, bleed
                  and the paper brief.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--edge)]">
                  {preflight.map((issue) => (
                    <li key={issue.id} className="flex gap-2 px-3 py-2">
                      <span
                        className={cn(
                          "mt-1 size-1.5 shrink-0 rounded-full",
                          issue.severity === "error"
                            ? "bg-[var(--red)]"
                            : issue.severity === "warning"
                              ? "bg-[var(--gold)]"
                              : "bg-ink/30",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block font-ui text-[0.7rem] leading-snug text-ink/80">
                          {issue.title}
                        </span>
                        <span className="mt-0.5 block font-ui text-[0.62rem] leading-relaxed text-ink/45">
                          {issue.detail}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </WorkspacePanel>
        </div>
      </div>

      <PrintExportDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        design={design}
        pageIndex={Math.max(
          0,
          design.pages.findIndex((item) => item.id === page.id),
        )}
        imageUrls={imageUrls}
        title={title}
        rtl={Boolean((invitation as unknown as InvitationContent).rtl)}
      />
    </WorkspaceShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--edge)] bg-[var(--paper-light)]/60 px-2.5 py-2">
      <p className="font-meta text-[8px] uppercase tracking-[0.14em] text-ink/40">{label}</p>
      <p className="mt-0.5 font-display text-[1.05rem] leading-none text-ink">{value}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="font-meta text-[8px] uppercase tracking-[0.14em] text-ink/40">{label}</span>
      {children}
    </label>
  );
}

/**
 * The plate: the stock, one media box per copy, the trim inside it, and the
 * crop marks a guillotine needs. Drawn in millimetres so what the host sees is
 * the sheet they will hold, not a scaled approximation.
 */
function SheetPlate({ layout, label }: { layout: SheetLayout; label: string }) {
  const { sheet } = layout;
  const copies = Math.min(layout.count, 64);
  const cells = Array.from({ length: copies }, (_, index) => sheetCellRect(layout, index));

  return (
    <svg
      viewBox={`0 0 ${sheet.widthMm} ${sheet.heightMm}`}
      className="h-auto w-full max-h-[46vh] rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--paper-light)]"
      role="img"
      aria-label={`Imposition for ${label}: ${copies} up on ${Math.round(sheet.widthMm)} by ${Math.round(sheet.heightMm)} millimetre stock`}
    >
      <rect x={0} y={0} width={sheet.widthMm} height={sheet.heightMm} fill="var(--paper-light)" />
      {cells.map((cell, index) => (
        <g key={index}>
          <rect
            x={cell.x}
            y={cell.y}
            width={cell.w}
            height={cell.h}
            fill="white"
            stroke="color-mix(in oklab, var(--ink) 25%, transparent)"
            strokeWidth={0.2}
          />
          <rect
            x={cell.x + layout.bleedMm}
            y={cell.y + layout.bleedMm}
            width={cell.w - layout.bleedMm * 2}
            height={cell.h - layout.bleedMm * 2}
            fill="none"
            stroke="var(--red)"
            strokeWidth={0.2}
            strokeDasharray="1.2 0.9"
            opacity={0.55}
          />
          {cropMarkSegments(cell, 2.4, 0.5).map((segment, mark) => (
            <line
              key={mark}
              x1={segment[0]}
              y1={segment[1]}
              x2={segment[2]}
              y2={segment[3]}
              stroke="var(--ink)"
              strokeWidth={0.18}
              opacity={0.45}
            />
          ))}
          <text
            x={cell.x + cell.w / 2}
            y={cell.y + cell.h / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(5, cell.w / 6)}
            fill="var(--ink)"
            opacity={0.35}
            style={{ fontFamily: "var(--font-meta, monospace)", letterSpacing: "0.1em" }}
          >
            {index + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
