import { useMemo, useState } from "react";
import { AlertTriangle, CircleAlert, Info, RefreshCw } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PREFLIGHT_SETTINGS,
  runPreflight,
  type PreflightReport,
  type PreflightSeverity,
  type PreflightSettings,
} from "@/lib/publishing/preflight";
import type { PublicationDocument } from "@/lib/publishing/model";
import type { StudioAssetRecord } from "@/hooks/publishing/usePublishingEditor";
import { cn } from "@/lib/utils";

/**
 * The preflight report. It runs against the live document, so re-running after
 * a fix is the same evaluation on new data — never a cached list. Findings
 * navigate to their page and object, and estimated findings say so.
 */
export interface PreflightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PublicationDocument;
  assets: readonly StudioAssetRecord[];
  onNavigate: (pageId: string, objectId?: string) => void;
}

const SEVERITY_ORDER: PreflightSeverity[] = ["error", "warning", "info"];

export function PreflightDialog({
  open,
  onOpenChange,
  document,
  assets,
  onNavigate,
}: PreflightDialogProps) {
  const [settings, setSettings] = useState<PreflightSettings>(
    DEFAULT_PREFLIGHT_SETTINGS,
  );
  const [filter, setFilter] = useState<PreflightSeverity | "all">("all");
  // Derived, never stored: the report is always the current document. The
  // token only exists so "Re-run" can re-evaluate the same data on request.
  const [runToken, setRunToken] = useState(0);
  const report: PreflightReport = useMemo(
    () =>
      runPreflight(
        document,
        assets.map((asset) => ({
          id: asset.assetId,
          name: asset.filename,
          width: asset.width,
          height: asset.height,
          mime: asset.mimeType,
          storageId: asset.originalUrl ?? undefined,
        })),
        settings,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the token is the re-run trigger
    [assets, document, settings, runToken],
  );

  const findings = useMemo(
    () =>
      filter === "all"
        ? report.findings
        : report.findings.filter((finding) => finding.severity === filter),
    [filter, report],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden border-[var(--rule)] bg-[var(--paper)] p-0">
        <DialogHeader className="border-b border-[var(--rule)] px-4 py-3">
          <DialogTitle className="font-display text-lg text-[var(--ink)]">
            Print preflight
          </DialogTitle>
          <DialogDescription className="text-[0.75rem] leading-relaxed text-[var(--ink-soft)]">
            Checks the live publication before PDF export. Image resolution is
            measured; text overflow is an estimate and marked as such.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--rule)] px-4 py-3">
          <label className="flex flex-col gap-1">
            <span className="font-meta text-[0.5rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              Target ppi
            </span>
            <Input
              type="number"
              min={72}
              max={1200}
              value={settings.targetDpi}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  targetDpi: Math.max(72, Number(event.target.value) || 300),
                }))
              }
              className="h-7 w-20 rounded-[3px] text-[0.75rem]"
              aria-label="Target pixels per inch"
            />
          </label>
          <label className="flex items-center gap-2 pb-1 text-[0.72rem] text-[var(--ink)]">
            <input
              type="checkbox"
              checked={settings.requireBleed}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  requireBleed: event.target.checked,
                }))
              }
            />
            Profile needs bleed
          </label>
          <label className="flex items-center gap-2 pb-1 text-[0.72rem] text-[var(--ink)]">
            <input
              type="checkbox"
              checked={settings.cropMarks}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  cropMarks: event.target.checked,
                }))
              }
            />
            Crop marks
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto h-7 gap-1 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.1em]"
            onClick={() => setRunToken((token) => token + 1)}
          >
            <RefreshCw className="size-3" />
            Re-run
          </Button>
        </div>

        <div className="grid gap-3 border-b border-[var(--rule)] px-4 py-3 sm:grid-cols-4">
          <Summary label="Errors" value={report?.errors ?? 0} tone="error" />
          <Summary label="Warnings" value={report?.warnings ?? 0} tone="warning" />
          <Summary label="Information" value={report?.infos ?? 0} tone="info" />
          <div className="rounded-[3px] border border-[var(--rule)] px-3 py-2">
            <p className="font-meta text-[0.5rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              Export readiness
            </p>
            <p
              className={cn(
                "mt-1 text-[0.8rem]",
                report?.printable ? "text-[var(--olive,#6b7150)]" : "text-[var(--red)]",
              )}
            >
              {report?.printable
                ? "No blocking errors"
                : `${report?.errors ?? 0} blocking`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--rule)] px-4 py-2">
          {(["all", ...SEVERITY_ORDER] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full border px-2 py-1 font-meta text-[0.5rem] uppercase tracking-[0.12em]",
                filter === value
                  ? "border-[var(--red)] text-[var(--red)]"
                  : "border-[var(--rule)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
              )}
            >
              {value}
            </button>
          ))}
          <span className="ml-auto font-meta text-[0.5rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            {findings.length} shown
          </span>
        </div>

        <div className="max-h-[42vh] overflow-auto scroll-slim">
          {findings.length === 0 ? (
            <p className="px-4 py-6 text-center text-[0.78rem] text-[var(--ink-soft)]">
              Nothing in this filter.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--rule)]">
              {findings.map((finding) => (
                <li key={finding.id} className="px-4 py-2.5">
                  <div className="flex items-start gap-2">
                    {finding.severity === "error" ? (
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-[var(--red)]" />
                    ) : finding.severity === "warning" ? (
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--amber,#a8762a)]" />
                    ) : (
                      <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--ink-soft)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.78rem] leading-snug text-[var(--ink)]">
                        {finding.title}
                        {finding.pageIndex !== undefined ? (
                          <span className="ml-2 font-meta text-[0.48rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                            page {finding.pageIndex + 1}
                          </span>
                        ) : null}
                        {finding.confidence === "estimated" ? (
                          <span className="ml-2 rounded-full border border-[var(--rule)] px-1.5 py-0.5 font-meta text-[0.45rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                            estimated
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[0.72rem] leading-relaxed text-[var(--ink-soft)]">
                        {finding.detail}
                      </p>
                      {finding.hint ? (
                        <p className="mt-0.5 text-[0.7rem] leading-relaxed text-[var(--ink-soft)]">
                          <span className="text-[var(--ink)]">Fix:</span>{" "}
                          {finding.hint}
                        </p>
                      ) : null}
                      {finding.pageId ? (
                        <button
                          type="button"
                          className="mt-1 font-meta text-[0.48rem] uppercase tracking-[0.12em] text-[var(--red)] hover:underline"
                          onClick={() => {
                            onNavigate(finding.pageId!, finding.objectId);
                            onOpenChange(false);
                          }}
                        >
                          Open location
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--rule)] px-4 py-2 text-[0.68rem] leading-relaxed text-[var(--ink-soft)]">
          Colour management, PDF/X and font licensing cannot be verified in the
          browser; the exporter states those limits instead of claiming
          compliance.
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: PreflightSeverity;
}) {
  return (
    <div className="rounded-[3px] border border-[var(--rule)] px-3 py-2">
      <p className="font-meta text-[0.5rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-lg leading-none",
          tone === "error" && value > 0
            ? "text-[var(--red)]"
            : tone === "warning" && value > 0
              ? "text-[var(--amber,#a8762a)]"
              : "text-[var(--ink)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
