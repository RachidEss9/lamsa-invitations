/**
 * Selection tools that act on a page (or a master surface).
 *
 * Everything here is a pure page → page transform, so the editor can apply a
 * whole arrangement as one history entry and the PDF/renderer never need to
 * know the tools exist. Layer membership is preserved: arranging only reorders
 * objects within their own layer, because paint order across layers belongs to
 * the layer stack (see `layers.ts`).
 */

import { alignPositions, distributePositions, type AlignKind } from "../arrange";
import { defaultIds, type IdFactory } from "./ids";
import { safeBox } from "./geometry";
import { frameBounds, moveFrame } from "./object-transform";
import type { PublicationObject, PublicationPage, Rect } from "./model";

export type MatchSizeMode = "width" | "height" | "both";
export type ArrangeMode = "front" | "forward" | "backward" | "back";

function selected(page: PublicationPage, ids: readonly string[]): PublicationObject[] {
  const wanted = new Set(ids);
  return page.objects.filter((object) => wanted.has(object.id));
}

function replaceObjects(
  page: PublicationPage,
  next: PublicationObject[],
): PublicationPage {
  const byId = new Map(next.map((object) => [object.id, object]));
  let changed = false;
  const objects = page.objects.map((object) => {
    const replacement = byId.get(object.id);
    if (!replacement || replacement === object) return object;
    changed = true;
    return replacement;
  });
  return changed ? { ...page, objects } : page;
}

/** Expands a selection so clicking one grouped object selects the group. */
export function expandSelectionToGroups(
  page: PublicationPage,
  ids: readonly string[],
): string[] {
  const groups = new Set(
    page.objects
      .filter((object) => ids.includes(object.id) && object.groupId)
      .map((object) => object.groupId!),
  );
  if (groups.size === 0) return [...new Set(ids)];
  return page.objects
    .filter((object) => ids.includes(object.id) || (object.groupId && groups.has(object.groupId)))
    .map((object) => object.id);
}

/** The page area a single-object alignment uses: the safe area, not the trim. */
export function alignmentFrame(page: PublicationPage): Rect {
  return safeBox(page.spec, page.side);
}

function arrangementFrame(page: PublicationPage) {
  const safe = alignmentFrame(page);
  return { x: safe.x, y: safe.y, w: safe.width, h: safe.height };
}

export function alignObjectsInPage(
  page: PublicationPage,
  ids: readonly string[],
  mode: AlignKind,
): PublicationPage {
  const objects = selected(page, ids);
  if (objects.length === 0) return page;
  const positions = alignPositions(
    objects.map((object) => {
      const bounds = frameBounds(object.frame);
      return {
        id: object.id,
        x: bounds.x,
        y: bounds.y,
        w: bounds.width,
        h: bounds.height,
        locked: object.locked,
      };
    }),
    mode,
    arrangementFrame(page),
  );
  return replaceObjects(
    page,
    objects.map((object) => {
      const target = positions.get(object.id);
      if (!target) return object;
      const bounds = frameBounds(object.frame);
      return {
        ...object,
        frame: moveFrame(object.frame, target.x - bounds.x, target.y - bounds.y),
      } as PublicationObject;
    }),
  );
}

export function distributeObjectsInPage(
  page: PublicationPage,
  ids: readonly string[],
  axis: "h" | "v",
): PublicationPage {
  const objects = selected(page, ids);
  if (objects.length < 3) return page;
  const positions = distributePositions(
    objects.map((object) => {
      const bounds = frameBounds(object.frame);
      return {
        id: object.id,
        x: bounds.x,
        y: bounds.y,
        w: bounds.width,
        h: bounds.height,
        locked: object.locked,
      };
    }),
    axis,
  );
  if (!positions) return page;
  return replaceObjects(
    page,
    objects.map((object) => {
      const target = positions.get(object.id);
      if (target === undefined) return object;
      const bounds = frameBounds(object.frame);
      return {
        ...object,
        frame:
          axis === "h"
            ? moveFrame(object.frame, target - bounds.x, 0)
            : moveFrame(object.frame, 0, target - bounds.y),
      } as PublicationObject;
    }),
  );
}

/**
 * Matches the rest of the selection to the first selected object (the one the
 * user dragged/clicked first). Rotation never changes: matching a size is not
 * a rotation command.
 */
export function matchObjectSize(
  page: PublicationPage,
  ids: readonly string[],
  mode: MatchSizeMode,
): PublicationPage {
  const objects = selected(page, ids);
  const source = objects[0];
  if (!source || objects.length < 2) return page;
  return replaceObjects(
    page,
    objects.slice(1).map(
      (object) =>
        ({
          ...object,
          frame: {
            ...object.frame,
            ...(mode === "width" || mode === "both" ? { width: source.frame.width } : {}),
            ...(mode === "height" || mode === "both" ? { height: source.frame.height } : {}),
          },
        }) as PublicationObject,
    ),
  );
}

/** Gives the selection one group id; nested groups collapse into the new one. */
export function groupObjects(
  page: PublicationPage,
  ids: readonly string[],
  groupId: string,
): PublicationPage {
  const wanted = new Set(ids);
  if (wanted.size < 2) return page;
  return {
    ...page,
    objects: page.objects.map((object) =>
      wanted.has(object.id) && object.groupId !== groupId
        ? { ...object, groupId }
        : object,
    ),
  };
}

