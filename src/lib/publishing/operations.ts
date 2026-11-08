/**
 * Immutable document operations.
 *
 * Every edit returns a new document and never mutates the old one. Pages that
 * were not touched keep their identity, so later history and memoisation work
 * can rely on reference equality (`before.pages[0] === after.pages[0]`) rather
 * than deep comparisons — which is what makes avoiding full-document copies
 * possible.
 *
 * Structural edits rebuild the spread plan; a document never carries a spread
 * list that disagrees with its page order.
 */

import {
  PUBLICATION_DOCUMENT_VERSION,
  type Guide,
  type MasterPage,
  type PublicationDocument,
  type PublicationObject,
  type PublicationPage,
  type Spread,
  type Story,
} from "./model";
import { defaultIds, type IdFactory } from "./ids";
import { createPage } from "./factory";
import { assignPageSides, planSpreads, preserveSpreadIds } from "./spreads";
import { createDefaultLayers } from "./layers";

export function findPage(
  document: PublicationDocument,
  pageId: string,
): PublicationPage | undefined {
  return document.pages.find((page) => page.id === pageId);
}

export function pageIndexOf(document: PublicationDocument, pageId: string): number {
  return document.pages.findIndex((page) => page.id === pageId);
}

export function findObject(
  document: PublicationDocument,
  objectId: string,
): { page: PublicationPage; object: PublicationObject } | undefined {
  for (const page of document.pages) {
    const object = page.objects.find((candidate) => candidate.id === objectId);
    if (object) return { page, object };
  }
  return undefined;
}

/** The spread gutter the document currently uses (0 for single-page docs). */
export function spreadGutterOf(document: PublicationDocument): number {
  return document.spreads.find((spread) => spread.kind === "facing")?.gutter ?? 0;
}

/** True when every page sits in exactly one spread and no spread names a
 * page outside the list. */
function spreadsCoverPages(
  spreads: readonly Spread[],
  pages: readonly PublicationPage[],
): boolean {
  const pageIds = new Set(pages.map((page) => page.id));
  const placed = new Set<string>();
  for (const spread of spreads) {
    for (const pageId of spread.pageIds) {
      if (!pageIds.has(pageId) || placed.has(pageId)) return false;
      placed.add(pageId);
    }
  }
  return placed.size === pageIds.size;
}

/**
 * Recomputes spreads and page sides for a new page list, keeping the document
 * object when the list is unchanged.
 */
export function reflowPages(
  document: PublicationDocument,
  pages: PublicationPage[],
  ids: IdFactory = defaultIds,
): PublicationDocument {
  const unchanged =
    pages.length === document.pages.length &&
    pages.every((page, index) => page === document.pages[index]);
  // An unchanged page list is only safe to return untouched when the stored
  // spreads describe exactly those pages, once each. A structural undo or redo
  // replays a page list over a document whose spreads belong to the other
  // state, so they can mention pages that just vanished or omit pages that
  // just came back; either way the spreads have to be rebuilt, not reused.
  if (unchanged && spreadsCoverPages(document.spreads, pages)) {
    return document;
  }
  const planned = planSpreads(pages, {
    facingPages: document.facingPages,
    gutter: spreadGutterOf(document),
    ids,
  });
  const spreads = preserveSpreadIds(planned, document.spreads);
  const sided = assignPageSides(pages, spreads, { facingPages: document.facingPages });
  return { ...document, pages: sided, spreads };
}

export function updatePage(
  document: PublicationDocument,
  pageId: string,
  updater: (page: PublicationPage) => PublicationPage,
): PublicationDocument {
  let changed = false;
  const pages = document.pages.map((page) => {
    if (page.id !== pageId) return page;
    const next = updater(page);
    if (next !== page) changed = true;
    return next;
  });
  return changed ? reflowPages(document, pages) : document;
}

export interface AddPageOptions {
  page?: PublicationPage;
  at?: number;
  name?: string;
  ids?: IdFactory;
}

