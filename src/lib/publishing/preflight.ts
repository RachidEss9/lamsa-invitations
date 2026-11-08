/**
 * Print preflight.
 *
 * Preflight asks a different question from validation: not "is this document
 * well formed?" but "will this file print as the designer intends?". The
 * document checks therefore run validation first and then add geometry,
 * resolution, text and output-setting checks that only matter on paper.
 *
 * Everything that cannot be measured in the browser says so. Image resolution
 * is computed from the stored pixel dimensions, so it is real; text overflow is
 * a conservative paragraph-count estimate, marked `estimated`, because the
 * final line breaks belong to the font engine at render time.
 */

import type {
  ImageFrameObject,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
  TextFrameObject,
} from "./model";
import { validatePublicationDocument } from "./validate";
import { bleedBox, safeBox, trimBox } from "./geometry";
import { frameBounds } from "./object-transform";
import { FONT_LIBRARY } from "../fonts";

export type PreflightSeverity = "error" | "warning" | "info";

export interface PreflightAsset {
  id: string;
  name?: string;
  width: number;
  height: number;
  mime?: string;
  storageId?: string;
}

export interface PreflightSettings {
  /** Target pixels per inch for placed photographs. */
  targetDpi: number;
  /** The profile asks for bleed. */
  requireBleed: boolean;
  cropMarks: boolean;
  /** Safety margin the printer asks for, in points. */
  safeMargin: number;
}

export interface PreflightFinding {
  id: string;
  code: string;
  severity: PreflightSeverity;
  /** Short headline, e.g. "Image below 150 ppi". */
  title: string;
  /** What is wrong and what it means for print. */
  detail: string;
  /** Where to look, so the panel can navigate to it. */
  pageId?: string;
  pageIndex?: number;
  objectId?: string;
  /** Suggested correction. */
  hint?: string;
  /** `measured` is a real reading; `estimated` is a heuristic. */
  confidence: "measured" | "estimated";
}

export interface PreflightReport {
  findings: PreflightFinding[];
  errors: number;
  warnings: number;
  infos: number;
  /** True when nothing would stop an export. */
  printable: boolean;
  checkedAt: number;
  settings: PreflightSettings;
}

export const DEFAULT_PREFLIGHT_SETTINGS: PreflightSettings = {
  targetDpi: 300,
  requireBleed: false,
  cropMarks: false,
  safeMargin: 8,
};

const POINTS_PER_INCH = 72;

function objectLabel(object: PublicationObject): string {
  return object.name?.trim() || object.kind.replace("-", " ");
}

function pageLabel(page: PublicationPage, index: number): string {
  return page.name?.trim() || `Page ${index + 1}`;
}

function within(rect: { x: number; y: number; width: number; height: number }, box: {
  x: number;
  y: number;
  width: number;
  height: number;
}, tolerance = 0.5): boolean {
  return (
    rect.x >= box.x - tolerance &&
    rect.y >= box.y - tolerance &&
    rect.x + rect.width <= box.x + box.width + tolerance &&
    rect.y + rect.height <= box.y + box.height + tolerance
  );
}

/** Scripts the current PDF fonts cannot encode (Arabic, Hebrew, Persian, Urdu…). */
const RTL_RANGE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function hasRtlText(text: string): boolean {
  return RTL_RANGE.test(text);
}

/** Effective placed resolution, measured from the stored pixel size. */
export function effectiveDpi(
  frameWidthPt: number,
  cropScale: number,
  assetWidthPx: number,
): number {
  if (!(frameWidthPt > 0) || !(assetWidthPx > 0)) return 0;
  const inches = frameWidthPt / POINTS_PER_INCH;
  return (assetWidthPx * Math.max(0.01, cropScale)) / inches;
}

