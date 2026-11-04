import type { DesignElement } from "@/lib/design";

/**
 * Layer visibility.
 *
 * `hidden` has always been part of the design document (it predates this
 * work and is already normalised, saved and re-read), so visibility needs no
 * schema change. What it needs is one rule applied everywhere: a hidden layer
 * stays in the document, keeps its geometry and style, keeps its row in the
 * Layers panel, and is simply not drawn.
 *
 * Groups are edited as one object everywhere else in the studio — a click on a
 * member selects the whole group, dragging moves it, locking locks it — so
 * visibility follows the same rule. Toggling any member sets the whole group,
 * which is why a group can never end up half visible by accident. Elements
 * outside the group are never touched.
 */

/** The ids a visibility change really applies to: the targets plus their groups. */
export function visibilityScope(
  elements: DesignElement[],
  ids: string[],
): Set<string> {
  const scope = new Set(ids);
  const groups = new Set<string>();
  for (const element of elements) {
    if (scope.has(element.id) && element.groupId) groups.add(element.groupId);
  }
  if (groups.size === 0) return scope;
  for (const element of elements) {
    if (element.groupId && groups.has(element.groupId)) scope.add(element.id);
  }
  return scope;
}

/**
 * Sets visibility for the given layers (and their groups). Returns the same
 * array when nothing changed, so an undo step is never recorded for a no-op.
 */
export function setVisibility(
  elements: DesignElement[],
  ids: string[],
  hidden: boolean,
): DesignElement[] {
  const scope = visibilityScope(elements, ids);
  let changed = false;
  const next = elements.map((element) => {
    if (!scope.has(element.id)) return element;
    if (Boolean(element.hidden) === hidden) return element;
    changed = true;
    return { ...element, hidden };
  });
  return changed ? next : elements;
}

/** Flips one layer (and its group) without deleting or reordering anything. */
export function toggleVisibility(
  elements: DesignElement[],
  id: string,
): DesignElement[] {
  const target = elements.find((element) => element.id === id);
  if (!target) return elements;
  return setVisibility(elements, [id], !target.hidden);
}

/** Whether every target (and its group) is currently hidden. */
export function allHidden(elements: DesignElement[], ids: string[]): boolean {
  const scope = visibilityScope(elements, ids);
  if (scope.size === 0) return false;
  let sawOne = false;
  for (const element of elements) {
    if (!scope.has(element.id)) continue;
    sawOne = true;
    if (!element.hidden) return false;
  }
  return sawOne;
}

/**
 * The artwork a viewer sees: the studio canvas, guest pages, print and PDF all
 * render through this, so a hidden layer cannot reappear in one output while
 * staying hidden in another.
 */
export function visibleElements(elements: DesignElement[]): DesignElement[] {
  return elements.filter((element) => !element.hidden);
}
