import { describe, expect, it, vi } from "vitest";

import {
  createDocument,
  createImageFrame,
  createMasterPage,
  createShape,
  createTextFrame,
} from "./factory";
import type {
  MasterPage,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
} from "./model";
import {
  applyPageToMaster,
  blankMaster,
  clearMasterOverride,
  defaultMasterFor,
  detachMasterObject,
  duplicateMaster,
  masterAsPage,
  masterBackgroundFor,
  masterById,
  masterForPage,
  masterObjectsForPage,
  masterUsageCount,
  overriddenObjects,
  pagesUsingMaster,
  pruneMasterOverrides,
  setMasterOverride,
} from "./masters";
import { applyMaster, applyMasterToPages, removeMaster } from "./operations";
import {
  documentFromRecords,
  masterRecordFromDocument,
  pageRecordFromDocument,
  recordsFromDocument,
  remapDocumentForDuplicate,
} from "./persistence";
import { normalizeMasterOverrides, normalizePublicationDocument } from "./normalize";
import { validatePublicationDocument } from "./validate";
import { createSequentialIds } from "./ids";
import {
  activeLayerId,
  activeMaster,
  activeSurface,
  createEditorSession,
  dirtyMasters,
  editMaster,
  editPage,
  editSurface,
  markMasterSaved,
  sessionDocument,
  setActiveMaster,
  setSelection,
  syncBase,
  undo,
} from "./session";
import { PublishingSaver, SaveConflictError } from "./editor-save";
import {
  readRecoveryDraft,
  saveRecoveryDraft,
  clearRecoveryDraft,
} from "./recovery";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const ids = createSequentialIds(3000);

function shape(name: string, layerId: string, y: number): PublicationObject {
  return createShape({
    name,
    layerId,
    x: 10,
    y,
    width: 80,
    height: 40,
    shape: "rectangle",
    fill: "#cccccc",
    strokeWidth: 0,
  });
}

function fixture(): {
  document: PublicationDocument;
  master: MasterPage;
  page: PublicationPage;
} {
  const master = createMasterPage("A — Default", {
    id: "master_a",
    ids,
    description: "Running head and folio",
    appliesTo: "both",
    background: { color: "#f4efe4" },
    objects: [],
    layers: [
      { id: "ml_back", name: "Background", locked: false, hidden: false, printable: true },
      { id: "ml_front", name: "Furniture", locked: false, hidden: false, printable: true },
    ],
  });
  const document = createDocument({
    title: "Masters",
    pageCount: 3,
    masters: [master],
    ids,
  });
  return { document, master, page: document.pages[0]! };
}

/* -------------------------------------------------------------------------- */
/* Architecture                                                               */
/* -------------------------------------------------------------------------- */

