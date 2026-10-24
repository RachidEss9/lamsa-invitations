/**
 * Favourites for the studio library.
 *
 * Built-in templates, styles, fonts, and assets have no database record of
 * their own, so a favourite is a local, per-browser pin — the same way a
 * designer stars a type specimen. Saved library records use their Convex id,
 * so a pin survives the item being renamed.
 */

export type FavouriteKind =
  | "template"
  | "style"
  | "font"
  | "asset"
  | "opening"
  | "saved"
  | "palette";

export const FAVOURITES_KEY = "lamsa.library.favourites.v1";
const MAX_FAVOURITES = 400;

export function favouriteKey(kind: FavouriteKind, id: string): string {
  return `${kind}:${id}`;
}

export function isFavourite(keys: string[], key: string): boolean {
  return keys.includes(key);
}

/** Adds the key to the front, or removes it. Order is most-recent first. */
export function toggleFavouriteKey(keys: string[], key: string): string[] {
  if (!key) return keys;
  const next = keys.includes(key)
    ? keys.filter((entry) => entry !== key)
    : [key, ...keys];
  return next.slice(0, MAX_FAVOURITES);
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Reads pins defensively: a corrupted value simply means no favourites. */
export function readFavourites(store: Storage | null = storage()): string[] {
  if (!store) return [];
  try {
    const raw = store.getItem(FAVOURITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .slice(0, MAX_FAVOURITES);
  } catch {
    return [];
  }
}

export function writeFavourites(
  keys: string[],
  store: Storage | null = storage(),
): string[] {
  const next = keys.slice(0, MAX_FAVOURITES);
  if (store) {
    try {
      store.setItem(FAVOURITES_KEY, JSON.stringify(next));
    } catch {
      // A blocked quota only loses the pins, never a design.
    }
  }
  return next;
}

export function kindOfFavourite(key: string): string {
  return key.split(":")[0] ?? "";
}
