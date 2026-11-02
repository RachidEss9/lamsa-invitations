/**
 * The one filter every library tab runs: a category/group restriction, the
 * favourite star, and a text search over the item's own words. Each workspace
 * supplies its own catalogue and its own words, so Print Lab, Shape Maker and
 * Press browse exactly the way Digital Experiences does.
 */
export interface LibraryFilter<T> {
  /** The search box. Trimmed and lower-cased internally. */
  query: string;
  /** Category, group or script restriction. Return false to hide the item. */
  matches?: (item: T) => boolean;
  /** The star state, only consulted when favouritesOnly is on. */
  isFavourite?: (item: T) => boolean;
  favouritesOnly?: boolean;
  /** The words the search box should match. */
  text: (item: T) => string[];
}

export function filterLibrary<T>(
  items: readonly T[],
  {
    query,
    matches,
    isFavourite,
    favouritesOnly = false,
    text,
  }: LibraryFilter<T>,
): T[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (matches && !matches(item)) return false;
    if (favouritesOnly && !(isFavourite?.(item) ?? false)) return false;
    if (!needle) return true;
    return text(item).some((word) => word.toLowerCase().includes(needle));
  });
}