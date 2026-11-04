import { describe, expect, it } from "vitest";
import {
  ALLOWED_ASSET_MIME_TYPES,
  MAX_ASSET_BYTES,
  PROXY_TARGET_PX,
  THUMBNAIL_TARGET_PX,
  assertValidAssetFile,
  createImageDerivatives,
  derivativeSupport,
  fitWithin,
  planDerivatives,
  supportsClientDerivatives,
  validateAssetFile,
} from "./image-derivatives";

describe("asset file validation", () => {
  it("accepts every supported print format", () => {
    for (const mimeType of ALLOWED_ASSET_MIME_TYPES) {
      expect(validateAssetFile({ mimeType, fileSize: 1024 })).toEqual([]);
    }
  });

  it("rejects non-image and script formats", () => {
    expect(validateAssetFile({ mimeType: "application/pdf", fileSize: 100 })).toEqual([
      { code: "asset/mime", message: "Use a JPEG, PNG, WebP, AVIF or TIFF image." },
    ]);
    expect(validateAssetFile({ mimeType: "text/html", fileSize: 100 }).length).toBe(1);
  });

  it("rejects empty and oversized files", () => {
    expect(validateAssetFile({ mimeType: "image/png", fileSize: 0 })[0]!.code).toBe(
      "asset/empty",
    );
    expect(
      validateAssetFile({ mimeType: "image/png", fileSize: MAX_ASSET_BYTES + 1 })[0]!
        .code,
    ).toBe("asset/size");
    expect(
      validateAssetFile({ mimeType: "image/png", fileSize: MAX_ASSET_BYTES }),
    ).toEqual([]);
  });

  it("throws the same reasons from the assert helper", () => {
    expect(() =>
      assertValidAssetFile({ mimeType: "image/gif", fileSize: 10 }),
    ).toThrow(/JPEG, PNG/);
    expect(() =>
      assertValidAssetFile({ mimeType: "image/jpeg", fileSize: 10 }),
    ).not.toThrow();
  });
});

describe("derivative dimensions", () => {
  it("fits the longest edge inside the target", () => {
    expect(fitWithin(4000, 3000, 320)).toEqual({ width: 320, height: 240 });
    expect(fitWithin(3000, 4000, 320)).toEqual({ width: 240, height: 320 });
  });

  it("never upscales a small image", () => {
    expect(fitWithin(120, 80, 320)).toEqual({ width: 120, height: 80 });
    expect(fitWithin(1800, 1200, PROXY_TARGET_PX)?.width).toBe(1800);
    expect(planDerivatives(800, 600)?.proxyIsOriginalSize).toBe(true);
  });

  it("rejects unusable dimensions", () => {
    expect(fitWithin(0, 100, 320)).toBeNull();
    expect(fitWithin(100, Number.NaN, 320)).toBeNull();
    expect(planDerivatives(-1, 100)).toBeNull();
  });

  it("keeps targets within the brief range", () => {
    expect(THUMBNAIL_TARGET_PX).toBe(320);
    expect(PROXY_TARGET_PX).toBeGreaterThanOrEqual(1600);
    expect(PROXY_TARGET_PX).toBeLessThanOrEqual(2000);
    const plan = planDerivatives(6000, 4000)!;
    expect(plan.thumbnail.width).toBe(320);
    expect(plan.proxy.width).toBe(PROXY_TARGET_PX);
    expect(plan.proxy.height).toBe(Math.round((4000 * PROXY_TARGET_PX) / 6000));
  });

  it("reports formats a canvas may not decode", () => {
    expect(derivativeSupport("image/jpeg")).toBe("supported");
    expect(derivativeSupport("image/tiff")).toBe("unsupported");
    expect(derivativeSupport("image/avif")).toBe("unsupported");
  });
});

describe("browser workflow", () => {
  it("reports that Node cannot generate derivatives instead of pretending", async () => {
    expect(supportsClientDerivatives()).toBe(false);
    const result = await createImageDerivatives(new Blob(["not-an-image"]));
    expect(result.thumbnail).toBeNull();
    expect(result.proxy).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
