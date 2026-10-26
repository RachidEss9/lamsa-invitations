import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  PIECE_KINDS,
  piecePages,
  pieceTrimMm,
  suiteOf,
  type PieceKind,
  type PiecePrint,
  type SuitePiece,
} from "@/lib/suite";
import type { DesignDocument } from "@/lib/design";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Globe,
  GlobeLock,
  Layers,
  Mail,
  Palette,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const KIND_ICON: Record<PieceKind, typeof Mail> = {
  invitation: Sparkles,
  "save-the-date": Sparkles,
  rsvp: FileText,
  details: FileText,
  "thank-you": FileText,
  menu: FileText,
  "place-card": FileText,
  "belly-band": Layers,
  envelope: Mail,
  liner: Layers,
  custom: FileText,
};

function millimetres(value: number) {
  return Math.round(value * 10) / 10;
}

function sizeLabel(design: DesignDocument, piece: SuitePiece) {
  const trim = pieceTrimMm(design, piece);
  return `${millimetres(trim.widthMm)} × ${millimetres(trim.heightMm)} mm`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="font-ui text-[0.68rem] text-ink/60">{label}</span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}

const smallSelect = "h-8 w-[124px] shrink-0 rounded-none text-[11px]";

export interface SuiteBarProps {
  design: DesignDocument;
  /** The piece the canvas is showing, derived from the open page. */
  activePieceId: string | null;
  onSelect: (pieceId: string) => void;
  onAdd: (kind: PieceKind) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onRename: (name: string) => void;
  onGuestVisible: (visible: boolean) => void;
  onPrint: (print: Partial<PiecePrint>) => void;
  onShareStyle: () => void;
}

/**
 * The suite strip: one chip per piece of stationery, the piece's own brief,
 * and the actions that keep a set coordinated. It sits between the toolbar and
 * the canvas so switching from the card to the envelope is one tap, on a phone
 * as well as a desktop.
 */