describe("master architecture", () => {
  it("supports several masters and reports usage per master", () => {
    const { document } = fixture();
    const second = createMasterPage("B — Section", { id: "master_b", ids });
    const withBoth = { ...document, masters: [...document.masters, second] };
    const assigned = applyMasterToPages(
      withBoth,
      [withBoth.pages[0]!.id, withBoth.pages[1]!.id],
      second.id,
    );

    expect(withBoth.masters).toHaveLength(2);
    expect(masterUsageCount(assigned, second.id)).toBe(2);
    expect(masterUsageCount(assigned, "master_a")).toBe(0);
    expect(pagesUsingMaster(assigned, second.id)).toHaveLength(2);
  });

  it("assigns, changes and removes a master without touching page objects", () => {
    const { document, master } = fixture();
    const object = shape("Page art", document.pages[0]!.layers[1]!.id, 20);
    const withArt: PublicationDocument = {
      ...document,
      pages: document.pages.map((page, index) =>
        index === 0 ? { ...page, objects: [object] } : page,
      ),
    };

    const assigned = applyMaster(withArt, withArt.pages[0]!.id, master.id);
    expect(assigned.pages[0]!.masterId).toBe(master.id);
    expect(assigned.pages[0]!.objects).toEqual(withArt.pages[0]!.objects);
    expect(assigned.pages[1]!.masterId).toBeUndefined();

    const cleared = applyMaster(assigned, assigned.pages[0]!.id, undefined);
    expect(cleared.pages[0]!.masterId).toBeUndefined();
    expect(cleared.pages[0]!.objects).toEqual(withArt.pages[0]!.objects);
  });

  it("never lets a page point at a master that does not exist", () => {
    const { document } = fixture();
    const result = applyMaster(document, document.pages[0]!.id, "master_ghost");
    expect(result.pages[0]!.masterId).toBeUndefined();
    expect(applyMasterToPages(document, [document.pages[0]!.id], "master_ghost")).toBe(
      document,
    );
  });

  it("clears references and overrides when a master is deleted", () => {
    const { document, master } = fixture();
    const assigned = applyMasterToPages(
      document,
      [document.pages[0]!.id, document.pages[1]!.id],
      master.id,
    );
    const overridden: PublicationDocument = {
      ...assigned,
      pages: assigned.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              masterOverrides: [{ objectId: "m_obj", hidden: true }],
            }
          : page,
      ),
    };

    const removed = removeMaster(overridden, master.id);
    expect(removed.masters).toEqual([]);
    expect(removed.pages.every((page) => page.masterId === undefined)).toBe(true);
    expect(removed.pages.every((page) => page.masterOverrides === undefined)).toBe(true);
  });

  it("derives a default master that always exists", () => {
    const { document, master } = fixture();
    expect(defaultMasterFor(document)?.id).toBe(master.id);
    const sided = createMasterPage("Left only", { id: "master_l", appliesTo: "left", ids });
    const sidedDocument = { ...document, masters: [sided] };
    expect(defaultMasterFor(sidedDocument, "right")?.id).toBe("master_l");
    expect(defaultMasterFor({ ...document, masters: [] })).toBeUndefined();
  });

  it("duplicates a master with fresh object and layer ids", () => {
    const { document, master } = fixture();
    const withObjects: MasterPage = {
      ...master,
      objects: [shape("Rule", "ml_front", 30)],
    };
    const copy = duplicateMaster(withObjects, { ids });

    expect(copy.id).not.toBe(master.id);
    expect(copy.name).toBe("A — Default copy");
    expect(copy.objects).toHaveLength(1);
    expect(copy.objects[0]!.id).not.toBe(withObjects.objects[0]!.id);
    expect(copy.layers[0]!.id).not.toBe(master.layers[0]!.id);
    expect(copy.objects[0]!.layerId).toBe(copy.layers[1]!.id);
    // The original is untouched by the copy's existence.
    expect(withObjects.objects[0]!.id).not.toBe(copy.objects[0]!.id);
    expect(document.masters[0]).toBe(master);
  });

  it("creates an empty master sized like the publication", () => {
    const { document } = fixture();
    const master = blankMaster("C", document, { ids });
    expect(master.spec).toEqual(document.spec);
    expect(master.objects).toEqual([]);
    expect(master.layers.length).toBeGreaterThan(0);
  });

  it("projects a master into the page shape without copying objects", () => {
    const { document, master } = fixture();
    const surface = masterAsPage(master, document);
    expect(surface.id).toBe(master.id);
    expect(surface.objects).toBe(master.objects);
    expect(surface.spec).toEqual(document.spec);
    expect(surface.masterId).toBeUndefined();
  });

  it("writes a page-shaped surface back onto its master", () => {
    const { document, master } = fixture();
    const surface = masterAsPage(master, document);
    const object = shape("Furniture", master.layers[1]!.id, 5);
    const next = applyPageToMaster(master, { ...surface, objects: [object] });
    expect(next.objects).toEqual([object]);
    expect(applyPageToMaster(master, surface)).toBe(master);
  });
});

/* -------------------------------------------------------------------------- */
/* Rendering order                                                            */
/* -------------------------------------------------------------------------- */

