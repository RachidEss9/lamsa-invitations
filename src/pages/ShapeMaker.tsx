import { WorkspacePanel, WorkspaceShell } from "@/components/platform/WorkspaceShell";
import { WorkspacePicker } from "@/components/platform/WorkspacePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  SHAPE_TEMPLATES,
  buildShape,
  cutLengthMm,
  foldLengthMm,
  shapeTemplate,
  shapeToSvg,
  type ShapeDims,
  type ShapeDrawing,
  type ShapeTemplateId,
} from "@/lib/cut-folds";
import { normalizeDesign } from "@/lib/design";
import { contentFromInvitation, type InvitationContent } from "@/lib/invitation";
import { downloadBlob, safeFilename } from "@/lib/print";
import { piecePages, pieceTrimMm, suiteOf } from "@/lib/suite";
import { workspaceById } from "@/lib/workspaces";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

/**
 * Shape Maker — die lines, measured in millimetres.
 *
 * A cut file is not artwork: it is an instruction to a knife and a crease. The
 * workspace builds that instruction from three numbers per template, draws it
 * at true size, and writes an SVG a cutter can take. It reads the suite only to
 * seed the size of a real piece — nothing here is saved into the invitation.
 */
export default function ShapeMaker() {
  const { id } = useParams<{ id: string }>();
  const workspace = useMemo(() => workspaceById("shape"), []);

  if (!id) {
    return (
      <WorkspaceShell
        workspace={workspace}
        title="Shape Maker"
        note="Vector cut and fold lines measured in millimetres. Pick a project to start from one of its pieces, or work from the templates alone."
      >
        <WorkspacePicker workspace={workspace} openPath="/shapes" actionLabel="Open the shapes" />
      </WorkspaceShell>
    );
  }

  return <ShapeWorkspace id={id} />;
}

