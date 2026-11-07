/**
 * Master pages: inheritance, per-page overrides and safe structural edits.
 *
 * A master is reusable page furniture. A page never receives a copy of it:
 * rendering resolves the master at paint time, so editing a master updates
 * every page that uses it in one keystroke. A page that needs to differ stores
 * an explicit override against the master object's stable id — one record per
 * deviation, never a duplicate object tree.
 *
 * Everything here is plain data in, plain data out. The renderer, the editor
 * session and the tests all resolve masters through this one module, so
 * "what does this page look like" has exactly one answer.
 */

import type {
  Background,
  Layer,
  MasterObjectOverride,
  MasterPage,
  ObjectFrame,
  PageSide,
  PageSpec,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
} from "./model";
import { PUBLICATION_PAGE_VERSION } from "./model";
import { drawOrder, layerIsVisible, layerById } from "./layers";
import { defaultIds, type IdFactory } from "./ids";

/* -------------------------------------------------------------------------- */
/* Lookup                                                                     */
/* -------------------------------------------------------------------------- */

export function masterById(
  document: PublicationDocument,
  masterId: string | undefined,
): MasterPage | undefined {
  if (!masterId) return undefined;
  return document.masters.find((master) => master.id === masterId);
}

/** The master a page actually renders: a dangling reference renders nothing. */
export function masterForPage(
  document: PublicationDocument,
  page: PublicationPage,
): MasterPage | undefined {
  return masterById(document, page.masterId);
}

export function pagesUsingMaster(
  document: PublicationDocument,
  masterId: string,
): PublicationPage[] {
  return document.pages.filter((page) => page.masterId === masterId);
}

export function masterUsageCount(
  document: PublicationDocument,
  masterId: string,
): number {
  return document.pages.reduce(
    (count, page) => (page.masterId === masterId ? count + 1 : count),
    0,
  );
}

/**
 * The master a *new* page should adopt. There is no stored "default" flag:
 * the first master that applies to both sides wins, then the first master for
 * that page side, then nothing. Deriving it means deleting the favourite can
 * never leave a publication pointing at a master that no longer exists.
 */
export function defaultMasterFor(
  document: PublicationDocument,
  side: PageSide = "single",
): MasterPage | undefined {
  const both = document.masters.find((master) => master.appliesTo === "both");
  if (both) return both;
  const sided =
    side === "single"
      ? undefined
      : document.masters.find((master) => master.appliesTo === side);
  return sided ?? document.masters[0];
}

/* -------------------------------------------------------------------------- */
/* Master as an editable page                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A master in page shape, so the existing canvas, inspector and layer tools
 * work on it unchanged. The id is the master's id — the editor routes saves by
 * id, and a synthetic one would write master objects into a page.
 */
export function masterAsPage(
  master: MasterPage,
  document: PublicationDocument,
): PublicationPage {
  return {
    version: PUBLICATION_PAGE_VERSION,
    id: master.id,
    name: master.name,
    side: "single",
    spec: master.spec ?? document.spec,
    background: master.background,
    layers: master.layers,
    objects: master.objects,
    hidden: false,
  };
}

/** Writing a master-shaped surface back onto the master it came from. */
export function applyPageToMaster(
  master: MasterPage,
  surface: PublicationPage,
): MasterPage {
  const sameLayers =
    surface.layers === master.layers ||
    (surface.layers.length === master.layers.length &&
      surface.layers.every((layer, index) => layer === master.layers[index]));
  const sameObjects =
    surface.objects === master.objects ||
    (surface.objects.length === master.objects.length &&
      surface.objects.every((object, index) => object === master.objects[index]));
  const sameBackground = surface.background === master.background;
  if (sameLayers && sameObjects && sameBackground) return master;
  return {
    ...master,
    ...(surface.name !== master.name ? { name: surface.name } : {}),
    background: surface.background,
    layers: surface.layers,
    objects: surface.objects,
  };
}

export function masterPageSpec(
  master: MasterPage | undefined,
  document: PublicationDocument,
): PageSpec {
  return master?.spec ?? document.spec;
}

