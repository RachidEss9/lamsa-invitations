import {
  cleanRevealLinks,
  type DesignDocument,
  type DesignElement,
} from "./design";

/**
 * Pure editing operations shared by the studio and its tests.
 *
 * Deletion is deliberately conservative: locked layers are never destroyed by a
 * bulk delete, and a cover whose target disappears loses its reveal so the
 * canvas can never hide content behind a missing layer.
 */

export interface DeleteOutcome {
  /** The layer list after the operation (unchanged when nothing was removed). */
  elements: DesignElement[];
  /** Ids that were actually removed. */
  removed: string[];
  /** Ids that were selected but protected by their lock. */
  blocked: string[];
  /** Covers whose reveal was cleaned because their target was deleted. */
  clearedCovers: number;
}

/** A layer can be deleted when it exists and is not locked. */
export function isDeletable(element: DesignElement): boolean {
  return !element.locked;
}

/** The subset of `ids` that may be deleted right now. */
export function deletableIds(
  elements: DesignElement[],
  ids: string[],
): string[] {
  const wanted = new Set(ids);
  return elements
    .filter((element) => wanted.has(element.id) && isDeletable(element))
    .map((element) => element.id);
}

/** True when at least one selected layer is deletable. */
export function hasDeletableSelection(
  elements: DesignElement[],
  ids: string[],
): boolean {
  return deletableIds(elements, ids).length > 0;
}

export function removeElements(
  elements: DesignElement[],
  ids: string[],
): DeleteOutcome {
  const removed = deletableIds(elements, ids);
  if (removed.length === 0) {
    const wanted = new Set(ids);
    return {
      elements,
      removed: [],
      blocked: elements
        .filter((element) => wanted.has(element.id))
        .map((element) => element.id),
      clearedCovers: 0,
    };
  }
  const removedSet = new Set(removed);
  const kept = elements.filter((element) => !removedSet.has(element.id));
  const coversBefore = kept.filter((element) => element.reveal).length;
  const cleaned = cleanRevealLinks(kept);
  const coversAfter = cleaned.filter((element) => element.reveal).length;
  const wanted = new Set(ids);
  return {
    elements: cleaned,
    removed,
    blocked: elements
      .filter((element) => wanted.has(element.id) && element.locked)
      .map((element) => element.id),
    clearedCovers: Math.max(0, coversBefore - coversAfter),
  };
}

export function selectionAfterDelete(
  selectedIds: string[],
  outcome: DeleteOutcome,
): string[] {
  if (outcome.removed.length === 0) return selectedIds;
  return selectedIds.filter((id) => !outcome.removed.includes(id));
}

/* -------------------------------------------------------------------------- */
/* Undo / redo                                                                */
/* -------------------------------------------------------------------------- */

/** How many snapshots the studio keeps. Mirrors the previous ref-based limit. */
export const HISTORY_LIMIT = 60;

export interface HistoryStacks {
  past: DesignDocument[];
  future: DesignDocument[];
}

export function pushHistory(
  past: DesignDocument[],
  snapshot: DesignDocument,
  limit = HISTORY_LIMIT,
): DesignDocument[] {
  return [...past.slice(-(limit - 1)), snapshot];
}

/** Pop the most recent snapshot into the present, pushing the old present. */
export function undoHistory(
  stacks: HistoryStacks,
  current: DesignDocument,
): { snapshot: DesignDocument; stacks: HistoryStacks } | null {
  const snapshot = stacks.past[stacks.past.length - 1];
  if (!snapshot) return null;
  return {
    snapshot,
    stacks: {
      past: stacks.past.slice(0, -1),
      future: [...stacks.future, current],
    },
  };
}

export function redoHistory(
  stacks: HistoryStacks,
  current: DesignDocument,
): { snapshot: DesignDocument; stacks: HistoryStacks } | null {
  const snapshot = stacks.future[stacks.future.length - 1];
  if (!snapshot) return null;
  return {
    snapshot,
    stacks: {
      past: [...stacks.past, current],
      future: stacks.future.slice(0, -1),
    },
  };
}