export function SuiteBar({
  design,
  activePieceId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onRename,
  onGuestVisible,
  onPrint,
  onShareStyle,
}: SuiteBarProps) {
  const [adding, setAdding] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const pieces = suiteOf(design);
  const active =
    (activePieceId ? pieces.find((piece) => piece.id === activePieceId) : null) ??
    null;
  const index = active ? pieces.findIndex((piece) => piece.id === active.id) : -1;

  const openConfig = () => {
    if (!active) return;
    setConfiguring(true);
  };

  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-[var(--edge)] bg-[var(--surface-card)] px-2 py-1.5 sm:px-3">
      <span className="hidden shrink-0 font-meta text-[8px] uppercase tracking-[0.16em] text-ink/40 sm:block">
        Suite
      </span>

      <div className="scroll-slim flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5">
        {pieces.length === 0 ? (
          <span className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[var(--edge)] bg-[var(--paper-light)] px-3 text-[10px] text-ink/60">
            Invitation · {design.pages.length} page
            {design.pages.length === 1 ? "" : "s"}
          </span>
        ) : (
          pieces.map((piece) => {
            const Icon = KIND_ICON[piece.kind] ?? FileText;
            const isActive = active?.id === piece.id;
            const guests = piece.guestVisible ?? piece.kind === "invitation";
            return (
              <button
                key={piece.id}
                type="button"
                onClick={() => onSelect(piece.id)}
                aria-pressed={isActive}
                title={`${piece.name} · ${piecePages(design, piece).length} page${
                  piecePages(design, piece).length === 1 ? "" : "s"
                } · ${sizeLabel(design, piece)}`}
                className={cn(
                  "pressable flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10px] transition-colors",
                  isActive
                    ? "border-transparent bg-[var(--ink)] text-[var(--paper)] shadow-[var(--shadow-pill)]"
                    : "border-[var(--edge)] bg-[var(--paper-light)] text-ink/60 hover:border-[var(--edge-strong)] hover:text-ink",
                )}
              >
                <Icon className="size-3" strokeWidth={1.8} />
                <span className="max-w-[132px] truncate">{piece.name}</span>
                {guests ? (
                  <Globe className="size-3 opacity-70" strokeWidth={1.7} />
                ) : (
                  <GlobeLock className="size-3 opacity-45" strokeWidth={1.7} />
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="pressable flex h-7 items-center gap-1 rounded-full border border-[var(--edge)] bg-[var(--paper-light)] px-2.5 text-[10px] text-ink/65 transition-colors hover:border-[var(--edge-strong)] hover:text-ink"
        >
          <Plus className="size-3.5" strokeWidth={1.8} />
          <span className="hidden sm:inline">Add piece</span>
        </button>
        <button
          type="button"
          onClick={openConfig}
          disabled={!active}
          title="Piece settings"
          aria-label="Piece settings"
          className="pressable grid size-7 place-items-center rounded-full border border-[var(--edge)] bg-[var(--paper-light)] text-ink/55 transition-colors hover:border-[var(--edge-strong)] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Settings2 className="size-3.5" strokeWidth={1.7} />
        </button>
      </div>

      <AddPieceDialog
        open={adding}
        onOpenChange={setAdding}
        onAdd={(kind) => {
          setAdding(false);
          onAdd(kind);
        }}
      />

      {active && (
        <PieceSettingsDialog
          key={active.id}
          open={configuring}
          onOpenChange={setConfiguring}
          design={design}
          piece={active}
          index={index}
          total={pieces.length}
          onRename={onRename}
          onMove={(direction) => {
            setConfiguring(false);
            onMove(direction);
          }}
          onDuplicate={() => {
            setConfiguring(false);
            onDuplicate();
          }}
          onGuestVisible={onGuestVisible}
          onPrint={onPrint}
          onShareStyle={() => {
            setConfiguring(false);
            onShareStyle();
          }}
          onDelete={() => {
            setConfiguring(false);
            setConfirmingDelete(true);
          }}
        />
      )}

      {active && (
        <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-ui text-lg">
                Delete “{active.name}”?
              </DialogTitle>
              <DialogDescription className="text-[11px] leading-relaxed text-ink/55">
                This removes the piece and its{" "}
                {piecePages(design, active).length} page
                {piecePages(design, active).length === 1 ? "" : "s"} from the suite.
                The rest of the invitation is untouched. You can undo this
                straight away with ⌘Z.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingDelete(false)}
                className="h-9 rounded-none text-[10px] uppercase tracking-[0.12em]"
              >
                Keep it
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  onDelete();
                }}
                className="h-9 rounded-none bg-[var(--red)] text-[10px] uppercase tracking-[0.12em] text-white hover:bg-[#8a0318]"
              >
                <Trash2 className="size-3.5" /> Delete piece
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddPieceDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (kind: PieceKind) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-ui text-lg">Add to the suite</DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed text-ink/55">
            A new piece is a real, editable page of its own size, kept with this
            invitation. It stays private until you open it to guests.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[52vh] grid-cols-1 gap-1.5 overflow-y-auto scroll-slim sm:grid-cols-2">
          {PIECE_KINDS.map((spec) => {
            const Icon = KIND_ICON[spec.id] ?? FileText;
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => onAdd(spec.id)}
                className="pressable flex items-start gap-2.5 rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-card)] px-3 py-2.5 text-left shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-150 hover:border-[var(--edge-strong)] hover:shadow-[var(--shadow-card)]"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--paper-deep)]/70 text-[var(--red)]">
                  <Icon className="size-3.5" strokeWidth={1.7} />
                </span>
                <span className="min-w-0">
                  <span className="block font-ui text-[0.74rem] font-medium text-ink">
                    {spec.label}
                  </span>
                  <span className="mt-0.5 block font-ui text-[0.64rem] leading-snug text-ink/45">
                    {spec.note}
                  </span>
                  <span className="mt-1 block font-meta text-[8px] uppercase tracking-[0.12em] text-ink/35">
                    {spec.widthMm} × {spec.heightMm} mm
                    {spec.sides > 1 ? ` · ${spec.sides} sides` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PieceSettingsDialog({
  open,
  onOpenChange,
  design,
  piece,
  index,
  total,
  onRename,
  onMove,
  onDuplicate,
  onGuestVisible,
  onPrint,
  onShareStyle,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: DesignDocument;
  piece: SuitePiece;
  index: number;
  total: number;
  onRename: (name: string) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onGuestVisible: (visible: boolean) => void;
  onPrint: (print: Partial<PiecePrint>) => void;
  onShareStyle: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(piece.name);
  const guests = piece.guestVisible ?? piece.kind === "invitation";
  const pages = piecePages(design, piece).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-ui text-lg">{piece.name}</DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed text-ink/55">
            {pages} page{pages === 1 ? "" : "s"} · {sizeLabel(design, piece)} ·{" "}
            {PIECE_KINDS.find((spec) => spec.id === piece.kind)?.label ?? "Piece"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => onRename(name)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onRename(name);
              }}
              className="h-8 w-[190px] rounded-none text-[11px]"
            />
          </Field>

          <div className="flex items-center justify-between gap-3 border-y border-[var(--edge)] py-2.5">
            <span className="min-w-0">
              <span className="block font-ui text-[0.68rem] text-ink/70">
                Show on the public invitation
              </span>
              <span className="mt-0.5 block font-ui text-[0.62rem] leading-snug text-ink/45">
                {guests
                  ? "Guests opening your link can see this piece."
                  : "Production only — guests never receive this piece."}
              </span>
            </span>
            <Switch
              checked={guests}
              onCheckedChange={(value) => onGuestVisible(value)}
              className="shrink-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                disabled={index <= 0}
                onClick={() => onMove(-1)}
                className="h-8 flex-1 rounded-none text-[10px]"
              >
                <ChevronLeft className="size-3.5" /> Earlier
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={index >= total - 1}
                onClick={() => onMove(1)}
                className="h-8 flex-1 rounded-none text-[10px]"
              >
                Later <ChevronRight className="size-3.5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onDuplicate}
              className="h-8 rounded-none text-[10px] uppercase tracking-[0.1em]"
            >
              <Copy className="size-3.5" /> Duplicate
            </Button>
          </div>

          <div className="rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--paper-deep)]/50 p-3">
            <p className="section-label mb-2">Print brief</p>
            <div className="space-y-2">
              <Field label="Units">
                <Select
                  value={piece.print.unit}
                  onValueChange={(unit) => onPrint({ unit: unit as PiecePrint["unit"] })}
                >
                  <SelectTrigger className={smallSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm">Millimetres</SelectItem>
                    <SelectItem value="in">Inches</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Bleed">
                <Select
                  value={String(piece.print.bleedMm)}
                  onValueChange={(value) => onPrint({ bleedMm: Number(value) })}
                >
                  <SelectTrigger className={smallSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="3">3 mm</SelectItem>
                    <SelectItem value="5">5 mm</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Safe margin">
                <Select
                  value={String(piece.print.safeMm)}
                  onValueChange={(value) => onPrint({ safeMm: Number(value) })}
                >
                  <SelectTrigger className={smallSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="3">3 mm</SelectItem>
                    <SelectItem value="5">5 mm</SelectItem>
                    <SelectItem value="6">6 mm</SelectItem>
                    <SelectItem value="10">10 mm</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Crop marks">
                <Switch
                  checked={piece.print.cropMarks}
                  onCheckedChange={(cropMarks) => onPrint({ cropMarks })}
                />
              </Field>
            </div>
            <p className="mt-2 font-ui text-[0.6rem] leading-relaxed text-ink/40">
              The export window opens from this brief, so every piece keeps its
              own paper, bleed and marks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onShareStyle}
              className="h-8 flex-1 rounded-none text-[10px] uppercase tracking-[0.1em]"
            >
              <Palette className="size-3.5" /> Share style
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              disabled={total <= 1}
              className="h-8 flex-1 rounded-none text-[10px] uppercase tracking-[0.1em] hover:border-[var(--red)] hover:text-[var(--red)]"
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
