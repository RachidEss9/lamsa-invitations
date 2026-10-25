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
  buildPrintPdf,
  downloadBlob,
  formatMeasurement,
  formatToMillimetres,
  fromMm,
  outputDimensions,
  pageArtworkRect,
  pagesForPrint,
  paperDimensions,
  preflightDesign,
  printableArea,
  safeFilename,
  toMm,
  type PaperId,
  type PreflightIssue,
  type PreflightMeasurements,
  type PrintSettings,
  type PrintUnit,
} from "@/lib/print";
import {
  pageAspectOf,
  pageSizeOf,
  type DesignDocument,
  type DesignPage,
} from "@/lib/design";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
} from "lucide-react";
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
    <section className="border-b border-[var(--edge)] px-4 py-3">
      <p className="section-label mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="shrink-0 font-ui text-[0.68rem] text-ink/55">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

const smallInput =
  "field-compact h-7 border-[var(--edge)] bg-[var(--surface-card)] px-1.5 text-right text-[0.7rem] shadow-none focus-visible:ring-0";

function PreflightPanel({
  issues,
  errorCount,
}: {
  issues: PreflightIssue[];
  errorCount: number;
}) {
  const tone = (severity: PreflightIssue["severity"]) =>
    severity === "error"
      ? "border-[var(--red)]/35 bg-[var(--red)]/5 text-[var(--red)]"
      : severity === "warning"
        ? "border-[#b38f6f]/45 bg-[#b38f6f]/10 text-[#6b5334]"
        : "border-ink/15 bg-[var(--paper-deep)] text-ink/60";
  const Icon = ({ severity }: { severity: PreflightIssue["severity"] }) =>
    severity === "error" ? (
      <AlertCircle className="mt-0.5 size-3 shrink-0" />
    ) : severity === "warning" ? (
      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
    ) : (
      <Info className="mt-0.5 size-3 shrink-0" />
    );

  return (
    <div className="space-y-1.5">
      <p className="section-label flex items-center justify-between">
        <span>Preflight</span>
        <span className={errorCount > 0 ? "text-[var(--red)]" : undefined}>
          {issues.length === 0
            ? "Ready to print"
            : `${issues.length} note${issues.length === 1 ? "" : "s"}${
                errorCount > 0 ? ` · ${errorCount} blocking` : ""
              }`}
        </span>
      </p>
      {issues.length === 0 ? (
        <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-ink/55">
          <Check className="mt-0.5 size-3 shrink-0 text-[var(--red)]" />
          Text fits its boxes, images are sharp enough, and every layer sits on
          the canvas.
        </p>
      ) : (
        <div className="space-y-1">
          {issues.slice(0, 8).map((issue) => (
            <p
              key={issue.id}
              className={cn(
                "flex items-start gap-1.5 border p-2 text-[10px] leading-relaxed",
                tone(issue.severity),
              )}
            >
              <Icon severity={issue.severity} />
              <span>
                <span className="block font-medium">{issue.title}</span>
                <span className="block opacity-80">{issue.detail}</span>
              </span>
            </p>
          ))}
          {issues.length > 8 && (
            <p className="text-[9px] text-ink/40">
              + {issues.length - 8} more note{issues.length - 8 === 1 ? "" : "s"} in
              this export.
            </p>
          )}
        </div>
      )}
      <p className="text-[9px] leading-relaxed text-ink/35">
        Measured from this render: real type heights and image pixels at the
        selected print size. Notes never block an export.
      </p>
    </div>
  );
}

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
  const appliedFormat = useRef<string | null>(null);

  const patch = (value: Partial<PrintSettings>) =>
    setSettings((current) => ({ ...current, ...value }));

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Settings persistence is a convenience; export still works.
    }
  }, [settings]);

  // A design created from a blank canvas carries the exact size the host asked
  // for. Printing starts from that brief instead of assuming A5, so the PDF is
  // the stationery they designed — the dialog can still override it.
  useEffect(() => {
    if (!open) return;
    const format = design.format;
    if (!format) return;
    const key = `${format.unit}:${format.width}x${format.height}:${format.bleed}`;
    if (appliedFormat.current === key) return;
    appliedFormat.current = key;
    const dims = formatToMillimetres(format);
    const landscape = dims.widthMm > dims.heightMm;
    const shortEdge = Math.min(dims.widthMm, dims.heightMm);
    const longEdge = Math.max(dims.widthMm, dims.heightMm);
    setSettings((current) => {
      const unit: PrintUnit = format.unit === "px" ? "mm" : format.unit;
      return {
        ...current,
        paper: "custom",
        orientation: landscape ? "landscape" : "portrait",
        unit,
        customWidth: Math.round(fromMm(shortEdge, unit) * 10) / 10,
        customHeight: Math.round(fromMm(longEdge, unit) * 10) / 10,
        bleed: dims.bleedMm >= 2.5 ? 3 : 0,
      };
    });
  }, [open, design.format]);

  const selectedPages = useMemo(
    () => pagesForPrint(design, settings, pageIndex),
    [design, pageIndex, settings],
  );

  // Preflight needs two things only the browser knows: how tall the real text
  // wants to be, and how many pixels each uploaded image actually has. Both
  // are measured from the offscreen render that will be captured for print.
  const [measurements, setMeasurements] = useState<PreflightMeasurements>({});
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
        const roots = selectedPages
          .map((entry) => captureRefs.current[entry.page.id])
          .filter((node): node is HTMLDivElement => Boolean(node));
        await Promise.all(
          roots.flatMap((root) =>
            Array.from(root.querySelectorAll("img")).map((image) =>
              image.decode?.().catch(() => undefined),
            ),
          ),
        );
        if (cancelled) return;
        const imageWidths: Record<string, number> = {};
        const textHeights: Record<string, { content: number; box: number }> = {};
        for (const entry of selectedPages) {
          const root = captureRefs.current[entry.page.id];
          if (!root) continue;
          for (const element of entry.page.elements) {
            const node = root.querySelector<HTMLElement>(
              `[data-element-id="${element.id}"]`,
            );
            if (!node) continue;
            if (element.kind === "image") {
              const image = node.querySelector("img");
              if (image?.naturalWidth) imageWidths[element.id] = image.naturalWidth;
            }
            if (element.kind === "text") {
              const inner = node.firstElementChild
                ?.firstElementChild as HTMLElement | null;
              if (!inner) continue;
              const padding =
                element.textPadding ??
                ((element.textBorderWidth ?? 0) > 0 || element.textBackground
                  ? 10
                  : 0);
              textHeights[element.id] = {
                content: inner.offsetHeight,
                box: Math.max(0, element.h - padding * 2),
              };
            }
          }
        }
        if (!cancelled) setMeasurements({ imageWidths, textHeights });
      } catch {
        // Measurement is advisory; export still works if it cannot run.
      }
    }, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, selectedPages, settings.includeBackground]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewEntry =
    selectedPages.find((entry) => entry.page.id === previewId) ??
    selectedPages.find((entry) => entry.index === pageIndex) ??
    selectedPages[0];

  const page = paperDimensions(settings);
  const outputDims = outputDimensions(settings);
  const area = printableArea(settings);
  // The placed artwork keeps the proportions of the page being printed, not a
  // fixed 3:4 card, so custom document sizes are never letterboxed wrongly.
  const art = pageArtworkRect(settings, previewEntry?.page);
  const issues = useMemo(
    () => preflightDesign(design, settings, pageIndex, measurements),
    [design, settings, pageIndex, measurements],
  );
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const bleedPage = {
    x: settings.bleed,
    y: settings.bleed,
    w: Math.max(1, page.widthMm - settings.bleed * 2),
    h: Math.max(1, page.heightMm - settings.bleed * 2),
  };

  const exportPage = (source: DesignPage): DesignPage =>
    settings.includeBackground ? source : { ...source, background: "#ffffff" };

  // Renders each selected page from its live canvas node. Everything else —
  // PDF and flat images alike — is built from these exact captures, so print
  // output always matches what the dialog previews.
  const capturePageCanvas = async (entry: (typeof selectedPages)[number]) => {
    const node = captureRefs.current[entry.page.id];
    if (!node) throw new Error("The print canvas did not mount. Please reopen this window.");
    const { snapdom } = await import("@zumer/snapdom");
    const size = pageSizeOf(entry.page);
    const pageArt = pageArtworkRect(settings, entry.page);
    const artWidthPx = Math.round((pageArt.w / 25.4) * settings.dpi);
    const scale = Math.min(6, Math.max(0.5, artWidthPx / size.width));
    const shot = await snapdom(node, {
      scale,
      dpr: 1,
      embedFonts: true,
      backgroundColor: settings.includeBackground ? undefined : "#ffffff",
    });
    return await shot.toCanvas();
  };

  const prepareCapture = async () => {
    // Let the webfont faces used by these pages settle before capturing, so
    // Arabic shaping and display faces are rendered with the real font.
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => window.setTimeout(resolve, 220));
  };

  const exportImages = async (format: "png" | "jpeg") => {
    if (busy) return;
    setError(null);
    setDone(false);
    setBusy("Rendering images");
    try {
      await prepareCapture();
      for (let index = 0; index < selectedPages.length; index += 1) {
        const entry = selectedPages[index];
        setBusy(`Rendering image ${index + 1} of ${selectedPages.length}`);
        const canvas = await capturePageCanvas(entry);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, format === "png" ? "image/png" : "image/jpeg", 0.94),
        );
        canvas.width = 1;
        canvas.height = 1;
        if (!blob) throw new Error("This browser could not encode the image.");
        const pageSuffix =
          selectedPages.length > 1 ? `-page-${entry.index + 1}` : "";
        downloadBlob(
          blob,
          `${safeFilename(title)}${pageSuffix}.${format === "png" ? "png" : "jpg"}`,
        );
        // Browsers throttle a burst of downloads, so give each one a beat.
        if (index < selectedPages.length - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 320));
        }
      }
      setDone(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The images could not be exported in this browser.",
      );
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    if (busy) return;
    setError(null);
    setDone(false);
    setBusy("Preparing pages");
    try {
      await prepareCapture();
      const captures: {
        image: string;
        background: string;
        label: string;
        aspect: number;
      }[] = [];

      for (let index = 0; index < selectedPages.length; index += 1) {
        const entry = selectedPages[index];
        setBusy(`Drawing page ${index + 1} of ${selectedPages.length}`);
        const canvas = await capturePageCanvas(entry);
        captures.push({
          image: canvas.toDataURL("image/png"),
          background: settings.includeBackground
            ? /^#|gradient/.test(entry.page.background)
              ? entry.page.background
              : "#ffffff"
            : "#ffffff",
          label: entry.page.name,
          aspect: pageAspectOf(entry.page),
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
        <DialogHeader className="border-b border-ink/12 px-4 py-3">
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
                  <Check className="size-3 text-[var(--red)]" /> Download started.
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
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void exportImages("png")}
                  disabled={Boolean(busy)}
                  className="h-8 rounded-none text-[9px] uppercase tracking-[0.12em]"
                >
                  <ImageIcon className="size-3.5" /> PNG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void exportImages("jpeg")}
                  disabled={Boolean(busy)}
                  className="h-8 rounded-none text-[9px] uppercase tracking-[0.12em]"
                >
                  <ImageIcon className="size-3.5" /> JPG
                </Button>
              </div>
              <p className="text-[9px] leading-relaxed text-ink/35">
                Pages are rendered from this invitation's saved canvas at the
                selected resolution, so Arabic shaping and every font keep their
                appearance. Output is RGB and rasterised: no CMYK, spot colours,
                ICC profiles, or selectable text. For press work ask your printer
                whether they accept RGB PDFs or need a converted file.
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
              <PreflightPanel issues={issues} errorCount={errorCount} />
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
                style={{ ...pageSizeOf(entry.page), overflow: "hidden" }}
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