export function addPage(
  document: PublicationDocument,
  options: AddPageOptions = {},
): PublicationDocument {
  const ids = options.ids ?? defaultIds;
  const page =
    options.page ??
    createPage(document.spec, {
      ids,
      name: options.name ?? `Page ${document.pages.length + 1}`,
    });
  const at = Math.max(
    0,
    Math.min(document.pages.length, Math.trunc(options.at ?? document.pages.length)),
  );
  const pages = [...document.pages];
  pages.splice(at, 0, page);
  return reflowPages(document, pages, ids);
}

export function removePage(
  document: PublicationDocument,
  pageId: string,
): PublicationDocument {
  if (document.pages.length <= 1) return document;
  const page = findPage(document, pageId);
  if (!page) return document;

  const removedObjects = new Set(page.objects.map((object) => object.id));
  const pages = document.pages.filter((candidate) => candidate.id !== pageId);
  const next = reflowPages(document, pages);

  const stories = next.stories.map((story) => {
    const frames = story.frames.filter(
      (frame) => frame.pageId !== pageId && !removedObjects.has(frame.objectId),
    );
    return frames.length === story.frames.length ? story : { ...story, frames };
  });
  const guides = next.guides.filter(
    (guide) => !(guide.scope === "page" && guide.pageId === pageId),
  );
  return stories === next.stories && guides === next.guides
    ? next
    : { ...next, stories, guides };
}

export function movePage(
  document: PublicationDocument,
  pageId: string,
  toIndex: number,
): PublicationDocument {
  const from = pageIndexOf(document, pageId);
  if (from < 0) return document;
  const target = Math.max(0, Math.min(document.pages.length - 1, Math.trunc(toIndex)));
  if (from === target) return document;
  const pages = [...document.pages];
  const [moved] = pages.splice(from, 1);
  pages.splice(target, 0, moved!);
  return reflowPages(document, pages);
}

export function updateObject(
  document: PublicationDocument,
  pageId: string,
  objectId: string,
  updater: (object: PublicationObject) => PublicationObject,
): PublicationDocument {
  return updatePage(document, pageId, (page) => {
    let changed = false;
    const objects = page.objects.map((object) => {
      if (object.id !== objectId) return object;
      const next = updater(object);
      if (next !== object) changed = true;
      return next;
    });
    return changed ? { ...page, objects } : page;
  });
}

export function addObject(
  document: PublicationDocument,
  pageId: string,
  object: PublicationObject,
): PublicationDocument {
  return updatePage(document, pageId, (page) =>
    page.objects.some((candidate) => candidate.id === object.id)
      ? page
      : { ...page, objects: [...page.objects, object] },
  );
}

export function removeObject(
  document: PublicationDocument,
  pageId: string,
  objectId: string,
): PublicationDocument {
  const next = updatePage(document, pageId, (page) => {
    const objects = page.objects.filter((object) => object.id !== objectId);
    return objects.length === page.objects.length ? page : { ...page, objects };
  });
  if (next === document) return document;
  const stories = next.stories.map((story) => {
    const frames = story.frames.filter((frame) => frame.objectId !== objectId);
    return frames.length === story.frames.length ? story : { ...story, frames };
  });
  return { ...next, stories };
}

/** Moves an object within its page's array (raw stacking order, all layers). */
export function moveObject(
  document: PublicationDocument,
  pageId: string,
  objectId: string,
  toIndex: number,
): PublicationDocument {
  return updatePage(document, pageId, (page) => {
    const from = page.objects.findIndex((object) => object.id === objectId);
    if (from < 0) return page;
    const target = Math.max(0, Math.min(page.objects.length - 1, Math.trunc(toIndex)));
    if (from === target) return page;
    const objects = [...page.objects];
    const [moved] = objects.splice(from, 1);
    objects.splice(target, 0, moved!);
    return { ...page, objects };
  });
}

export function setObjectLayer(
  document: PublicationDocument,
  pageId: string,
  objectId: string,
  layerId: string,
): PublicationDocument {
  return updateObject(document, pageId, objectId, (object) =>
    object.layerId === layerId ? object : { ...object, layerId },
  );
}

