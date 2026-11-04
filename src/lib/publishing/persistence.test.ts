import { describe, expect, it } from "vitest";
import { createDocument, createMasterPage, createShape, createTextFrame } from "./factory";
import { createSequentialIds } from "./ids";
import { addGuide, addMaster, addObject, applyMaster } from "./operations";
import {
  applySpreadGutters,
  collectAssetReferences,
  documentFromRecords,
  documentFromVersionContents,
  prepareDocumentForPersistence,
  recordsFromDocument,
  remapDocumentForDuplicate,
  versionContentsFromDocument,
  withSpreads,
  type PublicationRecord,
} from "./persistence";
import { validatePublicationDocument } from "./validate";
import type { PublicationDocument } from "./model";

/**
 * Persistence turns a document into small rows and back. These tests pin the
 * round-trip, the duplicate remapping rules and the consistency gate that every
 * Convex write runs through.
 */

function fixture(): PublicationDocument {
  const ids = createSequentialIds();
  const base = createDocument({
    presetId: "album-12x12",
    pageCount: 3,
    ids,
    now: 1000,
  });
  const page = base.pages[0]!;
  const contentLayer = page.layers[1]!;

  const text = createTextFrame({
    id: "object_text",
    layerId: contentLayer.id,
    x: 10,
    y: 20,
    width: 200,
    height: 100,
  });
  const image = createShape({
    id: "object_shape",
    layerId: contentLayer.id,
    groupId: "group_two",
    x: 0,
    y: 0,
    width: 50,
    height: 50,
  });
  let document = addObject(base, page.id, text);
  document = addObject(document, page.id, image);
  document = {
    ...document,
    assets: [
      {
        id: "asset_photo",
        name: "photo.jpg",
        storageId: "storage_photo",
        width: 2400,
        height: 1600,
        mime: "image/jpeg",
        tags: ["cover"],
      },
      {
        id: "asset_unused",
        name: "unused.png",
        storageId: "storage_unused",
        width: 10,
        height: 10,
        tags: [],
      },
    ],
    stories: [
      {
        version: 1,
        id: "story_body",
        name: "Body",
        paragraphs: [
          {
            id: "paragraph_1",
            styleId: document.styles.paragraph[0]!.id,
            runs: [{ text: "Hello", styleId: document.styles.character[0]?.id }],
          },
        ],
        frames: [{ pageId: page.id, objectId: text.id }],
        overflow: "thread",
      },
    ],
  };
  document = {
    ...document,
    pages: document.pages.map((entry) =>
      entry.id !== page.id
        ? entry
        : {
            ...entry,
            background: { color: "#ffffff", assetId: "asset_photo" },
            objects: entry.objects.map((object) =>
              object.id === text.id ? { ...object, storyId: "story_body" } : object,
            ),
          },
    ),
  };

  const master = createMasterPage("Furniture", { id: "master_1", ids });
  document = addMaster(document, master);
  document = applyMaster(document, page.id, master.id);
  document = addGuide(document, {
    id: "guide_1",
    axis: "x",
    position: 100,
    scope: "page",
    pageId: page.id,
  });
  return prepareDocumentForPersistence(document);
}