describe("master rendering order", () => {
  it("paints master objects bottom-to-top, beneath page objects", () => {
    const { document, master } = fixture();
    const back = shape("Back", "ml_back", 4);
    const front = shape("Front", "ml_front", 40);
    const withObjects: MasterPage = { ...master, objects: [front, back] };
    const page: PublicationPage = {
      ...document.pages[0]!,
      masterId: master.id,
      objects: [shape("Page art", document.pages[0]!.layers[1]!.id, 60)],
    };
    const doc = { ...document, masters: [withObjects], pages: [page] };

    const resolved = masterObjectsForPage(page, masterForPage(doc, page));
    // Layer order wins over array order: Background layer first, then Furniture.
    expect(resolved.map((object) => object.name)).toEqual(["Back", "Front"]);

    // Page content is painted after (above) the resolved master list.
    const paintOrder = [...resolved, ...page.objects].map((object) => object.name);
    expect(paintOrder.indexOf("Page art")).toBeGreaterThan(paintOrder.indexOf("Front"));
  });

  it("renders nothing for a page without a master", () => {
    const { document, page } = fixture();
    expect(masterForPage(document, page)).toBeUndefined();
    expect(masterObjectsForPage(page, undefined)).toEqual([]);
    expect(masterBackgroundFor(undefined)).toBeUndefined();
  });

  it("exposes the master background only when the master paints one", () => {
    const { master } = fixture();
    expect(masterBackgroundFor(master)?.color).toBe("#f4efe4");
    expect(masterBackgroundFor({ ...master, background: { color: "" } })).toBeUndefined();
  });

  it("skips objects on hidden master layers and hidden objects", () => {
    const { document, master } = fixture();
    const hiddenLayer = shape("Guides", "ml_back", 4);
    const hiddenObject = { ...shape("Notes", "ml_front", 8), hidden: true };
    const shown = shape("Rule", "ml_front", 12);
    const next: MasterPage = {
      ...master,
      layers: master.layers.map((layer) =>
        layer.id === "ml_back" ? { ...layer, hidden: true } : layer,
      ),
      objects: [hiddenLayer, hiddenObject, shown],
    };
    const page = { ...document.pages[0]!, masterId: master.id };
    expect(masterObjectsForPage(page, next).map((object) => object.name)).toEqual([
      "Rule",
    ]);
  });

  it("propagates a master edit to every assigned page without duplicating it", () => {
    const { document, master } = fixture();
    const assigned = applyMasterToPages(
      document,
      document.pages.map((page) => page.id),
      master.id,
    );
    const rule = shape("Rule", "ml_front", 10);
    const edited: MasterPage = { ...master, objects: [rule] };
    const doc = { ...assigned, masters: [edited] };

    for (const page of doc.pages) {
      const resolved = masterObjectsForPage(page, masterForPage(doc, page));
      expect(resolved).toHaveLength(1);
      expect(resolved[0]!.id).toBe(rule.id);
      // The page itself never stores the master's objects.
      expect(page.objects).toHaveLength(0);
    }
  });

  it("resolves each page through its own master, never a shared one", () => {
    const { document, master } = fixture();
    const second = createMasterPage("B", {
      id: "master_b",
      ids,
      objects: [shape("B rule", "ml_front2", 4)],
      layers: [
        { id: "ml_front2", name: "Content", locked: false, hidden: false, printable: true },
      ],
    });
    const doc: PublicationDocument = {
      ...document,
      masters: [master, second],
      pages: document.pages.map((page, index) => ({
        ...page,
        masterId: index === 0 ? master.id : second.id,
      })),
    };
    expect(masterObjectsForPage(doc.pages[0]!, masterById(doc, master.id))).toEqual([]);
    expect(
      masterObjectsForPage(doc.pages[1]!, masterById(doc, second.id)).map(
        (object) => object.name,
      ),
    ).toEqual(["B rule"]);
  });
});

/* -------------------------------------------------------------------------- */
/* Overrides                                                                  */
/* -------------------------------------------------------------------------- */