export function runPreflight(
  document: PublicationDocument,
  assets: readonly PreflightAsset[],
  settings: PreflightSettings = DEFAULT_PREFLIGHT_SETTINGS,
): PreflightReport {
  const findings: PreflightFinding[] = [];
  const add = (finding: Omit<PreflightFinding, "id">) => {
    findings.push({ ...finding, id: `${finding.code}:${findings.length}` });
  };

  const byAsset = new Map(assets.map((asset) => [asset.id, asset]));
  const fontIds = new Set(FONT_LIBRARY.map((font) => font.id));

  /* ------------------------------------------------------------- document */

  for (const issue of validatePublicationDocument(document)) {
    const pageMatch = /^pages\[(\d+)\]/.exec(issue.path);
    const pageIndex = pageMatch ? Number(pageMatch[1]) : undefined;
    const page = pageIndex === undefined ? undefined : document.pages[pageIndex];
    add({
      code: issue.code,
      severity: issue.severity === "error" ? "error" : "warning",
      title: issue.severity === "error" ? "Document structure error" : "Document warning",
      detail: issue.message,
      pageId: page?.id,
      pageIndex,
      confidence: "measured",
      hint:
        issue.severity === "error"
          ? "Fix this before exporting; the PDF writer refuses an invalid document."
          : undefined,
    });
  }

  if (document.pages.length === 0) {
    add({
      code: "document/no-pages",
      severity: "error",
      title: "No pages",
      detail: "The publication has no pages, so there is nothing to print.",
      confidence: "measured",
      hint: "Add at least one page.",
    });
  }

  /* ---------------------------------------------------------------- pages */

  document.pages.forEach((page, index) => {
    const trim = trimBox(page.spec);
    const bleed = bleedBox(page.spec);
    const safe = safeBox(page.spec, page.side);

    if (!(page.spec.trim.width > 0) || !(page.spec.trim.height > 0)) {
      add({
        code: "page/invalid-size",
        severity: "error",
        title: "Invalid page size",
        detail: `${pageLabel(page, index)} has a zero or negative trim size.`,
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
        hint: "Set a positive width and height on the page.",
      });
    }
    if (!(page.spec.bleed >= 0) || !Number.isFinite(page.spec.bleed)) {
      add({
        code: "page/invalid-bleed",
        severity: "error",
        title: "Invalid bleed",
        detail: `${pageLabel(page, index)} has a negative or non-finite bleed value.`,
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
      });
    }
    const margins = page.spec.margins;
    const marginValues = [margins.top, margins.right, margins.bottom, margins.left];
    if (marginValues.some((value) => !Number.isFinite(value) || value < 0)) {
      add({
        code: "page/invalid-margins",
        severity: "error",
        title: "Invalid margins",
        detail: `${pageLabel(page, index)} has a negative or non-finite margin.`,
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
      });
    } else if (safe.width <= 0 || safe.height <= 0) {
      add({
        code: "page/margins-collapse",
        severity: "error",
        title: "Margins leave no safe area",
        detail: `${pageLabel(page, index)}'s margins consume the whole page.`,
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
        hint: "Reduce the margins so content has somewhere to sit.",
      });
    }
    if (settings.requireBleed && !(page.spec.bleed > 0)) {
      add({
        code: "page/no-bleed",
        severity: "error",
        title: "Profile needs bleed",
        detail: `${pageLabel(page, index)} has no bleed, but this profile prints with bleed.`,
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
        hint: "Give the page a bleed and extend artwork into it.",
      });
    }
    if (settings.cropMarks && !(page.spec.bleed > 0)) {
      add({
        code: "page/crop-marks-without-bleed",
        severity: "warning",
        title: "Crop marks without bleed",
        detail: "Crop marks were requested but the page has no bleed to trim into.",
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
      });
    }
    if (settings.safeMargin > 0 && (safe.width < settings.safeMargin || safe.height < settings.safeMargin)) {
      add({
        code: "page/safe-area-small",
        severity: "warning",
        title: "Safe area is very small",
        detail: `${pageLabel(page, index)} keeps less than ${Math.round(settings.safeMargin)} pt inside the trim.`,
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
      });
    }
    if (
      Math.abs(page.spec.trim.width - document.spec.trim.width) > 0.5 ||
      Math.abs(page.spec.trim.height - document.spec.trim.height) > 0.5
    ) {
      add({
        code: "page/mixed-size",
        severity: "info",
        title: "Page size differs from the document",
        detail: `${pageLabel(page, index)} is ${Math.round(page.spec.trim.width)} × ${Math.round(
          page.spec.trim.height,
        )} pt; the document default is ${Math.round(document.spec.trim.width)} × ${Math.round(
          document.spec.trim.height,
        )} pt.`,
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
      });
    }
    if (page.objects.length === 0 && !page.masterId) {
      add({
        code: "page/empty",
        severity: "info",
        title: "Empty page",
        detail: `${pageLabel(page, index)} has no objects, no background artwork and no master.`,
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
      });
    }

    /* ------------------------------------------------------------- objects */

    const layerIds = new Set(page.layers.map((layer) => layer.id));
    page.objects.forEach((object) => {
      const bounds = frameBounds(object.frame);
      if (!(object.frame.width > 0) || !(object.frame.height > 0)) {
        add({
          code: "object/invalid-size",
          severity: "error",
          title: "Object has no size",
          detail: `“${objectLabel(object)}” on ${pageLabel(page, index)} has a zero or negative size.`,
          pageId: page.id,
          pageIndex: index,
          objectId: object.id,
          confidence: "measured",
          hint: "Give the object a positive width and height.",
        });
      }
      if (!layerIds.has(object.layerId)) {
        add({
          code: "object/layer-missing",
          severity: "error",
          title: "Object layer is missing",
          detail: `“${objectLabel(object)}” names a layer that does not exist on ${pageLabel(page, index)}.`,
          pageId: page.id,
          pageIndex: index,
          objectId: object.id,
          confidence: "measured",
        });
      }
      if (page.masterId && !document.masters.some((master) => master.id === page.masterId)) {
        add({
          code: "page/master-missing",
          severity: "error",
          title: "Master is missing",
          detail: `${pageLabel(page, index)} uses a master that no longer exists.`,
          pageId: page.id,
          pageIndex: index,
          confidence: "measured",
        });
      }
      if (object.hidden) {
        add({
          code: "object/hidden",
          severity: "info",
          title: "Hidden object",
          detail: `“${objectLabel(object)}” on ${pageLabel(page, index)} is hidden and will not print.`,
          pageId: page.id,
          pageIndex: index,
          objectId: object.id,
          confidence: "measured",
        });
        return;
      }
      if (object.locked) {
        add({
          code: "object/locked",
          severity: "info",
          title: "Locked object",
          detail: `“${objectLabel(object)}” on ${pageLabel(page, index)} is locked; its position was not changed during this review.`,
          pageId: page.id,
          pageIndex: index,
          objectId: object.id,
          confidence: "measured",
        });
      }
      if (!within(bounds, bleed)) {
        add({
          code: "object/outside-bleed",
          severity: "warning",
          title: "Object outside the bleed",
          detail: `“${objectLabel(object)}” extends beyond the bleed edge of ${pageLabel(page, index)} and may be clipped by the printer.`,
          pageId: page.id,
          pageIndex: index,
          objectId: object.id,
          confidence: "measured",
          hint: "Move the object inside the bleed box or enlarge the bleed.",
        });
      } else if (!within(bounds, trim)) {
        add({
          code: "object/in-bleed",
          severity: "info",
          title: "Object crosses the trim",
          detail: `“${objectLabel(object)}” on ${pageLabel(page, index)} extends into the bleed; that is intentional only if it is meant to be trimmed.`,
          pageId: page.id,
          pageIndex: index,
          objectId: object.id,
          confidence: "measured",
        });
      }

      if (object.kind === "image-frame") {
        const image = object as ImageFrameObject;
        const crop = image.crop;
        if (
          !(crop.scale > 0) ||
          !Number.isFinite(crop.scale) ||
          !Number.isFinite(crop.offsetX) ||
          !Number.isFinite(crop.offsetY)
        ) {
          add({
            code: "image/invalid-crop",
            severity: "error",
            title: "Invalid crop",
            detail: `“${objectLabel(object)}” has crop values that cannot be rendered.`,
            pageId: page.id,
            pageIndex: index,
            objectId: object.id,
            confidence: "measured",
            hint: "Reset the crop and set it again.",
          });
        }
        if (image.fit === "stretch") {
          add({
            code: "image/stretched",
            severity: "warning",
            title: "Image may be distorted",
            detail: `“${objectLabel(object)}” uses “stretch”, which changes the image's proportions.`,
            pageId: page.id,
            pageIndex: index,
            objectId: object.id,
            confidence: "measured",
            hint: "Use fill or fit, then crop.",
          });
        }
        if (!image.assetId) {
          add({
            code: "image/empty-frame",
            severity: "info",
            title: "Empty image frame",
            detail: `“${objectLabel(object)}” has no image placed yet.`,
            pageId: page.id,
            pageIndex: index,
            objectId: object.id,
            confidence: "measured",
          });
        } else {
          const asset = byAsset.get(image.assetId);
          if (!asset) {
            // Validation already reports the broken reference; a second,
            // differently worded error would only add noise.
          } else {
            if (!asset.storageId) {
              add({
                code: "image/missing-file",
                severity: "error",
                title: "Image file unavailable",
                detail: `“${asset.name ?? objectLabel(object)}” has no storage file, so it cannot be embedded.`,
                pageId: page.id,
                pageIndex: index,
                objectId: object.id,
                confidence: "measured",
                hint: "Re-upload the image.",
              });
            }
            if (!(asset.width > 0) || !(asset.height > 0)) {
              add({
                code: "image/unknown-dimensions",
                severity: "warning",
                title: "Image dimensions unknown",
                detail: "Resolution cannot be verified for this asset.",
                pageId: page.id,
                pageIndex: index,
                objectId: object.id,
                confidence: "measured",
              });
            } else {
              const dpi = effectiveDpi(frameBounds(image.frame).width, crop.scale, asset.width);
              if (dpi > 0 && dpi < 120) {
                add({
                  code: "image/low-resolution",
                  severity: "warning",
                  title: "Low effective resolution",
                  detail: `“${asset.name ?? objectLabel(object)}” prints at about ${Math.round(
                    dpi,
                  )} ppi on ${pageLabel(page, index)}.`,
                  pageId: page.id,
                  pageIndex: index,
                  objectId: object.id,
                  confidence: "measured",
                  hint: `Use a larger original or reduce the frame; the target is ${settings.targetDpi} ppi.`,
                });
              } else if (dpi > 0 && dpi < settings.targetDpi) {
                add({
                  code: "image/below-target",
                  severity: "info",
                  title: "Below target resolution",
                  detail: `“${asset.name ?? objectLabel(object)}” prints at about ${Math.round(
                    dpi,
                  )} ppi; the profile targets ${settings.targetDpi} ppi.`,
                  pageId: page.id,
                  pageIndex: index,
                  objectId: object.id,
                  confidence: "measured",
                });
              }
              if (asset.width > 12000 || asset.height > 12000) {
                add({
                  code: "image/very-large",
                  severity: "warning",
                  title: "Very large image",
                  detail: `${asset.width} × ${asset.height} px is larger than many print pipelines accept.`,
                  pageId: page.id,
                  pageIndex: index,
                  objectId: object.id,
                  confidence: "measured",
                });
              }
            }
          }
        }
      }

      if (object.kind === "text-frame") {
        const frame = object as TextFrameObject;
        const story = frame.storyId
          ? document.stories.find((entry) => entry.id === frame.storyId)
          : undefined;
        if (frame.storyId && !story) {
          add({
            code: "text/story-missing",
            severity: "error",
            title: "Text story is missing",
            detail: `“${objectLabel(object)}” points at a story that no longer exists.`,
            pageId: page.id,
            pageIndex: index,
            objectId: object.id,
            confidence: "measured",
          });
        }
        if (story) {
          const explicitLines = story.paragraphs.reduce(
            (sum, paragraph) =>
              sum +
              paragraph.runs.reduce(
                (lines, run) => lines + Math.max(1, run.text.split("\n").length),
                0,
              ),
            0,
          );
          const lineHeight =
            story.paragraphs[0]?.format?.leading ??
            document.styles.paragraph[0]?.leading ??
            12;
          const capacity = Math.max(
            1,
            Math.floor((frame.frame.height - frame.inset.top - frame.inset.bottom) / lineHeight),
          );
          if (
            frame.overflow === "clip" &&
            explicitLines > capacity &&
            explicitLines <= 400
          ) {
            add({
              code: "text/possible-overflow",
              severity: "warning",
              title: "Text may overflow",
              detail: `“${objectLabel(object)}” holds at least ${explicitLines} lines in a box that fits about ${capacity}. Line breaks are estimated, so check the frame on the page.`,
              pageId: page.id,
              pageIndex: index,
              objectId: object.id,
              confidence: "estimated",
              hint: "Link the frame to a second frame, enlarge it, or choose “shrink”.",
            });
          }
          for (const paragraph of story.paragraphs) {
            const direction = paragraph.format?.direction;
            const rtlRuns = paragraph.runs.filter((run) => hasRtlText(run.text));
            const mixed = rtlRuns.length > 0 && rtlRuns.length < paragraph.runs.length;
            if (direction === "rtl" || rtlRuns.length > 0) {
              add({
                code: "text/rtl",
                severity: "info",
                title: mixed ? "Mixed-direction text" : "Right-to-left text",
                detail: mixed
                  ? `“${objectLabel(object)}” mixes Latin and right-to-left runs. The exporter keeps Latin text selectable and leaves runs the built-in fonts cannot encode out of the PDF rather than substituting a face.`
                  : `“${objectLabel(object)}” contains right-to-left text. The exporter's built-in fonts cannot encode it, so those runs are reported after export rather than silently replaced.`,
                pageId: page.id,
                pageIndex: index,
                objectId: object.id,
                confidence: "measured",
              });
            }
            for (const run of paragraph.runs) {
              const fontId = run.format?.fontId ?? paragraph.format?.fontId;
              if (fontId && !fontIds.has(fontId)) {
                add({
                  code: "text/font-unknown",
                  severity: "warning",
                  title: "Font is not in the library",
                  detail: `“${objectLabel(object)}” uses font “${fontId}”, which this build cannot resolve, so the printed face may differ.`,
                  pageId: page.id,
                  pageIndex: index,
                  objectId: object.id,
                  confidence: "measured",
                });
              }
            }
          }
        }
      }
    });

    /* --------------------------------------------------------------- master */

    const master = page.masterId
      ? document.masters.find((entry) => entry.id === page.masterId)
      : undefined;
    if (master?.background.assetId && !byAsset.has(master.background.assetId)) {
      add({
        code: "master/background-missing",
        severity: "error",
        title: "Master background file is missing",
        detail: `The master used by ${pageLabel(page, index)} names a background image that no longer exists.`,
        pageId: page.id,
        pageIndex: index,
        confidence: "measured",
      });
    }
  });

  /* --------------------------------------------------------- output limits */

  add({
    code: "output/rgb-only",
    severity: "info",
    title: "RGB output",
    detail:
      "The exporter writes an RGB PDF with no colour management, so CMYK conversion and PDF/X compliance are not claimed.",
    confidence: "measured",
  });
  add({
    code: "output/fonts",
    severity: "info",
    title: "Font embedding depends on the encoding",
    detail:
      "Built-in PDF fonts cover Latin text. Arabic and other non-Latin runs cannot be embedded with the current library, so they are reported here and not silently substituted.",
    confidence: "measured",
  });

  const errors = findings.filter((finding) => finding.severity === "error").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  const infos = findings.filter((finding) => finding.severity === "info").length;

  return {
    findings,
    errors,
    warnings,
    infos,
    printable: errors === 0,
    checkedAt: Date.now(),
    settings,
  };
}

/** Findings for one page, for the page inspector. */
export function findingsForPage(
  report: PreflightReport,
  pageId: string,
): PreflightFinding[] {
  return report.findings.filter((finding) => finding.pageId === pageId);
}

/** Object-level findings, used to badge the selection. */
export function findingsForObject(
  report: PreflightReport,
  objectId: string,
): PreflightFinding[] {
  return report.findings.filter((finding) => finding.objectId === objectId);
}