/** Removes the group id from every selected object (and its group peers). */
export function ungroupObjects(
  page: PublicationPage,
  ids: readonly string[],
): PublicationPage {
  const groups = new Set(
    page.objects
      .filter((object) => ids.includes(object.id) && object.groupId)
      .map((object) => object.groupId!),
  );
  if (groups.size === 0) return page;
  return {
    ...page,
    objects: page.objects.map((object) => {
      if (!object.groupId || !groups.has(object.groupId)) return object;
      const next = { ...object };
      delete next.groupId;
      return next;
    }),
  };
}

/**
 * Copies the selection with a fixed offset. Copies get fresh ids and lose
 * story/master links: a duplicated text frame must not join the original's
 * thread, and a duplicate never points at the original's animation.
 */
export function duplicateObjects(
  page: PublicationPage,
  ids: readonly string[],
  offset = 12,
  createIds: IdFactory = defaultIds,
): { page: PublicationPage; objectIds: string[] } {
  const originals = selected(page, ids);
  if (originals.length === 0) return { page, objectIds: [] };
  const groupMap = new Map<string, string>();
  const copies = originals.map((object) => {
    const id = createIds("object");
    let groupId = object.groupId;
    if (groupId) {
      if (!groupMap.has(groupId)) groupMap.set(groupId, createIds("object"));
      groupId = groupMap.get(groupId);
    }
    const copy: PublicationObject = {
      ...object,
      id,
      name: `${object.name} copy`,
      frame: moveFrame(object.frame, offset, offset),
      ...(groupId ? { groupId } : {}),
    };
    if (copy.kind === "text-frame") delete copy.storyId;
    return copy;
  });
  return {
    page: { ...page, objects: [...page.objects, ...copies] },
    objectIds: copies.map((copy) => copy.id),
  };
}

/**
 * Moves objects within their own layers. `front`/`back` put them at the ends
 * of their layer's run; `forward`/`backward` swaps past the adjacent object in
 * the same layer.
 */
export function arrangeInPage(
  page: PublicationPage,
  ids: readonly string[],
  mode: ArrangeMode,
): PublicationPage {
  const wanted = new Set(ids);
  if (wanted.size === 0) return page;
  const layerOf = new Map(page.objects.map((object) => [object.id, object.layerId]));
  const objects = [...page.objects];

  const layerMembers = (layerId: string) =>
    objects.filter((object) => layerOf.get(object.id) === layerId);

  if (mode === "front" || mode === "back") {
    const moving = objects.filter(
      (object) => wanted.has(object.id) && layerOf.get(object.id) !== undefined,
    );
    if (moving.length === 0) return page;
    const keep = objects.filter((object) => !wanted.has(object.id));
    const byLayer = new Map<string, PublicationObject[]>();
    for (const layerId of new Set(moving.map((object) => object.layerId))) {
      byLayer.set(
        layerId,
        mode === "front"
          ? [...layerMembers(layerId).filter((o) => !wanted.has(o.id)), ...moving.filter((o) => o.layerId === layerId)]
          : [...moving.filter((o) => o.layerId === layerId), ...layerMembers(layerId).filter((o) => !wanted.has(o.id))],
      );
    }
    // Rebuild in layer-independent terms: replace each layer's members in the
    // order computed above while keeping other layers' positions intact.
    const result: PublicationObject[] = [];
    const emitted = new Set<string>();
    for (const object of keep) {
      const order = byLayer.get(object.layerId);
      if (order) {
        for (const member of order) {
          if (!emitted.has(member.id)) {
            result.push(member);
            emitted.add(member.id);
          }
        }
        byLayer.delete(object.layerId);
      }
      if (!emitted.has(object.id)) {
        result.push(object);
        emitted.add(object.id);
      }
    }
    for (const order of byLayer.values()) {
      for (const member of order) {
        if (!emitted.has(member.id)) result.push(member);
      }
    }
    return { ...page, objects: result };
  }

  const direction = mode === "forward" ? 1 : -1;
  const next = [...objects];
  const ordered = direction > 0 ? [...next].reverse() : next;
  for (const object of ordered) {
    if (!wanted.has(object.id)) continue;
    const index = next.indexOf(object);
    const peers = next
      .map((candidate, position) => ({ candidate, position }))
      .filter(({ candidate }) => candidate.layerId === object.layerId);
    const peerIndex = peers.findIndex(({ candidate }) => candidate.id === object.id);
    const neighbour = peers[peerIndex + direction];
    if (!neighbour || wanted.has(neighbour.candidate.id)) continue;
    const neighbourIndex = next.indexOf(neighbour.candidate);
    if (index === neighbourIndex) continue;
    next[index] = neighbour.candidate;
    next[neighbourIndex] = object;
  }
  return { ...page, objects: next };
}

export function setObjectsLocked(
  page: PublicationPage,
  ids: readonly string[],
  locked: boolean,
): PublicationPage {
  const wanted = new Set(ids);
  return {
    ...page,
    objects: page.objects.map((object) =>
      wanted.has(object.id) && object.locked !== locked ? { ...object, locked } : object,
    ),
  };
}

export function setObjectsHidden(
  page: PublicationPage,
  ids: readonly string[],
  hidden: boolean,
): PublicationPage {
  const wanted = new Set(ids);
  return {
    ...page,
    objects: page.objects.map((object) =>
      wanted.has(object.id) && object.hidden !== hidden ? { ...object, hidden } : object,
    ),
  };
}

/** Union bounds of the selection, in page points. */
export function selectionBounds(
  page: PublicationPage,
  ids: readonly string[],
): Rect | null {
  const boxes = selected(page, ids).map((object) => frameBounds(object.frame));
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