export function addLayerToPage(
  document: PublicationDocument,
  pageId: string,
  layer: PublicationPage["layers"][number],
): PublicationDocument {
  return updatePage(document, pageId, (page) =>
    page.layers.some((candidate) => candidate.id === layer.id)
      ? page
      : { ...page, layers: [...page.layers, layer] },
  );
}

/** A fresh default layer stack, for callers adding a page by hand. */
export function defaultPageLayers(ids: IdFactory = defaultIds) {
  return createDefaultLayers(ids);
}

/* -------------------------------------------------------------------------- */
/* Masters, stories and guides                                                */
/* -------------------------------------------------------------------------- */

export function addMaster(
  document: PublicationDocument,
  master: MasterPage,
): PublicationDocument {
  if (document.masters.some((candidate) => candidate.id === master.id)) return document;
  return { ...document, masters: [...document.masters, master] };
}

export function removeMaster(
  document: PublicationDocument,
  masterId: string,
): PublicationDocument {
  if (!document.masters.some((master) => master.id === masterId)) return document;
  const masters = document.masters.filter((master) => master.id !== masterId);
  const pages = document.pages.map((page) => {
    if (page.masterId !== masterId) return page;
    // The overrides described the deleted master's objects, so they go with
    // it: a page can never keep furniture overrides for furniture that no
    // longer exists.
    const next = { ...page };
    delete next.masterId;
    delete next.masterOverrides;
    return next;
  });
  return { ...document, masters, pages };
}

/** Applies one master to several pages in a single document change. */
export function applyMasterToPages(
  document: PublicationDocument,
  pageIds: readonly string[],
  masterId: string | undefined,
): PublicationDocument {
  if (masterId && !document.masters.some((master) => master.id === masterId)) {
    return document;
  }
  const wanted = new Set(pageIds);
  let changed = false;
  const pages = document.pages.map((page) => {
    if (!wanted.has(page.id) || page.masterId === masterId) return page;
    changed = true;
    const next = { ...page, masterId };
    // Overrides name objects of one specific master; changing the master
    // invalidates them rather than letting them point at nothing.
    delete next.masterOverrides;
    return next;
  });
  return changed ? { ...document, pages } : document;
}

/** Applies a master to a page (or clears it with `undefined`). */
export function applyMaster(
  document: PublicationDocument,
  pageId: string,
  masterId: string | undefined,
): PublicationDocument {
  if (masterId && !document.masters.some((master) => master.id === masterId)) {
    return document;
  }
  return updatePage(document, pageId, (page) => {
    if (page.masterId === masterId) return page;
    const next = { ...page, masterId };
    delete next.masterOverrides;
    return next;
  });
}

export function updateStory(
  document: PublicationDocument,
  storyId: string,
  updater: (story: Story) => Story,
): PublicationDocument {
  let changed = false;
  const stories = document.stories.map((story) => {
    if (story.id !== storyId) return story;
    const next = updater(story);
    if (next !== story) changed = true;
    return next;
  });
  return changed ? { ...document, stories } : document;
}

export function addGuide(
  document: PublicationDocument,
  guide: Guide,
): PublicationDocument {
  if (document.guides.some((candidate) => candidate.id === guide.id)) return document;
  return { ...document, guides: [...document.guides, guide] };
}

export function removeGuide(
  document: PublicationDocument,
  guideId: string,
): PublicationDocument {
  const guides = document.guides.filter((guide) => guide.id !== guideId);
  return guides.length === document.guides.length
    ? document
    : { ...document, guides };
}

/** Stamps `metadata.updatedAt`; all other operations stay deterministic. */
export function touchDocument(
  document: PublicationDocument,
  now = Date.now(),
): PublicationDocument {
  if (document.metadata.updatedAt === now) return document;
  return {
    ...document,
    version: PUBLICATION_DOCUMENT_VERSION,
    metadata: { ...document.metadata, updatedAt: now },
  };
}
