import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

interface UnknownRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

/**
 * Walks a stored design document and collects every storage id it references:
 * page element images, reveal cover images, and opening cover images. The
 * studio and the public invitation both render from these resolved URLs, so
 * guests never need storage access beyond what the design already exposes.
 */
export function collectDesignStorageIds(design: unknown): Id<"_storage">[] {
  const ids = new Set<Id<"_storage">>();

  const visit = (value: unknown, depth: number) => {
    if (depth > 8 || value == null) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (!isRecord(value)) return;
    for (const [key, entry] of Object.entries(value)) {
      if (
        (key === "imageStorageId" || key === "coverStorageId") &&
        typeof entry === "string"
      ) {
        ids.add(entry as Id<"_storage">);
      } else {
        visit(entry, depth + 1);
      }
    }
  };

  visit(design, 0);
  return [...ids];
}

export async function resolveDesignUrls(
  ctx: QueryCtx,
  design: unknown,
): Promise<Record<string, string>> {
  const ids = collectDesignStorageIds(design);
  const urls: Record<string, string> = {};
  await Promise.all(
    ids.map(async (storageId) => {
      const url = await ctx.storage.getUrl(storageId);
      if (url) urls[storageId] = url;
    }),
  );
  return urls;
}
