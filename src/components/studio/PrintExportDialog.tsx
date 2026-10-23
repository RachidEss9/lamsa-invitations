import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRINT_SETTINGS,
  PAPER_SIZES,
  artworkRect,
  buildPrintPdf,
  downloadBlob,
  formatMeasurement,
  fromMm,
  outputDimensions,
  overflowElements,
  pagesForPrint,
  paperDimensions,
  printableArea,
  safeFilename,
  toMm,
  type PaperId,
  type PrintSettings,
  type PrintUnit,
} from "@/lib/print";
import type { DesignDocument, DesignPage } from "@/lib/design";
import { AlertCircle, Check, Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const SETTINGS_KEY = "lamsa.print.settings";

function readSettings(): PrintSettings {
  if (typeof window === "undefined") return DEFAULT_PRINT_SETTINGS;
  try {
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null");
    if (!stored || typeof stored !== "object") return DEFAULT_PRINT_SETTINGS;
    return {
      ...DEFAULT_PRINT_SETTINGS,
      ...stored,
      margins: { ...DEFAULT_PRINT_SETTINGS.margins, ...(stored.margins ?? {}) },
    } as PrintSettings;
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-ink/12 px-4 py-3">
      <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/45">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-[11px] text-ink/60">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

const smallInput =
  "h-7 rounded-none border-ink/20 bg-transparent px-1.5 text-right text-[11px] tabular-nums shadow-none focus-visible:border-ink focus-visible:ring-0";

function UnitInput({
  valueMm,
  unit,
  onChange,
}: {
  valueMm: number;
  unit: PrintUnit;
  onChange: (valueMm: number) => void;
}) {
  const value = fromMm(valueMm, unit);
  return (
    <Input
      type="number"
      value={Math.round(value * 10) / 10}
      step={unit === "in" ? 0.1 : 1}
      min={0}
      onChange={(event) => {
        const parsed = Number(event.target.value);
        if (Number.isFinite(parsed)) onChange(toMm(parsed, unit));
      }}
      className={cn(smallInput, "w-full")}
    />
  );
}

interface PrintExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: DesignDocument;
  pageIndex: number;
  imageUrls: Record<string, string>;
  title: string;
  rtl?: boolean;
}

export function PrintExportDialog({
  open,
  onOpenChange,
  design,
  pageIndex,
  imageUrls,
  title,
  rtl,
}: PrintExportDialogProps) {
  const [settings, setSettings] = useState<PrintSettings>(() => readSettings());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const captureRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const patch = (value: Partial<PrintSettings>) =>
    setSettings((current) => ({ ...current, ...value }));

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Settings persistence is a convenience; export still works.
    }
  }, [settings]);

  const selectedPages = useMemo(
    () => pagesForPrint(design, settings, pageIndex),
    [design, pageIndex, settings],
  );
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewEntry =
    selectedPages.find((entry) => entry.page.id === previewId) ??
    selectedPages.find((entry) => entry.index === pageIndex) ??
    selectedPages[0];

  const page = paperDimensions(settings);
  const outputDims = outputDimensions(settings);
  const area = printableArea(settings);
  const art = artworkRect(settings);
  const overflow = previewEntry ? overflowElements(previewEntry.page) : [];
  const bleedPage = {
    x: settings.bleed,
    y: settings.bleed,
    w: Math.max(1, page.widthMm - settings.bleed * 2),
    h: Math.max(1, page.heightMm - settings.bleed * 2),
  };

  const exportPage = (source: DesignPage): DesignPage =>
    settings.includeBackground ? source : { ...source, background: "#ffffff" };

  const exportPdf = async () => {
    if (busy) return;
    setError(null);
    setDone(false);
    setBusy("Preparing pages");
    try {
      // Let the webfont faces used by these pages settle before capturing, so
      // Arabic shaping and display faces are rendered with the real font.
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      const { snapdom } = await import("@zumer/snapdom");
      const captures: { image: string; background: string; label: string }[] = [];
      const artWidthPx = Math.round((art.w / 25.4) * settings.dpi);
      const scale = Math.min(6, Math.max(0.5, artWidthPx / 1000));

      for (let index = 0; index < selectedPages.length; index += 1) {
        const entry = selectedPages[index];
        setBusy(`Drawing page ${index + 1} of ${selectedPages.length}`);
        const node = captureRefs.current[entry.page.id];
        if (!node) throw new Error("The print canvas did not mount. Please reopen this window.");
        const shot = await snapdom(node, {
          scale,
          dpr: 1,
          embedFonts: true,
          backgroundColor: settings.includeBackground
            ? undefined
            : "#ffffff",
        });
        const canvas = await shot.toCanvas();
        captures.push({
          image: canvas.toDataURL("image/png"),
          background: settings.includeBackground
            ? /^#|gradient/.test(entry.page.background)
              ? entry.page.background
              : "#ffffff"
            : "#ffffff",
          label: entry.page.name,
        });
        // Release the intermediate canvas early on long invitations.
        canvas.width = 1;
        canvas.height = 1;
      }

      setBusy("Composing PDF");
      const blob = await buildPrintPdf(captures, settings, title);
      downloadBlob(blob, `${safeFilename(title)}-print.pdf`);
      setDone(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The PDF could not be generated in this browser.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent className="max-h-[92vh] sm:max-w-[min(1000px,calc(100%_-_2rem))] gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-ink/12 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 font-ui text-xl font-semibold tracking-[-0.01em]">
            <FileText className="size-4 text-[var(--red)]" />
            Print-ready PDF
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed text-ink/55">
            A static card at true paper size for printing. Your digital invitation
            — its opening, animations, tap reveals, and public link — is untouched.
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-[360px_1fr]">
          <div className="border-b border-ink/12 lg:border-b-0 lg:border-r">
            <Section title="Paper">
              <FieldRow label="Size">
                <Select
                  value={settings.paper}
                  onValueChange={(value) => patch({ paper: value as PaperId })}
                >
                  <SelectTrigger className="h-7 rounded-none text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_SIZES.map((paper) => (
                      <SelectItem key={paper.id} value={paper.id}>
                        {paper.name}
                        {paper.id === "custom"
                          ? ""
                          : ` · ${Math.round(paper.widthMm)}×${Math.round(paper.heightMm)} mm`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              {settings.paper === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <FieldRow label="Width">
                    <UnitInput
                      valueMm={toMm(settings.customWidth, settings.unit)}
                      unit={settings.unit}
                      onChange={(mm) =>
                        patch({ customWidth: fromMm(mm, settings.unit) })
                      }
                    />
                  </FieldRow>
                  <FieldRow label="Height">
                    <UnitInput
                      valueMm={toMm(settings.customHeight, settings.unit)}
                      unit={settings.unit}
                      onChange={(mm) =>
                        patch({ customHeight: fromMm(mm, settings.unit) })
                      }
                    />
                  </FieldRow>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <FieldRow label="Units">
                  <Select
                    value={settings.unit}
                    onValueChange={(unit) =>
                      patch({
                        unit: unit as PrintUnit,
                        // Convert the custom size instead of reinterpreting it.
                        customWidth: fromMm(
                          toMm(settings.customWidth, settings.unit),
                          unit as PrintUnit,
                        ),
                        customHeight: fromMm(
                          toMm(settings.customHeight, settings.unit),
                          unit as PrintUnit,
                        ),
                      })
                    }
                  >
                    <SelectTrigger className="h-7 rounded-none text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">Millimetres</SelectItem>
                      <SelectItem value="cm">Centimetres</SelectItem>
                      <SelectItem value="in">Inches</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Orientation">
                  <Select
                    value={settings.orientation}
                    onValueChange={(orientation) =>
                      patch({ orientation: orientation as PrintSettings["orientation"] })
                    }
                  >
                    <SelectTrigger className="h-7 rounded-none text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
              <p className="text-[9px] leading-relaxed text-ink/40">
                Page {formatMeasurement(page.widthMm, settings.unit)} ×{" "}
                {formatMeasurement(page.heightMm, settings.unit)} · printable area{" "}
                {formatMeasurement(area.w, settings.unit)} ×{" "}
                {formatMeasurement(area.h, settings.unit)}
              </p>
              <p className="text-[9px] leading-relaxed text-ink/40">
                PDF media box:{" "}
                {formatMeasurement(outputDims.widthMm, settings.unit)} ×{" "}
                {formatMeasurement(outputDims.heightMm, settings.unit)}
                {settings.bleed > 0
                  ? ` · ${formatMeasurement(settings.bleed, settings.unit)} bleed band on each edge, trimmed off after printing`
                  : " · trim size, no bleed"}
              </p>
            </Section>

            <Section title="Margins & bleed">
              <div className="grid grid-cols-4 gap-1.5">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <label key={side} className="block">
                    <span className="mb-0.5 block text-center text-[8px] uppercase tracking-[0.08em] text-ink/40">
                      {side}
                    </span>
                    <UnitInput
                      valueMm={toMm(settings.margins[side], "mm")}
                      unit={settings.unit}
                      onChange={(mm) =>
                        patch({
                          margins: { ...settings.margins, [side]: mm },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FieldRow label="Bleed">
                  <Select
                    value={String(settings.bleed)}
                    onValueChange={(value) => patch({ bleed: Number(value) })}
                  >
                    <SelectTrigger className="h-7 rounded-none text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="3">3 mm</SelectItem>
                      <SelectItem value="5">5 mm</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Artwork">
                  <Select
                    value={settings.fit}
                    onValueChange={(fit) => patch({ fit: fit as PrintSettings["fit"] })}
                  >
                    <SelectTrigger className="h-7 rounded-none text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fit">Fit inside</SelectItem>
                      <SelectItem value="fill">Fill page</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
              <label className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink/60">Crop marks</span>
                <Switch
                  checked={settings.cropMarks}
                  onCheckedChange={(cropMarks) => patch({ cropMarks })}
                  className="scale-90"
                  disabled={settings.bleed === 0}
                />
              </label>
              {settings.bleed === 0 && (
                <p className="text-[9px] leading-relaxed text-ink/35">
                  Crop marks need a bleed area to sit in. Add bleed to enable them.
                </p>
              )}
            </Section>

            <Section title="Output">
              <div className="grid grid-cols-2 gap-2">
                <FieldRow label="Pages">
                  <Select
                    value={settings.scope}
                    onValueChange={(scope) => patch({ scope: scope as PrintSettings["scope"] })}
                  >
                    <SelectTrigger className="h-7 rounded-none text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All pages</SelectItem>
                      <SelectItem value="current">This page</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Resolution">
                  <Select
                    value={String(settings.dpi)}
                    onValueChange={(value) =>
                      patch({ dpi: Number(value) as PrintSettings["dpi"] })
                    }
                  >
                    <SelectTrigger className="h-7 rounded-none text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="150">150 DPI · draft</SelectItem>
                      <SelectItem value="200">200 DPI</SelectItem>
                      <SelectItem value="300">300 DPI · print</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
              <label className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink/60">Include page background</span>
                <Switch
                  checked={settings.includeBackground}
                  onCheckedChange={(includeBackground) => patch({ includeBackground })}
                  className="scale-90"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink/60">Show print guides</span>
                <Switch
                  checked={settings.guides}
                  onCheckedChange={(guides) => patch({ guides })}
                  className="scale-90"
                />
              </label>
              <p className="text-[9px] leading-relaxed text-ink/40">
                Guides and safe-area lines are preview-only and never printed.
              </p>
            </Section>

            <div className="space-y-2 p-4">
              {error && (
                <p className="flex items-start gap-1.5 border border-[var(--red)]/30 bg-[var(--red)]/5 p-2 text-[10px] leading-relaxed text-[var(--red)]">
                  <AlertCircle className="mt-0.5 size-3 shrink-0" /> {error}
                </p>
              )}
              {done && !busy && (
                <p className="flex items-center gap-1.5 text-[10px] text-ink/60">
                  <Check className="size-3 text-[var(--red)]" /> PDF downloaded.
                </p>
              )}
              <Button
                type="button"
                onClick={() => void exportPdf()}
                disabled={Boolean(busy)}
                className="h-9 w-full rounded-none text-[10px] uppercase tracking-[0.14em]"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                {busy ?? `Download PDF · ${selectedPages.length} page${selectedPages.length === 1 ? "" : "s"}`}
              </Button>
              <p className="text-[9px] leading-relaxed text-ink/35">
                Pages are rendered from this invitation's saved canvas at the
                selected resolution, so Arabic shaping and every font keep their
                appearance. The text itself is rasterised, not selectable.
              </p>
            </div>
          </div>

          <div className="bg-[var(--paper-deep)] p-4">
            <div className="mb-2 flex flex-wrap items-center gap-1">
              {selectedPages.map((entry) => (
                <button
                  key={entry.page.id}
                  type="button"
                  onClick={() => setPreviewId(entry.page.id)}
                  className={cn(
                    "border px-2 py-1 text-[9px] uppercase tracking-[0.08em]",
                    previewEntry.page.id === entry.page.id
                      ? "border-ink bg-ink text-[#f2f1ed]"
                      : "border-ink/20 bg-[var(--paper-light)] text-ink/55 hover:border-ink",
                  )}
                >
                  {entry.index + 1} · {entry.page.name}
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <div
                className="relative w-full max-w-[430px] overflow-hidden bg-white shadow-[0_18px_45px_rgba(22,22,22,0.16)]"
                style={{ aspectRatio: `${page.widthMm} / ${page.heightMm}` }}
              >
                {previewEntry && (
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      left: `${(art.x / page.widthMm) * 100}%`,
                      top: `${(art.y / page.heightMm) * 100}%`,
                      width: `${(art.w / page.widthMm) * 100}%`,
                      height: `${(art.h / page.heightMm) * 100}%`,
                    }}
                  >
                    <DesignStage
                      width={exportPage(previewEntry.page).width}
                      height={exportPage(previewEntry.page).height}
                    >
                      {() => (
                        <DesignPageView
                          page={exportPage(previewEntry.page)}
                          time={100000}
                          imageUrls={imageUrls}
                          guestName={null}
                          rtl={rtl}
                          ignoreExit
                        />
                      )}
                    </DesignStage>
                  </div>
                )}

                {settings.guides && (
                  <>
                    <span
                      className="pointer-events-none absolute border border-dashed border-[#c4472f]/70"
                      style={{
                        left: `${(area.x / page.widthMm) * 100}%`,
                        top: `${(area.y / page.heightMm) * 100}%`,
                        width: `${(area.w / page.widthMm) * 100}%`,
                        height: `${(area.h / page.heightMm) * 100}%`,
                      }}
                    />
                    {settings.bleed > 0 && (
                      <span
                        className="pointer-events-none absolute border border-dashed border-[#3f6fa0]/70"
                        style={{
                          left: `${(bleedPage.x / page.widthMm) * 100}%`,
                          top: `${(bleedPage.y / page.heightMm) * 100}%`,
                          width: `${(bleedPage.w / page.widthMm) * 100}%`,
                          height: `${(bleedPage.h / page.heightMm) * 100}%`,
                        }}
                      />
                    )}
                    <span
                      className="pointer-events-none absolute inset-[6%] border border-dashed border-[#8a8275]/45"
                      title="Suggested safe area"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-ink/50">
              <p>
                {settings.fit === "fit"
                  ? "Fit inside keeps the whole card visible and lets the paper margins show."
                  : "Fill page covers the printable area; edges beyond the card are cropped."}
                {settings.fit === "fill" &&
                  " This does not resize the digital invitation."}
              </p>
              {overflow.length > 0 && (
                <p className="flex items-start gap-1.5 border border-[#b38f6f]/40 bg-[#b38f6f]/10 p-2 text-[#6b5334]">
                  <AlertCircle className="mt-0.5 size-3 shrink-0" />
                  {overflow.length} layer{overflow.length === 1 ? "" : "s"} sit outside
                  the canvas ({overflow
                    .slice(0, 3)
                    .map((element) => element.name)
                    .join(", ")}
                  {overflow.length > 3 ? "…" : ""}) and will be cropped on paper.
                </p>
              )}
              {!settings.includeBackground && (
                <p>Page backgrounds are omitted; the card prints on the paper colour.</p>
              )}
            </div>
          </div>
        </div>

        {/* Offscreen, real render targets captured for the PDF. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-12000px] top-0">
            {selectedPages.map((entry) => (
              <div
                key={entry.page.id}
                ref={(node) => {
                  captureRefs.current[entry.page.id] = node;
                }}
                style={{ width: 1000, height: 1333.33, overflow: "hidden" }}
              >
                <DesignPageView
                  page={exportPage(entry.page)}
                  time={100000}
                  imageUrls={imageUrls}
                  guestName={null}
                  rtl={rtl}
                  ignoreExit
                />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
