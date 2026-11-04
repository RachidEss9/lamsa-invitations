/**
 * Stable identifiers for publishing documents.
 *
 * Every page, spread, object, layer, asset, story and master carries an id
 * that is created once and then preserved by every normalisation pass, so a
 * saved document can be reopened and edited without reference churn. Ids are
 * opaque strings with a human-readable prefix: `page_9f2a1c04d5e6`.
 *
 * The factory accepts an id source so tests (and deterministic fixtures) can
 * supply a counter instead of randomness.
 */

export const ID_PREFIXES = {
  document: "pub",
  page: "page",
  spread: "spread",
  object: "object",
  layer: "layer",
  asset: "asset",
  story: "story",
  master: "master",
  style: "style",
  guide: "guide",
  paragraph: "paragraph",
} as const;

export type IdPrefix = keyof typeof ID_PREFIXES;

/** Produces the id for one entity. Injected wherever determinism matters. */
export type IdFactory = (prefix: IdPrefix) => string;

const ID_BODY = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$/;
const ALL_PREFIXES = Object.values(ID_PREFIXES).join("|");
const ID_PATTERN = new RegExp(`^(${ALL_PREFIXES})_[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$`);

function randomSuffix(): string {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

/** A fresh id: `page_9f2a1c04d5e6`. */
export function createId(prefix: IdPrefix): string {
  return `${ID_PREFIXES[prefix]}_${randomSuffix()}`;
}

/** The default id source: random, stable once created. */
export const defaultIds: IdFactory = (prefix) => createId(prefix);

/**
 * A counter-backed id source. `createSequentialIds()` yields `page_1`,
 * `page_2`, … which keeps fixtures readable and assertions exact.
 */
export function createSequentialIds(startAt = 1): IdFactory {
  const counters = new Map<IdPrefix, number>();
  return (prefix) => {
    const next = (counters.get(prefix) ?? startAt - 1) + 1;
    counters.set(prefix, next);
    return `${ID_PREFIXES[prefix]}_${next}`;
  };
}

/** Whether a value is a well-formed publishing id (any prefix). */
export function isStableId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/** Whether a value is a well-formed id for one specific entity kind. */
export function isIdOfPrefix(value: unknown, prefix: IdPrefix): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(`${ID_PREFIXES[prefix]}_`) &&
    isStableId(value)
  );
}

/**
 * Keeps a saved id when it is safe to do so, and mints one otherwise.
 *
 * Normalisation must never rewrite an id that a story, spread or layered
 * master already points at, but it also must not accept an id that could
 * collide with markup or forged data.
 */
export function normalizeId(
  value: unknown,
  prefix: IdPrefix,
  ids: IdFactory = defaultIds,
): string {
  if (typeof value === "string" && ID_BODY.test(value)) return value;
  return ids(prefix);
}