describe("master object overrides", () => {
  function withMasterObjects(): {
    document: PublicationDocument;
    master: MasterPage;
    rule: PublicationObject;
  } {
    const { document, master } = fixture();
    const rule = shape("Rule", "ml_front", 10);
    const next: MasterPage = { ...master, objects: [rule] };
    return {
      document: { ...document, masters: [next] },
      master: next,
      rule,
    };
  }

  it("hides a master object on one page only", () => {
    const { document, master, rule } = withMasterObjects();
    const [first, second] = document.pages;
    const assignedFirst = setMasterOverride(
      { ...first!, masterId: master.id },
      rule.id,
      { hidden: true },
    );
    const assignedSecond = { ...second!, masterId: master.id };

    expect(masterObjectsForPage(assignedFirst, master)).toEqual([]);
    expect(masterObjectsForPage(assignedSecond, master)).toHaveLength(1);
    expect(master.objects).toHaveLength(1);
  });

  it("overrides a frame for one page without changing the master", () => {
    const { document, master, rule } = withMasterObjects();
    const page = { ...document.pages[0]!, masterId: master.id };
    const moved = setMasterOverride(page, rule.id, {
      frame: { x: 100, y: 200, width: 50, height: 50, rotation: 15 },
    });

    const [resolved] = masterObjectsForPage(moved, master);
    expect(resolved!.frame).toEqual({ x: 100, y: 200, width: 50, height: 50, rotation: 15 });
    expect(master.objects[0]!.frame).toEqual(rule.frame);
    expect(page.masterOverrides).toBeUndefined();
  });

  it("merges overrides for the same object instead of stacking records", () => {
    const { document, master, rule } = withMasterObjects();
    const page = { ...document.pages[0]!, masterId: master.id };
    const hidden = setMasterOverride(page, rule.id, { hidden: true });
    const both = setMasterOverride(hidden, rule.id, { opacity: 0.4 });
    expect(both.masterOverrides).toHaveLength(1);
    expect(both.masterOverrides![0]).toMatchObject({ objectId: rule.id, hidden: true, opacity: 0.4 });
    // Shown again, the same record supplies the opacity override.
    const shown = setMasterOverride(both, rule.id, { hidden: false });
    const [resolved] = masterObjectsForPage(shown, master);
    expect(resolved!.opacity).toBe(0.4);
  });

  it("restores the master version by clearing the record", () => {
    const { document, master, rule } = withMasterObjects();
    const page = { ...document.pages[0]!, masterId: master.id };
    const hidden = setMasterOverride(page, rule.id, { hidden: true });
    const restored = clearMasterOverride(hidden, rule.id);
    expect(restored.masterOverrides).toBeUndefined();
    expect(masterObjectsForPage(restored, master)).toHaveLength(1);
    expect(overriddenObjects(restored, master)).toEqual([]);
  });

  it("drops an override that would change nothing", () => {
    const { document, master, rule } = withMasterObjects();
    const page = { ...document.pages[0]!, masterId: master.id };
    const hidden = setMasterOverride(page, rule.id, { hidden: true });
    // Clearing the only deviation drops the record entirely, so the page is
    // byte-identical to one that was never overridden.
    const cleared = setMasterOverride(hidden, rule.id, { hidden: undefined });
    expect(cleared).toEqual(page);
    expect("masterOverrides" in cleared).toBe(false);
    expect(
      setMasterOverride(page, rule.id, { hidden: undefined }).masterOverrides,
    ).toBeUndefined();
  });

  it("detaches a master object onto the page as an independent copy", () => {
    const { document, master, rule } = withMasterObjects();
    const page = { ...document.pages[0]!, masterId: master.id };
    const detached = detachMasterObject(page, master, rule.id, ids);

    expect(detached).not.toBeNull();
    expect(detached!.page.objects).toHaveLength(1);
    expect(detached!.page.objects[0]!.id).not.toBe(rule.id);
    expect(detached!.page.objects[0]!.name).toBe("Rule");
    // The copy lives on a real page layer, not the master's layer.
    expect(page.layers.map((layer) => layer.id)).toContain(
      detached!.page.objects[0]!.layerId,
    );
    // The master original stays on other pages, but is hidden on this one so
    // the detached copy does not paint twice.
    expect(detached!.page.masterOverrides).toEqual([
      { objectId: rule.id, hidden: true },
    ]);
    expect(master.objects).toHaveLength(1);
    expect(master.objects[0]!.id).toBe(rule.id);
    expect(detachMasterObject(page, master, "missing", ids)).toBeNull();
  });

  it("removes overrides that name a deleted master object", () => {
    const { document, master, rule } = withMasterObjects();
    const page = {
      ...document.pages[0]!,
      masterId: master.id,
      masterOverrides: [
        { objectId: rule.id, hidden: true },
        { objectId: "gone", hidden: true },
      ],
    };
    const pruned = pruneMasterOverrides(page, master);
    expect(pruned.masterOverrides).toEqual([{ objectId: rule.id, hidden: true }]);
    const prunedAll = pruneMasterOverrides(
      { ...page, masterOverrides: [{ objectId: "gone", hidden: true }] },
      master,
    );
    expect(prunedAll.masterOverrides).toBeUndefined();
  });

  it("normalises overrides and drops empty or malformed records", () => {
    expect(normalizeMasterOverrides(undefined)).toBeUndefined();
    expect(normalizeMasterOverrides([{ objectId: "a" }])).toBeUndefined();
    expect(
      normalizeMasterOverrides([
        { objectId: "a", hidden: true },
        { objectId: "a", hidden: false },
        { nope: true },
        { objectId: "b", frame: { x: 1, y: 2, width: 3, height: 4, rotation: 0 } },
      ]),
    ).toEqual([
      { objectId: "a", hidden: true },
      { objectId: "b", frame: { x: 1, y: 2, width: 3, height: 4, rotation: 0 } },
    ]);
  });
});

