/**
 * Layers and stacking order.
 *
 * There is exactly one ordering rule and it lives here: `layers` and
 * `objects` are stored bottom-to-top, and the paint order is layers in array
 * order, then the objects of each layer in array order. No object stores a
 * number, so nothing can drift out of sync after a move.
 *
 * Every function returns a new page (or the *same* page when nothing
 * changed), and object arrays keep the identity of unaffected objects. That
 * is what makes structural sharing — and therefore cheap history — possible
 * later.
 */

import type { Layer, PublicationObject, PublicationPage } from "./model";
import { defaultIds, type IdFactory } from "./ids";

export function createLayer(
  name: string,
  options: Partial<Omit<Layer, "name">> & { ids?: IdFactory } = {},
): Layer {
  const { ids = defaultIds, ...rest } = options;
  return {
    id: rest.id ?? ids("layer"),
    name,
    locked: rest.locked ?? false,
    hidden: rest.hidden ?? false,
    printable: rest.printable ?? true,
    color: rest.color,
  };
}

/** Background, Content, Notes — the last one never prints. */
export function createDefaultLayers(ids: IdFactory = defaultIds): Layer[] {
  return [
    createLayer("Background", { ids, color: "#c9bfa8" }),
    createLayer("Content", { ids, color: "#7f9a8a" }),
    createLayer("Notes", { ids, color: "#b08a8a", printable: false }),
  ];
}

export function layerById(
  page: Pick<PublicationPage, "layers">,
  layerId: string,
): Layer | undefined {
  return page.layers.find((layer) => layer.id === layerId);
}

export function objectById(
  page: Pick<PublicationPage, "objects">,
  objectId: string,
): PublicationObject | undefined {
  return page.objects.find((object) => object.id === objectId);
}

/** Objects of one layer, in their relative stacking order. */
export function objectsInLayer(
  page: Pick<PublicationPage, "objects">,
  layerId: string,
): PublicationObject[] {
  return page.objects.filter((object) => object.layerId === layerId);
}

/**
 * Every object in paint order: back to front. Objects whose layer no longer
 * exists are painted last rather than vanishing.
 */
export function drawOrder(page: Pick<PublicationPage, "layers" | "objects">): PublicationObject[] {
  const known = new Set(page.layers.map((layer) => layer.id));
  const ordered: PublicationObject[] = [];
  for (const layer of page.layers) {
    for (const object of page.objects) {
      if (object.layerId === layer.id) ordered.push(object);
    }
  }
  for (const object of page.objects) {
    if (!known.has(object.layerId)) ordered.push(object);
  }
  return ordered;
}

export function layerIsVisible(layer: Layer | undefined): boolean {
  return Boolean(layer && !layer.hidden);
}

export function layerIsSelectable(layer: Layer | undefined): boolean {
  return Boolean(layer && !layer.hidden && !layer.locked);
}

export function objectIsVisible(
  page: Pick<PublicationPage, "layers" | "objects">,
  object: PublicationObject,
): boolean {
  return !object.hidden && layerIsVisible(layerById(page, object.layerId));
}

export function objectIsSelectable(
  page: Pick<PublicationPage, "layers" | "objects">,
  object: PublicationObject,
): boolean {
  return !object.hidden && !object.locked && layerIsSelectable(layerById(page, object.layerId));
}

/** Objects that can be seen (visible object, visible layer). */
export function visibleObjects(
  page: Pick<PublicationPage, "layers" | "objects">,
): PublicationObject[] {
  return drawOrder(page).filter((object) => objectIsVisible(page, object));
}

/** Objects that reach paper: visible and on a printable layer. */
export function printableObjects(
  page: Pick<PublicationPage, "layers" | "objects">,
): PublicationObject[] {
  return drawOrder(page).filter((object) => {
    const layer = layerById(page, object.layerId);
    return Boolean(layer && layer.printable) && objectIsVisible(page, object);
  });
}

/** The index of an object in the paint order, or -1. */
export function objectZIndex(
  page: Pick<PublicationPage, "layers" | "objects">,
  objectId: string,
): number {
  return drawOrder(page).findIndex((object) => object.id === objectId);
}

export function groupMembers(
  page: Pick<PublicationPage, "objects">,
  groupId: string,
): PublicationObject[] {
  return page.objects.filter((object) => object.groupId === groupId);
}

