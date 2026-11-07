/**
 * Local recovery drafts for the publishing editor.
 *
 * Autosave covers the server; this covers the tab. Before a page-chip trim or
 * a crashed browser loses an in-flight edit, the editor keeps the dirty pages
 * and stories in localStorage, scoped per publication. The draft is written
 * only for *dirty* records, is deflated to the model itself, and is deleted
 * as soon as the records it replaced reach the server — a draft that stays
 * behind eventually lies, so every read validates its age range loosely and
 * the editor decides visually whether to offer it.
 *
 * Same contract as the other platform stores: storage is injectable, a
 * corrupted or incompatible draft simply reads as absent.
 */

import type { MasterPage, PublicationPage, Story } from "./model";

export const RECOVERY_PREFIX = "lamsa.publishing.recovery.v1";

export interface RecoveryDraft {
  publicationId: string;
  savedAt: number;
  pages: PublicationPage[];
  stories: Story[];
  /** Unsaved master edits, when the draft was written by a Phase 3D build. */
  masters?: MasterPage[];
}

const MAX_PAGES = 128;
const MAX_STORIES = 128;
const MAX_MASTERS = 64;
const MAX_DRAFT_BYTES = 1_500_000; // roughly 1.5 MB of model JSON

function keyFor(publicationId: string): string {
  return `${RECOVERY_PREFIX}:${publicationId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Minimal shape check: the editor applies a draft only if it looks like data. */
function parsePages(value: unknown): PublicationPage[] | null {
  if (!Array.isArray(value)) return null;
  const pages: PublicationPage[] = [];
  for (const raw of value) {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      !raw.id ||
      typeof raw.version !== "number" ||
      !Array.isArray(raw.layers) ||
      !Array.isArray(raw.objects) ||
      !isRecord(raw.spec)
    ) {
      return null;
    }
    pages.push(raw as unknown as PublicationPage);
  }
  return pages;
}

function parseStories(value: unknown): Story[] | null {
  if (!Array.isArray(value)) return null;
  const stories: Story[] = [];
  for (const raw of value) {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      !raw.id ||
      typeof raw.version !== "number" ||
      !Array.isArray(raw.paragraphs) ||
      !Array.isArray(raw.frames)
    ) {
      return null;
    }
    stories.push(raw as unknown as Story);
  }
  return stories;
}

/** Masters are optional in a draft: an older draft simply has none. */
function parseMasters(value: unknown): MasterPage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const masters: MasterPage[] = [];
  for (const raw of value) {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      !raw.id ||
      typeof raw.version !== "number" ||
      !Array.isArray(raw.layers) ||
      !Array.isArray(raw.objects)
    ) {
      return null;
    }
    masters.push(raw as unknown as MasterPage);
  }
  return masters;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function recoveryKey(publicationId: string): string {
  return keyFor(publicationId);
}

/**
 * Writes a recovery draft. Returns whether a draft is actually stored — an
 * oversized document or a locked-down storage yields `false` without throwing.
 */
export function saveRecoveryDraft(
  publicationId: string,
  draft: { pages: PublicationPage[]; stories: Story[]; masters?: MasterPage[] },
  store: Storage | null = storage(),
): boolean {
  if (!store || !publicationId) return false;
  const masters = (draft.masters ?? []).slice(0, MAX_MASTERS);
  const payload: RecoveryDraft = {
    publicationId,
    savedAt: Date.now(),
    pages: draft.pages.slice(0, MAX_PAGES),
    stories: draft.stories.slice(0, MAX_STORIES),
    ...(masters.length > 0 ? { masters } : {}),
  };
  if (
    payload.pages.length === 0 &&
    payload.stories.length === 0 &&
    masters.length === 0
  ) {
    clearRecoveryDraft(publicationId, store);
    return true;
  }
  try {
    const raw = JSON.stringify(payload);
    if (raw.length > MAX_DRAFT_BYTES) return false;
    store.setItem(keyFor(publicationId), raw);
    return true;
  } catch {
    return false;
  }
}

/** Reads the draft defensively; anything unusable is simply absent. */
export function readRecoveryDraft(
  publicationId: string,
  store: Storage | null = storage(),
): RecoveryDraft | null {
  if (!store || !publicationId) return null;
  try {
    const raw = store.getItem(keyFor(publicationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecoveryDraft> | null;
    if (!parsed || parsed.publicationId !== publicationId) return null;
    const pages = parsePages(parsed.pages);
    const stories = parseStories(parsed.stories);
    const masters = parseMasters(parsed.masters);
    if (
      !pages ||
      !stories ||
      !masters ||
      parsed.pages === undefined ||
      parsed.stories === undefined
    ) {
      return null;
    }
    if (typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) {
      return null;
    }
    return {
      publicationId,
      savedAt: parsed.savedAt,
      pages: pages.slice(0, MAX_PAGES),
      stories: stories.slice(0, MAX_STORIES),
      ...(masters.length > 0 ? { masters: masters.slice(0, MAX_MASTERS) } : {}),
    };
  } catch {
    return null;
  }
}

/** True when the draft might still hold work the server has not stored. */
export function hasRecoveryDraft(
  publicationId: string,
  store: Storage | null = storage(),
): boolean {
  return readRecoveryDraft(publicationId, store) !== null;
}

export function clearRecoveryDraft(
  publicationId: string,
  store: Storage | null = storage(),
): void {
  if (!store || !publicationId) return;
  try {
    store.removeItem(keyFor(publicationId));
  } catch {
    // A locked store also loses drafts; nothing to do about that here.
  }
}
