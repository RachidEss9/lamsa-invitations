/**
 * Asset validation and browser-side image derivatives.
 *
 * The original upload is the print master and is never replaced. Thumbnails
 * and preview proxies are generated in the browser (canvas), so no paid image
 * service is involved and no server CPU is spent decoding photos. If a browser
 * cannot decode a file, the workflow reports the limitation and keeps the
 * original usable instead of inventing a derivative.
 */

export const THUMBNAIL_TARGET_PX = 320;
export const PROXY_TARGET_PX = 1800;
export const DERIVATIVE_QUALITY = 0.82;
export const MAX_ASSET_BYTES = 50 * 1024 * 1024;

/** Formats a print studio can keep as originals. */
export const ALLOWED_ASSET_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/tiff",
] as const;

export type AllowedAssetMime = (typeof ALLOWED_ASSET_MIME_TYPES)[number];

export interface AssetFileFacts {
  mimeType: string;
  fileSize: number;
}

export interface AssetFileIssue {
  code: "asset/mime" | "asset/size" | "asset/empty";
  message: string;
}

export function isAllowedAssetMime(value: unknown): value is AllowedAssetMime {
  return (
    typeof value === "string" &&
    (ALLOWED_ASSET_MIME_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Server and client share this check: a rejected file never gets a storage id
 * or a database row, and the same reasons are shown before upload starts.
 */
export function validateAssetFile(facts: AssetFileFacts): AssetFileIssue[] {
  const issues: AssetFileIssue[] = [];
  if (!isAllowedAssetMime(facts.mimeType)) {
    issues.push({
      code: "asset/mime",
      message: "Use a JPEG, PNG, WebP, AVIF or TIFF image.",
    });
  }
  if (!Number.isFinite(facts.fileSize) || facts.fileSize <= 0) {
    issues.push({ code: "asset/empty", message: "The file is empty." });
  } else if (facts.fileSize > MAX_ASSET_BYTES) {
    issues.push({
      code: "asset/size",
      message: `Images must be under ${Math.round(MAX_ASSET_BYTES / (1024 * 1024))} MB.`,
    });
  }
  return issues;
}

export function assertValidAssetFile(facts: AssetFileFacts): void {
  const issues = validateAssetFile(facts);
  if (issues.length > 0) {
    throw new RangeError(issues.map((issue) => issue.message).join(" "));
  }
}

export interface DerivativeSize {
  width: number;
  height: number;
}

/**
 * Fits an image inside a square target without upscaling. A 120 px image gets
 * no 320 px thumbnail: enlarging it would waste bytes and soften print review.
 */
export function fitWithin(
  width: number,
  height: number,
  target: number,
): DerivativeSize | null {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(target) ||
    target <= 0
  ) {
    return null;
  }
  const longest = Math.max(width, height);
  if (longest <= target) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = target / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface DerivativePlan {
  thumbnail: DerivativeSize;
  proxy: DerivativeSize;
  /** True when the source is smaller than the proxy target. */
  proxyIsOriginalSize: boolean;
}

export function planDerivatives(
  width: number,
  height: number,
): DerivativePlan | null {
  const thumbnail = fitWithin(width, height, THUMBNAIL_TARGET_PX);
  const proxy = fitWithin(width, height, PROXY_TARGET_PX);
  if (!thumbnail || !proxy) return null;
  return {
    thumbnail,
    proxy,
    proxyIsOriginalSize: Math.max(width, height) <= PROXY_TARGET_PX,
  };
}

/**
 * TIFF and AVIF are valid originals but not every canvas can decode them.
 * Rather than failing the upload, derivatives are skipped with a warning.
 */
export function derivativeSupport(mimeType: string): "supported" | "unsupported" {
  return mimeType === "image/tiff" || mimeType === "image/avif"
    ? "unsupported"
    : "supported";
}

export interface ImageDerivatives {
  width: number;
  height: number;
  /** Null when the browser could not produce one; the original still exists. */
  thumbnail: Blob | null;
  proxy: Blob | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
  proxyWidth: number | null;
  proxyHeight: number | null;
  /** Human-readable reasons a derivative is missing. */
  warnings: string[];
}

export function supportsClientDerivatives(): boolean {
  return (
    typeof globalThis.createImageBitmap === "function" &&
    (typeof globalThis.OffscreenCanvas === "function" ||
      typeof document !== "undefined")
  );
}

async function canvasToBlob(
  bitmap: ImageBitmap,
  size: DerivativeSize,
): Promise<Blob | null> {
  const draw = (context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, size.width, size.height);
  };

  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(size.width, size.height);
    const context = canvas.getContext("2d");
    if (!context) return null;
    draw(context);
    try {
      return await canvas.convertToBlob({
        type: "image/webp",
        quality: DERIVATIVE_QUALITY,
      });
    } catch {
      try {
        return await canvas.convertToBlob({
          type: "image/jpeg",
          quality: DERIVATIVE_QUALITY,
        });
      } catch {
        return null;
      }
    }
  }

  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  draw(context);
  return await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/webp", DERIVATIVE_QUALITY);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Produces preview derivatives without touching the original blob. Returns
 * warnings instead of throwing for decode/encode failures, because a missing
 * preview must never cost the photographer their upload.
 */
export async function createImageDerivatives(
  source: Blob,
  options: { maxWidth?: number; maxHeight?: number } = {},
): Promise<ImageDerivatives> {
  const warnings: string[] = [];
  const empty: ImageDerivatives = {
    width: 0,
    height: 0,
    thumbnail: null,
    proxy: null,
    thumbnailWidth: null,
    thumbnailHeight: null,
    proxyWidth: null,
    proxyHeight: null,
    warnings,
  };

  if (typeof globalThis.createImageBitmap !== "function") {
    warnings.push("This browser cannot decode images for previews.");
    return empty;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await globalThis.createImageBitmap(source);
  } catch {
    warnings.push("The image could not be decoded, so the original is kept.");
    return empty;
  }

  try {
    const width = options.maxWidth ?? bitmap.width;
    const height = options.maxHeight ?? bitmap.height;
    const plan = planDerivatives(width, height);
    if (!plan) {
      warnings.push("The image has no usable dimensions.");
      return { ...empty, width: bitmap.width, height: bitmap.height };
    }

    const thumbnailBlob = await canvasToBlob(bitmap, plan.thumbnail);
    if (!thumbnailBlob) warnings.push("A thumbnail could not be generated.");
    const proxyBlob = plan.proxyIsOriginalSize
      ? null
      : await canvasToBlob(bitmap, plan.proxy);
    if (!plan.proxyIsOriginalSize && !proxyBlob) {
      warnings.push("A preview proxy could not be generated.");
    }

    return {
      width: bitmap.width,
      height: bitmap.height,
      thumbnail: thumbnailBlob,
      proxy: proxyBlob,
      thumbnailWidth: thumbnailBlob ? plan.thumbnail.width : null,
      thumbnailHeight: thumbnailBlob ? plan.thumbnail.height : null,
      proxyWidth: proxyBlob ? plan.proxy.width : null,
      proxyHeight: proxyBlob ? plan.proxy.height : null,
      warnings,
    };
  } finally {
    bitmap.close();
  }
}