describe("document <-> records", () => {
  it("round-trips a prepared document", () => {
    const document = fixture();
    const records = recordsFromDocument(document, {
      _id: "publication_row",
      status: "draft",
      createdAt: 1000,
      updatedAt: 2000,
    });
    const rebuilt = documentFromRecords(records);

    expect(rebuilt.id).toBe("publication_row");
    expect(rebuilt.title).toBe(document.title);
    expect(rebuilt.spec).toEqual(document.spec);
    expect(rebuilt.facingPages).toBe(document.facingPages);
    expect(rebuilt.grid).toEqual(document.grid);
    expect(rebuilt.pages.map((page) => page.id)).toEqual(
      document.pages.map((page) => page.id),
    );
    expect(rebuilt.pages.map((page) => page.side)).toEqual(
      document.pages.map((page) => page.side),
    );
    expect(rebuilt.spreads.map((spread) => spread.pageIds)).toEqual(
      document.spreads.map((spread) => spread.pageIds),
    );
    expect(rebuilt.masters.map((master) => master.id)).toEqual(["master_1"]);
    expect(rebuilt.pages[0]!.masterId).toBe("master_1");
    expect(rebuilt.stories[0]!.frames).toEqual(document.stories[0]!.frames);
    expect(rebuilt.assets.map((asset) => asset.id)).toEqual([
      "asset_photo",
      "asset_unused",
    ]);
    expect(rebuilt.guides).toEqual(document.guides);
    expect(validatePublicationDocument(rebuilt)).toEqual([]);
  });

  it("derives stable spread ids from the page set", () => {
    const document = fixture();
    const records = recordsFromDocument(document, {
      _id: "publication_row",
      status: "draft",
      createdAt: 1000,
      updatedAt: 2000,
    });
    const first = documentFromRecords(records);
    const second = documentFromRecords(records);
    expect(first.spreads.map((spread) => spread.id)).toEqual(
      second.spreads.map((spread) => spread.id),
    );
    expect(first.spreads[0]!.id).toBe(`spread_${first.pages[0]!.id}`);
  });

  it("keeps page order by index, not row order", () => {
    const document = fixture();
    const records = recordsFromDocument(document, {
      _id: "publication_row",
      status: "draft",
      createdAt: 1000,
      updatedAt: 2000,
    });
    const rebuilt = documentFromRecords({
      ...records,
      pages: [...records.pages].reverse(),
    });
    expect(rebuilt.pages.map((page) => page.id)).toEqual(
      document.pages.map((page) => page.id),
    );
  });

  it("stores the default spread gutter and per-spread overrides", () => {
    const document = fixture();
    const facing = document.spreads.find((spread) => spread.kind === "facing")!;
    const plan = withSpreads(document.pages, true, 18, [
      { firstPageId: facing.pageIds[0]!, gutter: 4 },
    ]);
    const withGutter = { ...document, pages: plan.pages, spreads: plan.spreads };
    const records = recordsFromDocument(withGutter, {
      _id: "publication_row",
      status: "draft",
      createdAt: 1000,
      updatedAt: 2000,
    });
    expect(records.publication.defaultGutter).toBe(4);
    expect(records.publication.spreadGutters).toContainEqual({
      firstPageId: facing.pageIds[0]!,
      gutter: 4,
    });

    const rebuilt = documentFromRecords(records);
    expect(rebuilt.spreads.find((spread) => spread.kind === "facing")?.gutter).toBe(4);
  });

  it("applies overrides to a normalised plan", () => {
    const document = fixture();
    const next = applySpreadGutters(document, [
      { firstPageId: document.pages[0]!.id, gutter: 7 },
    ]);
    expect(next.spreads[0]!.gutter).toBe(7);
    expect(applySpreadGutters(document, [])).toBe(document);
  });

  it("rejects a future document version before persisting", () => {
    const document = fixture();
    expect(() =>
      prepareDocumentForPersistence({ ...document, version: 99 }),
    ).toThrow(/newer than this build supports/);
  });

  it("repairs compatible damage before validating", () => {
    const document = fixture();
    const broken: PublicationDocument = {
      ...document,
      pages: document.pages.map((page, index) =>
        index === 0 ? { ...page, layers: [] } : page,
      ),
    };
    const repaired = prepareDocumentForPersistence(broken);
    expect(repaired.pages[0]!.layers.length).toBeGreaterThan(0);
    expect(validatePublicationDocument(repaired)).toEqual([]);
  });
});