function ShapeWorkspace({ id }: { id: string }) {
  const workspace = useMemo(() => workspaceById("shape"), []);
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

  const pieces = useMemo(() => (design ? suiteOf(design) : []), [design]);
  const [templateId, setTemplateId] = useState<ShapeTemplateId>("pocket");
  const [dims, setDims] = useState<ShapeDims>(shapeTemplate("pocket").defaults);

  const piece = pieces[0] ?? null;
  const trim = piece && design ? pieceTrimMm(design, piece) : null;

  const drawing = useMemo(() => buildShape(templateId, dims), [templateId, dims]);
  const title = (invitation?.title as string | undefined) ?? "Project";

  const chooseTemplate = (next: ShapeTemplateId) => {
    setTemplateId(next);
    const template = shapeTemplate(next);
    // A new template keeps the sheet it is being drawn on, but takes the new
    // template's own flap depth — the numbers mean different things per blank.
    setDims((current) => ({
      ...template.defaults,
      widthMm: current.widthMm ?? template.defaults.widthMm,
      heightMm: Math.min(current.heightMm ?? template.defaults.heightMm, 1000),
    }));
  };

  const seedFromPiece = () => {
    if (!trim) return;
    setDims((current) => ({
      ...current,
      widthMm: Math.round(trim.widthMm * 10) / 10,
      heightMm: Math.round(trim.heightMm * 10) / 10,
    }));
  };

  const download = () => {
    const svg = shapeToSvg(drawing, { marginMm: 5 });
    const name = safeFilename(
      `${title}-${shapeTemplate(drawing.template).label}-${Math.round(drawing.widthMm)}x${Math.round(drawing.heightMm)}mm`,
    );
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${name}.svg`);
    toast.success("Cut file saved", {
      description: `${Math.round(drawing.widthMm)} × ${Math.round(drawing.heightMm)} mm, in millimetres.`,
    });
  };

  if (!valid) {
    return (
      <WorkspaceShell workspace={workspace} title="Shape Maker" note="That project link is not one of yours.">
        <p className="font-ui text-[0.8rem] text-ink/55">
          <Link to="/shapes" className="underline underline-offset-4">
            Choose a project
          </Link>
        </p>
      </WorkspaceShell>
    );
  }

  if (invitation === undefined) {
    return (
      <WorkspaceShell workspace={workspace} title="Shape Maker" note="Reading the project…">
        <span className="flex items-center gap-2 font-meta text-[10px] uppercase tracking-[0.14em] text-ink/45">
          <Loader2 className="size-3.5 animate-spin" /> Reading the project
        </span>
      </WorkspaceShell>
    );
  }

  if (!invitation || !design) {
    return (
      <WorkspaceShell workspace={workspace} title="Shape Maker" note="This project could not be opened.">
        <p className="font-ui text-[0.8rem] text-ink/55">
          <Link to="/shapes" className="underline underline-offset-4">
            Choose another project
          </Link>
        </p>
      </WorkspaceShell>
    );
  }

  const template = shapeTemplate(templateId);

  return (
    <WorkspaceShell
      workspace={workspace}
      title={`${template.label} — ${title}`}
      note={template.note}
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
            onClick={download}
            className="h-8 rounded-full bg-[var(--ink)] px-3.5 font-meta text-[9px] uppercase tracking-[0.14em] text-[var(--paper)]"
          >
            <Download className="size-3.5" strokeWidth={1.8} /> SVG
          </Button>
        </>
      }
    >
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <div className="flex min-h-0 flex-col gap-3">
          <WorkspacePanel title="Template" note="Four blanks the studio's pieces are cut from">
            <div className="p-1.5">
              {SHAPE_TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseTemplate(item.id)}
                  aria-pressed={item.id === templateId}
                  className={cn(
                    "pressable mb-0.5 flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-tile)] px-2.5 py-2 text-left transition-colors",
                    item.id === templateId
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "text-ink/70 hover:bg-[var(--paper-deep)]/60",
                  )}
                >
                  <span className="font-ui text-[0.72rem]">{item.label}</span>
                  <span
                    className={cn(
                      "font-ui text-[0.62rem] leading-snug",
                      item.id === templateId ? "text-[var(--paper)]/60" : "text-ink/40",
                    )}
                  >
                    {item.note}
                  </span>
                </button>
              ))}
            </div>
          </WorkspacePanel>

          {piece && (
            <WorkspacePanel
              title="From the piece"
              note={`${piece.name}${trim ? ` · ${Math.round(trim.widthMm)} × ${Math.round(trim.heightMm)} mm` : ""}`}
            >
              <div className="p-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={seedFromPiece}
                  className="h-8 w-full rounded-none font-meta text-[9px] uppercase tracking-[0.12em]"
                >
                  Use this piece's size
                </Button>
                <p className="mt-2 font-ui text-[0.62rem] leading-relaxed text-ink/40">
                  {Math.round(piecePages(design, piece).length)} page
                  {piecePages(design, piece).length === 1 ? "" : "s"} in this piece. The blank
                  is not saved into the invitation.
                </p>
              </div>
            </WorkspacePanel>
          )}
        </div>

        <WorkspacePanel
          title="Blank"
          note={`${Math.round(drawing.widthMm * 10) / 10} × ${Math.round(drawing.heightMm * 10) / 10} mm · cut ${(cutLengthMm(drawing) / 10).toFixed(1)} cm · fold ${(foldLengthMm(drawing) / 10).toFixed(1)} cm`}
        >
          <div className="flex items-center justify-center bg-[var(--paper-deep)]/30 p-5">
            <div className="w-full max-w-[520px] rounded-[var(--radius-tile)] border border-[var(--edge)] bg-white p-4 shadow-[var(--shadow-xs)]">
              <ShapePreview drawing={drawing} />
            </div>
          </div>
        </WorkspacePanel>

        <div className="flex min-h-0 flex-col gap-3">
          <WorkspacePanel title="Measurements" note="Everything in millimetres">
            <div className="space-y-2.5 p-3">
              {template.fields.map((field) => (
                <label key={field.key} className="flex items-center justify-between gap-3">
                  <span className="font-meta text-[8px] uppercase tracking-[0.14em] text-ink/40">
                    {field.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <Input
                      value={String(dims[field.key])}
                      inputMode="decimal"
                      onChange={(event) => {
                        const value = Number(event.target.value.replace(/[^\d.]/g, ""));
                        setDims((current) => ({
                          ...current,
                          [field.key]: Number.isFinite(value) ? value : 0,
                        }));
                      }}
                      className="h-7 w-[76px] rounded-none text-right text-[11px]"
                    />
                    <span className="font-meta text-[8px] uppercase tracking-[0.1em] text-ink/35">
                      mm
                    </span>
                  </span>
                </label>
              ))}
              <div className="border-t border-[var(--edge)] pt-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDims(template.defaults)}
                  className="h-7 w-full rounded-none font-meta text-[8px] uppercase tracking-[0.12em]"
                >
                  Reset to the template
                </Button>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Cutting brief" note="What a shop needs to price it">
            <dl className="divide-y divide-[var(--edge)]">
              <Brief label="Blank" value={`${Math.round(drawing.widthMm * 10) / 10} × ${Math.round(drawing.heightMm * 10) / 10} mm`} />
              <Brief label="Knife travel" value={`${(cutLengthMm(drawing) / 10).toFixed(1)} cm`} />
              <Brief label="Crease" value={`${(foldLengthMm(drawing) / 10).toFixed(1)} cm`} />
              <Brief label="Creases" value={String(drawing.folds.length)} />
              <Brief label="Punches" value={String(drawing.holes.length)} />
            </dl>
            <p className="border-t border-[var(--edge)] px-3 py-2.5 font-ui text-[0.62rem] leading-relaxed text-ink/40">
              The SVG is written at 1:1 in millimetres: black is cut, dashed vermilion is a
              fold.
            </p>
          </WorkspacePanel>
        </div>
      </div>
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

/**
 * The preview is the same geometry the SVG export writes, drawn at true
 * proportions: solid ink for the knife, dashed vermilion for the crease.
 */
function ShapePreview({ drawing }: { drawing: ShapeDrawing }) {
  const pad = Math.max(drawing.widthMm, drawing.heightMm) * 0.04;
  const width = drawing.widthMm + pad * 2;
  const height = drawing.heightMm + pad * 2;
  const stroke = Math.max(drawing.widthMm, drawing.heightMm) / 320;

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${shapeTemplate(drawing.template).label} die line, ${Math.round(
        drawing.widthMm,
      )} by ${Math.round(drawing.heightMm)} millimetres`}
    >
      {drawing.cut.map((line, index) => (
        <path
          key={`cut-${index}`}
          d={`M ${line.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
      ))}
      {drawing.holes.map((hole, index) => (
        <circle
          key={`hole-${index}`}
          cx={hole.cx}
          cy={hole.cy}
          r={hole.r}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={stroke}
        />
      ))}
      {drawing.folds.map(([a, b], index) => (
        <line
          key={`fold-${index}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="var(--red)"
          strokeWidth={stroke}
          strokeDasharray={`${stroke * 6} ${stroke * 3.5}`}
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}