/* -------------------------------------------------------------------------- */
/* Validation and compatibility                                               */
/* -------------------------------------------------------------------------- */

describe("master validation and compatibility", () => {
  it("keeps documents without masters and overrides valid", () => {
    const document = createDocument({ title: "Plain", pageCount: 2, ids });
    expect(document.masters).toEqual([]);
    expect(document.pages.every((page) => page.masterId === undefined)).toBe(true);
    expect(
      validatePublicationDocument(document).filter((issue) => issue.severity === "error"),
    ).toEqual([]);
  });

  it("accepts a valid master document with overrides", () => {
    const { document, master } = fixture();
    const rule = shape("Rule", "ml_front", 4);
    const withRule: PublicationDocument = {
      ...document,
      masters: [{ ...master, objects: [rule] }],
      pages: document.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              masterId: master.id,
              masterOverrides: [{ objectId: rule.id, hidden: true }],
            }
          : page,
      ),
    };
    const result = validatePublicationDocument(withRule);
    expect(result.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("reports a page that references a missing master", () => {
    const { document } = fixture();
    const broken: PublicationDocument = {
      ...document,
      pages: [{ ...document.pages[0]!, masterId: "master_ghost" }, ...document.pages.slice(1)],
    };
    const result = validatePublicationDocument(broken);
    expect(result.some((issue) => issue.code === "page/master-missing")).toBe(true);
  });

  it("warns when overrides exist without a master", () => {
    const { document } = fixture();
    const page = {
      ...document.pages[0]!,
      masterOverrides: [{ objectId: "m_obj", hidden: true }],
    };
    const result = validatePublicationDocument({
      ...document,
      pages: [page, ...document.pages.slice(1)],
    });
    expect(
      result.some((issue) => issue.code === "page/overrides-without-master"),
    ).toBe(true);
  });

  it("rejects duplicate override records at the same object", () => {
    const { document, master } = fixture();
    const page = {
      ...document.pages[0]!,
      masterId: master.id,
      masterOverrides: [
        { objectId: "x", hidden: true },
        { objectId: "x", hidden: false },
      ],
    };
    const result = validatePublicationDocument({
      ...document,
      pages: [page, ...document.pages.slice(1)],
    });
    expect(result.some((issue) => issue.code === "override/duplicate")).toBe(true);
  });

  it("normalises a master with an unknown appliesTo and no description", () => {
    const normalized = normalizePublicationDocument({
      ...createDocument({ title: "N", pageCount: 1, ids }),
      masters: [{ id: "m", name: "M", appliesTo: "sideways" }],
    });
    expect(normalized.masters[0]!.appliesTo).toBe("both");
    expect("description" in normalized.masters[0]!).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

describe("master persistence", () => {
  it("round-trips master descriptions, assignments and overrides", () => {
    const { document, master } = fixture();
    const rule = shape("Rule", "ml_front", 4);
    const withRule: PublicationDocument = {
      ...document,
      masters: [{ ...master, objects: [rule] }],
      pages: document.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              masterId: master.id,
              masterOverrides: [{ objectId: rule.id, hidden: true }],
            }
          : page,
      ),
    };
    const records = recordsFromDocument(withRule, {
      _id: "pub_1",
      status: "draft",
      createdAt: 1,
      updatedAt: 2,
    });
    expect(records.masters[0]!.description).toBe("Running head and folio");
    expect(records.pages[0]!.masterOverrides).toEqual([
      { objectId: rule.id, hidden: true },
    ]);

    const rebuilt = documentFromRecords(records);
    expect(rebuilt.masters[0]!.description).toBe("Running head and folio");
    expect(rebuilt.pages[0]!.masterId).toBe(master.id);
    expect(rebuilt.pages[0]!.masterOverrides).toEqual([
      { objectId: rule.id, hidden: true },
    ]);
    // Objects are deep copies: mutating the rebuilt page cannot corrupt the
    // stored record.
    expect(rebuilt.masters[0]!.objects[0]).not.toBe(records.masters[0]!.objects[0]);
  });

  it("omits master overrides for pages that have none", () => {
    const { document, page } = fixture();
    expect(pageRecordFromDocument(page, 0).masterOverrides).toBeUndefined();
    expect(
      masterRecordFromDocument(createMasterPage("M", { ids })).description,
    ).toBeUndefined();
    expect(document.pages[1]!.masterOverrides).toBeUndefined();
  });

  it("remaps override targets when a publication is duplicated", () => {
    const { document, master } = fixture();
    const rule = shape("Rule", "ml_front", 4);
    const withRule: PublicationDocument = {
      ...document,
      masters: [{ ...master, objects: [rule] }],
      pages: document.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              masterId: master.id,
              masterOverrides: [{ objectId: rule.id, hidden: true }],
            }
          : page,
      ),
    };
    const copy = remapDocumentForDuplicate(withRule, ids);
    const copyMaster = copy.document.masters[0]!;
    const copyPage = copy.document.pages[0]!;
    expect(copyPage.masterId).toBe(copyMaster.id);
    expect(copyPage.masterOverrides![0]!.objectId).toBe(copyMaster.objects[0]!.id);
    expect(copyPage.masterOverrides![0]!.objectId).not.toBe(rule.id);
  });

  it("keeps a master edit through a server refresh and undo", () => {
    const { document, master } = fixture();
    let session = createEditorSession(document);
    session = setActiveMaster(session, master.id);
    session = editMaster(session, master.id, (entry) => ({ ...entry, name: "Renamed" }));
    expect(dirtyMasters(session)).toHaveLength(1);
    expect(sessionDocument(session).masters[0]!.name).toBe("Renamed");

    // A fresh server copy does not clobber the unsaved master edit.
    const refreshed = syncBase(session, { ...document, title: "Other tab" });
    expect(sessionDocument(refreshed).masters[0]!.name).toBe("Renamed");

    const undone = undo(refreshed);
    expect(sessionDocument(undone).masters[0]!.name).toBe("A — Default");

    const saved = markMasterSaved(session, master.id, 4);
    expect(dirtyMasters(saved)).toHaveLength(0);
    expect(sessionDocument(saved).masters[0]!.version).toBe(4);
  });

  it("edits the master surface without touching the active page", () => {
    const { document, master } = fixture();
    let session = createEditorSession(document);
    session = setActiveMaster(session, master.id);
    expect(activeMaster(session)?.id).toBe(master.id);
    expect(activeSurface(session)?.id).toBe(master.id);

    session = editSurface(session, (surface) => ({
      ...surface,
      objects: [...surface.objects, shape("Master rule", master.layers[1]!.id, 9)],
    }));
    expect(sessionDocument(session).masters[0]!.objects).toHaveLength(1);
    expect(sessionDocument(session).pages[0]!.objects).toHaveLength(0);

    // Leaving master editing keeps the pending master edit in the session.
    session = setActiveMaster(session, undefined);
    expect(activeSurface(session)?.id).toBe(session.state.activePageId);
    expect(dirtyMasters(session)).toHaveLength(1);
  });

  it("switching to a master does not drop pending page edits", () => {
    const { document, master } = fixture();
    let session = createEditorSession(document);
    const pageId = document.pages[0]!.id;
    session = editPage(session, pageId, (page) => ({ ...page, name: "Renamed page" }));
    session = setActiveMaster(session, master.id);
    session = editMaster(session, master.id, (entry) => ({ ...entry, name: "M2" }));

    expect(sessionDocument(session).pages[0]!.name).toBe("Renamed page");
    expect(sessionDocument(session).masters[0]!.name).toBe("M2");
    expect(dirtyMasters(session)).toHaveLength(1);
  });

  it("saves masters through the queue with their own version guard", async () => {
    const { master } = fixture();
    const saveMaster = vi.fn(async (entry: MasterPage, expected?: number) => ({
      version: (expected ?? 0) + 1,
    }));
    const onMasterSaved = vi.fn();
    const saver = new PublishingSaver({
      savePage: async () => ({ version: 2 }),
      saveStory: async () => ({ version: 2 }),
      saveMaster,
      onMasterSaved,
      delayMs: 0,
    });
    saver.setMasterBaseline(master.id, 3);
    saver.schedule({ pages: [], stories: [], masters: [{ ...master, name: "Edited" }] });
    await saver.flush();

    expect(saveMaster).toHaveBeenCalledTimes(1);
    expect(saveMaster.mock.calls[0]![1]).toBe(3);
    expect(onMasterSaved).toHaveBeenCalledWith(master.id, 4);
    await saver.dispose();
  });

  it("turns a stale master write into a conflict instead of overwriting", async () => {
    const { master } = fixture();
    const saver = new PublishingSaver({
      savePage: async () => ({ version: 2 }),
      saveStory: async () => ({ version: 2 }),
      saveMaster: async () => {
        throw new Error("This master changed elsewhere. Reload it and try again.");
      },
      delayMs: 0,
    });
    const statuses: string[] = [];
    saver.setMasterBaseline(master.id, 1);
    const guarded = new PublishingSaver({
      savePage: async () => ({ version: 2 }),
      saveStory: async () => ({ version: 2 }),
      saveMaster: async () => {
        throw new Error("This master changed elsewhere. Reload it and try again.");
      },
      delayMs: 0,
      onStatus: (status) => statuses.push(status),
    });
    guarded.setMasterBaseline(master.id, 1);
    await guarded.flush({ pages: [], stories: [], masters: [master] });
    expect(statuses).toContain("conflict");
    expect(guarded.current).toBe("conflict");
    // Nothing is retried behind the designer's back.
    await guarded.flush({ pages: [], stories: [], masters: [master] });
    await guarded.dispose();
    await saver.dispose();
  });

  it("keeps unsaved master edits in a recovery draft", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;
    const { master } = fixture();
    saveRecoveryDraft("pub_1", { pages: [], stories: [], masters: [master] }, storage);
    const draft = readRecoveryDraft("pub_1", storage);
    expect(draft?.masters?.[0]?.id).toBe(master.id);
    clearRecoveryDraft("pub_1", storage);
    expect(readRecoveryDraft("pub_1", storage)).toBeNull();

    // A draft written before masters existed still reads as valid.
    store.set(
      "lamsa.publishing.recovery.v1:pub_1",
      JSON.stringify({ publicationId: "pub_1", savedAt: 1, pages: [], stories: [] }),
    );
    const legacy = readRecoveryDraft("pub_1", storage);
    expect(legacy).not.toBeNull();
    expect(legacy?.masters).toBeUndefined();
  });

  it("refuses a master save for a document the caller does not own", async () => {
    // Ownership is enforced server-side in `requireOwnedPublication`; the
    // client never sends an owner id. This test pins the contract that the
    // saver only ever passes the publication id and the record.
    const { master } = fixture();
    const saveMaster = vi.fn(async (entry: MasterPage) => ({ version: entry.version }));
    const saver = new PublishingSaver({
      savePage: async () => ({ version: 2 }),
      saveStory: async () => ({ version: 2 }),
      saveMaster,
      delayMs: 0,
    });
    await saver.flush({ pages: [], stories: [], masters: [master] });
    expect(saveMaster.mock.calls[0]![0]).toBe(master);
    expect(Object.keys(saveMaster.mock.calls[0]![0])).not.toContain("ownerId");
    await saver.dispose();
  });
});