describe("duplicate remapping", () => {
  it("mints new ids while keeping every internal reference", () => {
    const document = fixture();
    const { document: copy, assetIds } = remapDocumentForDuplicate(
      document,
      createSequentialIds(900),
      5000,
    );

    expect(copy.pages.map((page) => page.id)).not.toEqual(
      document.pages.map((page) => page.id),
    );
    expect(copy.stories[0]!.id).not.toBe("story_body");
    expect(copy.masters[0]!.id).not.toBe("master_1");

    const page = copy.pages[0]!;
    const text = page.objects.find((object) => object.kind === "text-frame")!;
    const story = copy.stories[0]!;
    expect(story.frames).toHaveLength(1);
    expect(story.frames[0]!.pageId).toBe(page.id);
    expect(story.frames[0]!.objectId).toBe(text.id);
    expect(text.kind === "text-frame" ? text.storyId : undefined).toBe(story.id);
    expect(page.masterId).toBe(copy.masters[0]!.id);
    expect(page.background.assetId).toBe(
      copy.assets.find((asset) => asset.name === "photo.jpg")?.id,
    );
    expect(assetIds.get("asset_photo")).toBe(page.background.assetId);

    const oldIds = new Set([
      ...document.pages.map((entry) => entry.id),
      ...document.masters.map((entry) => entry.id),
      ...document.stories.map((entry) => entry.id),
      ...document.assets.map((entry) => entry.id),
    ]);
    const newIds = new Set([
      ...copy.pages.map((entry) => entry.id),
      ...copy.masters.map((entry) => entry.id),
      ...copy.stories.map((entry) => entry.id),
      ...copy.assets.map((entry) => entry.id),
    ]);
    for (const id of newIds) expect(oldIds.has(id)).toBe(false);
    expect(validatePublicationDocument(copy)).toEqual([]);
  });

  it("applies the duplicate timestamp to document metadata", () => {
    const document = fixture();
    const { document: copy } = remapDocumentForDuplicate(
      document,
      createSequentialIds(1),
      7777,
    );
    expect(copy.metadata.createdAt).toBe(7777);
    expect(copy.metadata.updatedAt).toBe(7777);
  });

  it("keeps group ids shared within the duplicated page only", () => {
    const document = fixture();
    const { document: copy } = remapDocumentForDuplicate(
      document,
      createSequentialIds(1),
    );
    const originalGroup = document.pages[0]!.objects.find(
      (object) => object.id === "object_shape",
    )?.groupId;
    const copiedGroup = copy.pages[0]!.objects.find(
      (object) => object.groupId !== undefined && object.kind === "shape",
    )?.groupId;
    expect(copiedGroup).toBeDefined();
    expect(copiedGroup).not.toBe(originalGroup);
  });
});

describe("versions", () => {
  it("snapshots and restores the same document state", () => {
    const document = fixture();
    const contents = versionContentsFromDocument(document, "publication_row");
    const restored = documentFromVersionContents(contents);

    expect(restored.pages.map((page) => page.id)).toEqual(
      document.pages.map((page) => page.id),
    );
    expect(restored.pages.map((page) => page.objects.length)).toEqual(
      document.pages.map((page) => page.objects.length),
    );
    expect(restored.masters.map((master) => master.id)).toEqual(
      document.masters.map((master) => master.id),
    );
    expect(restored.stories.map((story) => story.frames)).toEqual(
      document.stories.map((story) => story.frames),
    );
    expect(restored.spreads.map((spread) => spread.pageIds)).toEqual(
      document.spreads.map((spread) => spread.pageIds),
    );
    expect(restored.assets.map((asset) => asset.id)).toEqual(
      document.assets.map((asset) => asset.id),
    );
    expect(validatePublicationDocument(restored)).toEqual([]);
  });

  it("stores each page, master and story as its own record", () => {
    const document = fixture();
    const contents = versionContentsFromDocument(document, "publication_row");
    expect(contents.pages).toHaveLength(document.pages.length);
    expect(contents.pages[0]!.pageId).toBe(document.pages[0]!.id);
    expect(contents.masters).toHaveLength(1);
    expect(contents.stories).toHaveLength(1);
    expect(contents.settings.title).toBe(document.title);
  });

  it("rejects a future version snapshot before it is restored", () => {
    const document = fixture();
    const contents = versionContentsFromDocument(document, "publication_row");
    const broken = { ...contents, documentVersion: 99 };
    expect(() =>
      prepareDocumentForPersistence(documentFromVersionContents(broken)),
    ).toThrow(/newer than this build supports/);
  });
});

describe("asset references", () => {
  it("collects page, master and image references", () => {
    const document = fixture();
    const referenced = collectAssetReferences(document);
    expect(referenced.has("asset_photo")).toBe(true);
    expect(referenced.has("asset_unused")).toBe(false);
  });

  it("does not count the asset list itself as a reference", () => {
    const document = {
      ...fixture(),
      pages: fixture().pages.map((page) => ({
        ...page,
        background: { color: "#fff" },
        objects: [],
      })),
      masters: [],
    };
    expect(collectAssetReferences(document).size).toBe(0);
  });
});

describe("record helpers", () => {
  it("ignores missing publication status defaults in assembly", () => {
    const document = fixture();
    const records = recordsFromDocument(document, {
      _id: "publication_row",
      status: "archived",
      createdAt: 1,
      updatedAt: 2,
    });
    const publication: PublicationRecord = records.publication;
    expect(publication.status).toBe("archived");
  });
});