/** Gives every listed object the same group id. */
export function groupObjects(
  page: PublicationPage,
  objectIds: readonly string[],
  groupId: string,
): PublicationPage {
  const ids = new Set(objectIds);
  if (ids.size < 2) return page;
  return {
    ...page,
    objects: page.objects.map((object) =>
      ids.has(object.id) ? { ...object, groupId } : object,
    ),
  };
}

export function ungroupObjects(page: PublicationPage, groupId: string): PublicationPage {
  if (!page.objects.some((object) => object.groupId === groupId)) return page;
  return {
    ...page,
    objects: page.objects.map((object) => {
      if (object.groupId !== groupId) return object;
      const next = { ...object };
      delete next.groupId;
      return next;
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Immutable edits                                                            */
/* -------------------------------------------------------------------------- */

export function addLayer(page: PublicationPage, layer: Layer): PublicationPage {
  return { ...page, layers: [...page.layers, layer] };
}

export function updateLayer(
  page: PublicationPage,
  layerId: string,
  patch: Partial<Omit<Layer, "id">>,
): PublicationPage {
  let changed = false;
  const layers = page.layers.map((layer) => {
    if (layer.id !== layerId) return layer;
    changed = true;
    return { ...layer, ...patch, id: layer.id };
  });
  return changed ? { ...page, layers } : page;
}

/**
 * Removes an empty layer. A layer that still holds objects is left alone —
 * silently deleting artwork is never a reasonable edit.
 */
export function removeLayer(page: PublicationPage, layerId: string): PublicationPage {
  if (page.layers.length <= 1) return page;
  if (page.objects.some((object) => object.layerId === layerId)) return page;
  const layers = page.layers.filter((layer) => layer.id !== layerId);
  return layers.length === page.layers.length ? page : { ...page, layers };
}

/** Moves a layer to a new index in the bottom-to-top stack. */
export function reorderLayer(
  page: PublicationPage,
  layerId: string,
  toIndex: number,
): PublicationPage {
  const from = page.layers.findIndex((layer) => layer.id === layerId);
  if (from < 0) return page;
  const target = Math.max(0, Math.min(page.layers.length - 1, Math.trunc(toIndex)));
  if (target === from) return page;
  const layers = [...page.layers];
  const [moved] = layers.splice(from, 1);
  layers.splice(target, 0, moved!);
  return { ...page, layers };
}

/**
 * Moves an object to a new position among its own layer's objects. Objects on
 * other layers keep their place in the array; paint order is by layer anyway.
 */
export function reorderObject(
  page: PublicationPage,
  objectId: string,
  toIndexWithinLayer: number,
): PublicationPage {
  const object = objectById(page, objectId);
  if (!object) return page;
  const peers = objectsInLayer(page, object.layerId);
  if (peers.length < 2) return page;
  const from = peers.findIndex((peer) => peer.id === objectId);
  const target = Math.max(0, Math.min(peers.length - 1, Math.trunc(toIndexWithinLayer)));
  if (from < 0 || from === target) return page;

  const reordered = [...peers];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(target, 0, moved!);

  // Fill the layer's slots in the page array with the new peer order, so the
  // array itself becomes the new stacking order without moving other layers.
  let peerIndex = 0;
  const objects = page.objects.map((candidate) => {
    if (candidate.layerId !== object.layerId) return candidate;
    const next = reordered[peerIndex];
    peerIndex += 1;
    return next ?? candidate;
  });
  return { ...page, objects };
}

export function raiseObject(page: PublicationPage, objectId: string): PublicationPage {
  const object = objectById(page, objectId);
  if (!object) return page;
  const peers = objectsInLayer(page, object.layerId);
  const index = peers.findIndex((peer) => peer.id === objectId);
  return index < 0 ? page : reorderObject(page, objectId, index + 1);
}

export function lowerObject(page: PublicationPage, objectId: string): PublicationPage {
  const object = objectById(page, objectId);
  if (!object) return page;
  const peers = objectsInLayer(page, object.layerId);
  const index = peers.findIndex((peer) => peer.id === objectId);
  return index < 0 ? page : reorderObject(page, objectId, index - 1);
}

export function bringObjectToFront(page: PublicationPage, objectId: string): PublicationPage {
  const object = objectById(page, objectId);
  if (!object) return page;
  const peers = objectsInLayer(page, object.layerId);
  return reorderObject(page, objectId, peers.length - 1);
}

export function sendObjectToBack(page: PublicationPage, objectId: string): PublicationPage {
  return reorderObject(page, objectId, 0);
}