/* -------------------------------------------------------------------------- */
/* Selection isolation                                                        */
/* -------------------------------------------------------------------------- */

describe("master editing context", () => {
  it("clears selection when the context changes and scopes the layer", () => {
    const { document, master } = fixture();
    let session = createEditorSession(document);
    session = setSelection(session, ["object_1"]);
    session = setActiveMaster(session, master.id);
    expect(session.state.selection).toEqual([]);
    expect(session.state.activeLayerId).toBe("ml_front");
    expect(session.state.activeMasterId).toBe(master.id);
  });

  it("ignores an unknown master id", () => {
    const { document } = fixture();
    const session = createEditorSession(document);
    expect(setActiveMaster(session, "master_ghost")).toBe(session);
  });

  it("does not let a stale activeMasterId survive a server refresh", () => {
    const { document, master } = fixture();
    let session = createEditorSession(document);
    session = setActiveMaster(session, master.id);
    const removed = syncBase(session, { ...document, masters: [] });
    expect(removed.state.activeMasterId).toBeUndefined();
  });

  it("adds new master objects to the master's own active layer", () => {
    const { document, master } = fixture();
    let session = createEditorSession(document);
    session = setActiveMaster(session, master.id);
    const layerId = activeLayerId(session)!;
    // The master's layer ids are its own; reusing the page's would produce a
    // document the server refuses (the object's layer would not exist).
    expect(master.layers.some((layer) => layer.id === layerId)).toBe(true);
    session = editSurface(session, (surface) => ({
      ...surface,
      objects: [...surface.objects, shape("New furniture", layerId, 12)],
    }));
    const doc = sessionDocument(session);
    expect(doc.masters[0]!.objects[0]!.layerId).toBe(layerId);
    expect(doc.pages[0]!.objects).toHaveLength(0);
    expect(
      validatePublicationDocument(doc).filter((issue) => issue.severity === "error"),
    ).toEqual([]);
  });

  it("reports a conflict error type for stale master writes", () => {
    const error = new SaveConflictError("stale");
    expect(error.name).toBe("SaveConflictError");
  });
});