/* -------------------------------------------------------------------------- */
/* Overrides                                                                  */
/* -------------------------------------------------------------------------- */

export function overrideFor(
  page: PublicationPage,
  objectId: string,
): MasterObjectOverride | undefined {
  return page.masterOverrides?.find((override) => override.objectId === objectId);
}

function withoutOverride(
  page: PublicationPage,
  objectId: string,
): PublicationPage {
  if (!page.masterOverrides?.some((override) => override.objectId === objectId)) {
    return page;
  }
  const overrides = page.masterOverrides.filter(
    (override) => override.objectId !== objectId,
  );
  const next = { ...page };
  if (overrides.length > 0) next.masterOverrides = overrides;
  else delete next.masterOverrides;
  return next;
}

/**
 * Records a deviation for one page. Passing no supported property clears the
 * record instead of storing an empty one — "restore" and "never overridden"
 * are the same state, so the page stays identical to every other page using
 * the master.
 */
export function setMasterOverride(
  page: PublicationPage,
  objectId: string,
  patch: { hidden?: boolean; frame?: ObjectFrame; opacity?: number },
): PublicationPage {
  const existing = overrideFor(page, objectId);
  const merged: MasterObjectOverride = {
    objectId,
    ...(existing?.hidden !== undefined ? { hidden: existing.hidden } : {}),
    ...(existing?.frame ? { frame: existing.frame } : {}),
    ...(existing?.opacity !== undefined ? { opacity: existing.opacity } : {}),
  };
  if ("hidden" in patch) {
    if (patch.hidden === undefined) delete merged.hidden;
    else merged.hidden = patch.hidden;
  }
  if ("frame" in patch) {
    if (patch.frame === undefined) delete merged.frame;
    else merged.frame = { ...patch.frame };
  }
  if ("opacity" in patch) {
    if (patch.opacity === undefined) delete merged.opacity;
    else merged.opacity = patch.opacity;
  }

  const cleared =
    merged.hidden === undefined &&
    merged.frame === undefined &&
    merged.opacity === undefined;
  if (cleared) return withoutOverride(page, objectId);

  const others = (page.masterOverrides ?? []).filter(
    (override) => override.objectId !== objectId,
  );
  return { ...page, masterOverrides: [...others, merged] };
}

/** Drops every override of one object, restoring the master's own version. */
export function clearMasterOverride(
  page: PublicationPage,
  objectId: string,
): PublicationPage {
  return withoutOverride(page, objectId);
}

/**
 * Copies one master object onto the page as an independent page object. The
 * original stays on the master for every other page, and the page's override
 * record for that object is dropped because the page now owns its own copy.
 */
export function detachMasterObject(
  page: PublicationPage,
  master: MasterPage,
  objectId: string,
  ids: IdFactory = defaultIds,
): { page: PublicationPage; objectId: string } | null {
  const source = master.objects.find((object) => object.id === objectId);
  if (!source) return null;
  const detachedId = ids("object");
  return {
    page: {
      ...withoutOverride(page, objectId),
      objects: [...page.objects, { ...source, id: detachedId }],
    },
    objectId: detachedId,
  };
}

/**
 * The master objects a page paints, bottom to top, with overrides applied.
 * Objects hidden on the master, on a hidden master layer, or hidden by this
 * page's override never reach the list — so callers can draw them straight
 * away without a second visibility check.
 */
export function masterObjectsForPage(
  page: PublicationPage,
  master: MasterPage | undefined,
): PublicationObject[] {
  if (!master) return [];
  const visibleLayers = new Set(
    master.layers.filter((layer) => layerIsVisible(layer)).map((layer) => layer.id),
  );
  // Objects whose layer is missing are still painted, exactly as `drawOrder`
  // paints them on a page.
  const knownLayers = new Set(master.layers.map((layer) => layer.id));
  const objects: PublicationObject[] = [];
  for (const object of drawOrder(master)) {
    if (object.hidden) continue;
    if (knownLayers.has(object.layerId) && !visibleLayers.has(object.layerId)) {
      continue;
    }
    const override = overrideFor(page, object.id);
    if (override?.hidden) continue;
    objects.push(
      override?.frame || override?.opacity !== undefined
        ? {
            ...object,
            ...(override.frame ? { frame: { ...override.frame } } : {}),
            ...(override.opacity !== undefined ? { opacity: override.opacity } : {}),
          }
        : object,
    );
  }
  return objects;
}

/** Master background, or `undefined` when the master has no paint of its own. */
export function masterBackgroundFor(
  master: MasterPage | undefined,
): Background | undefined {
  if (!master) return undefined;
  if (!master.background) return undefined;
  if (!master.background.assetId && !master.background.color) return undefined;
  return master.background;
}

/** Objects of the master that this page overrides, for the inspector list. */
export function overriddenObjects(
  page: PublicationPage,
  master: MasterPage | undefined,
): { object: PublicationObject; override: MasterObjectOverride }[] {
  if (!master || !page.masterOverrides) return [];
  return page.masterOverrides.flatMap((override) => {
    const object = master.objects.find((entry) => entry.id === override.objectId);
    return object ? [{ object, override }] : [];
  });
}

/* -------------------------------------------------------------------------- */
/* Structural helpers                                                         */
/* -------------------------------------------------------------------------- */

/** A copy that no page references yet, with fresh layer and object ids. */
export function duplicateMaster(
  master: MasterPage,
  options: { name?: string; ids?: IdFactory } = {},
): MasterPage {
  const ids = options.ids ?? defaultIds;
  const layerIds = new Map(master.layers.map((layer) => [layer.id, ids("layer")]));
  const objectIds = new Map(
    master.objects.map((object) => [object.id, ids("object")]),
  );
  const groupIds = new Map<string, string>();
  const layers: Layer[] = master.layers.map((layer) => ({
    ...layer,
    id: layerIds.get(layer.id) ?? layer.id,
  }));
  const objects: PublicationObject[] = master.objects.map((object) => {
    let groupId = object.groupId;
    if (groupId) {
      if (!groupIds.has(groupId)) groupIds.set(groupId, `group_${ids("object")}`);
      groupId = groupIds.get(groupId);
    }
    return {
      ...object,
      id: objectIds.get(object.id) ?? object.id,
      layerId: layerIds.get(object.layerId) ?? object.layerId,
      ...(groupId ? { groupId } : {}),
    } as PublicationObject;
  });
  return {
    ...master,
    id: ids("master"),
    version: 1,
    name: options.name ?? `${master.name} copy`,
    background: { ...master.background },
    ...(master.spec ? { spec: { ...master.spec } } : {}),
    layers,
    objects,
  };
}

/** A new empty master sized like the publication. */
export function blankMaster(
  name: string,
  document: PublicationDocument,
  options: { ids?: IdFactory; appliesTo?: MasterPage["appliesTo"] } = {},
): MasterPage {
  const ids = options.ids ?? defaultIds;
  return {
    version: 1,
    id: ids("master"),
    name,
    appliesTo: options.appliesTo ?? "both",
    spec: { ...document.spec },
    background: { color: "#ffffff" },
    layers: [
      { id: ids("layer"), name: "Background", locked: false, hidden: false, printable: true, color: "#c9bfa8" },
      { id: ids("layer"), name: "Content", locked: false, hidden: false, printable: true, color: "#7f9a8a" },
    ],
    objects: [],
  };
}

/**
 * Reference hygiene for a master edit: drop overrides whose master object was
 * deleted, so a page can never carry a record for furniture that is gone.
 */
export function pruneMasterOverrides(
  page: PublicationPage,
  master: MasterPage,
): PublicationPage {
  if (!page.masterOverrides || page.masterOverrides.length === 0) return page;
  const ids = new Set(master.objects.map((object) => object.id));
  const kept = page.masterOverrides.filter((override) => ids.has(override.objectId));
  if (kept.length === page.masterOverrides.length) return page;
  const next = { ...page };
  if (kept.length > 0) next.masterOverrides = kept;
  else delete next.masterOverrides;
  return next;
}

/** Layer of a master object, for the layer panel's master section. */
export function masterLayerOf(
  master: MasterPage,
  object: PublicationObject,
): Layer | undefined {
  return layerById(master, object.layerId);
}