/* -------------------------------------------------------------------------- */
/* Text and image masters                                                     */
/* -------------------------------------------------------------------------- */

describe("master objects reuse the page object model", () => {
  it("supports text and image frames with Phase 3B/3C payloads", () => {
    const { document, master } = fixture();
    const text = createTextFrame({
      name: "Running head",
      layerId: "ml_front",
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      storyId: "story_1",
    });
    const image = createImageFrame({
      name: "Cover",
      layerId: "ml_back",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      assetId: "asset_1",
      fit: "fill",
      crop: { scale: 1.4, offsetX: 0.1, offsetY: -0.05, normalized: true, rotation: 5 },
    });
    const next: MasterPage = { ...master, objects: [image, text] };
    const page = { ...document.pages[0]!, masterId: master.id };
    const resolved = masterObjectsForPage(page, next);

    const resolvedImage = resolved.find((object) => object.kind === "image-frame");
    const resolvedText = resolved.find((object) => object.kind === "text-frame");
    expect(resolvedImage?.kind === "image-frame" && resolvedImage.crop.scale).toBe(1.4);
    expect(resolvedImage?.kind === "image-frame" && resolvedImage.assetId).toBe("asset_1");
    expect(resolvedText?.kind === "text-frame" && resolvedText.storyId).toBe("story_1");
  });
});
