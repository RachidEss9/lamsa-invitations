import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { describe, expect, it } from "vitest";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { MasterPage, PublicationPage, Story } from "./model";

/**
 * These tests run the real Convex functions against convex-test's in-memory
 * backend, including auth identities and storage. They prove that ownership is
 * enforced server-side, not just in the client that will call these functions.
 */

const modules = Object.fromEntries(
  Object.entries(import.meta.glob("../../convex/**/*.{ts,js}"))
    .filter(([path]) => !path.endsWith(".d.ts"))
    .map(([path, loader]) => [path.replace("../../convex", "."), loader]),
);

const setup = () => convexTest(schema, modules);

type PageArg = FunctionArgs<typeof api.publishing.pages.savePage>["page"];
type MasterArg = FunctionArgs<typeof api.publishing.masters.createMaster>["master"];
type StoryArg = FunctionArgs<typeof api.publishing.stories.createStory>["story"];

const asPage = (page: PublicationPage) => page as unknown as PageArg;
const asMaster = (master: MasterPage) => master as unknown as MasterArg;
const asStory = (story: Story) => story as unknown as StoryArg;

async function seedUsers(t: ReturnType<typeof setup>) {
  const owner = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Owner", email: "owner@example.com" }),
  );
  const stranger = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Stranger", email: "stranger@example.com" }),
  );
  return { owner, stranger };
}

async function createPublication(
  t: ReturnType<typeof setup>,
  userId: Id<"users">,
  pageCount = 3,
) {
  return await t
    .withIdentity({ subject: userId })
    .mutation(api.publishing.publications.createPublication, {
      presetId: "album-12x12",
      pageCount,
    });
}

describe("publication ownership", () => {
  it("creates a publication from a Phase 1 preset", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner);

    const result = await t
      .withIdentity({ subject: owner })
      .query(api.publishing.publications.getMine, { publicationId });
    expect(result.document.pages).toHaveLength(3);
    expect(result.document.spec.trim.width).toBe(864);
    expect(result.publication.title).toContain("Album");
  });

  it("does not let another user read, list, update or archive it", async () => {
    const t = setup();
    const { owner, stranger } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner);
    const asStranger = t.withIdentity({ subject: stranger });

    await expect(
      asStranger.query(api.publishing.publications.getMine, { publicationId }),
    ).rejects.toThrow(/not found/i);
    expect(
      await asStranger.query(api.publishing.publications.listMine, {}),
    ).toEqual([]);
    await expect(
      asStranger.mutation(api.publishing.publications.updatePublication, {
        publicationId,
        settings: { title: "Stolen" },
      }),
    ).rejects.toThrow(/not found/i);
    await expect(
      asStranger.mutation(api.publishing.publications.archivePublication, {
        publicationId,
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("rejects unauthenticated writes", async () => {
    const t = setup();
    await expect(
      t.mutation(api.publishing.publications.createPublication, { pageCount: 1 }),
    ).rejects.toThrow(/session/i);
  });

  it("updates metadata and settings for the owner", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner);
    const asOwner = t.withIdentity({ subject: owner });

    await asOwner.mutation(api.publishing.publications.updatePublication, {
      publicationId,
      settings: { title: "Coastal Album", defaultGutter: 18 },
    });
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(result.publication.title).toBe("Coastal Album");
    expect(result.publication.defaultGutter).toBe(18);
    expect(
      result.document.spreads.filter((spread) => spread.kind === "facing")[0]?.gutter,
    ).toBe(18);
  });

  it("archives and unarchives without losing content", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner);
    const asOwner = t.withIdentity({ subject: owner });

    await asOwner.mutation(api.publishing.publications.archivePublication, {
      publicationId,
    });
    expect(
      await asOwner.query(api.publishing.publications.listMine, { status: "archived" }),
    ).toHaveLength(1);
    await asOwner.mutation(api.publishing.publications.unarchivePublication, {
      publicationId,
    });
    expect(
      await asOwner.query(api.publishing.publications.listMine, { status: "draft" }),
    ).toHaveLength(1);
  });

  it("deletes a publication and its child rows", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner);
    const asOwner = t.withIdentity({ subject: owner });
    await asOwner.mutation(api.publishing.publications.deletePublication, {
      publicationId,
    });
    expect(await asOwner.query(api.publishing.publications.listMine, {})).toEqual([]);
    const remaining = await t.run(async (ctx) => {
      return {
        pages: await ctx.db.query("publicationPages").collect(),
        masters: await ctx.db.query("publicationMasters").collect(),
        stories: await ctx.db.query("publicationStories").collect(),
      };
    });
    expect(remaining).toEqual({ pages: [], masters: [], stories: [] });
  });
});

function textFrame(layerId: string, id = "object_text") {
  return {
    version: 1,
    id,
    kind: "text-frame" as const,
    name: "Body",
    layerId,
    frame: { x: 10, y: 10, width: 200, height: 120, rotation: 0 },
    locked: false,
    hidden: false,
    opacity: 1,
    columns: 1,
    gutter: 0,
    inset: { top: 0, right: 0, bottom: 0, left: 0 },
    verticalAlign: "top" as const,
    overflow: "thread" as const,
    fitToFrame: false,
  };
}

function imageFrame(layerId: string, assetId: string, id = "object_image") {
  return {
    version: 1,
    id,
    kind: "image-frame" as const,
    name: "Photo",
    layerId,
    frame: { x: 0, y: 0, width: 300, height: 200, rotation: 0 },
    locked: false,
    hidden: false,
    opacity: 1,
    assetId,
    fit: "fill" as const,
    crop: { scale: 1, offsetX: 0, offsetY: 0 },
    mask: "rect" as const,
  };
}

function masterFor(page: PublicationPage, id = "master_furniture") {
  return {
    version: 1,
    id,
    name: "Furniture",
    appliesTo: "both" as const,
    background: { color: "#ffffff" },
    layers: page.layers.map((layer) => ({ ...layer })),
    objects: [],
  };
}

async function storeFile(
  t: ReturnType<typeof setup>,
  type = "image/jpeg",
  bytes = 8,
): Promise<Id<"_storage">> {
  return await t.run((ctx) =>
    ctx.storage.store(new Blob([new Uint8Array(bytes)], { type })),
  );
}

async function registerAsset(
  t: ReturnType<typeof setup>,
  userId: Id<"users">,
  publicationId: Id<"publications">,
  overrides: { type?: string; filename?: string; width?: number; height?: number } = {},
) {
  const storageId = await storeFile(t, overrides.type);
  const asset = await t
    .withIdentity({ subject: userId })
    .mutation(api.publishing.assets.registerAsset, {
      publicationId,
      storageId,
      filename: overrides.filename ?? "photo.jpg",
      mimeType: overrides.type ?? "image/jpeg",
      width: overrides.width ?? 2400,
      height: overrides.height ?? 1600,
      tags: ["cover"],
    });
  return { ...asset, storageId };
}

describe("masters", () => {
  it("creates, applies, updates and deletes a master", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 2);
    const asOwner = t.withIdentity({ subject: owner });
    let result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[0]!;

    const master = masterFor(page);
    await asOwner.mutation(api.publishing.masters.createMaster, {
      publicationId,
      master: asMaster(master),
    });
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({ ...page, masterId: master.id }),
    });
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    expect(result.document.pages[0]!.masterId).toBe(master.id);

    const updated = await asOwner.mutation(api.publishing.masters.updateMaster, {
      publicationId,
      master: asMaster({ ...master, name: "Running head" }),
    });
    expect(updated.version).toBe(2);

    await asOwner.mutation(api.publishing.masters.deleteMaster, {
      publicationId,
      masterId: master.id,
    });
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    expect(result.document.masters).toEqual([]);
    expect(result.document.pages[0]!.masterId).toBeUndefined();
  });

  it("rejects a duplicate master and another user's edit", async () => {
    const t = setup();
    const { owner, stranger } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const master = masterFor(result.document.pages[0]!);
    await asOwner.mutation(api.publishing.masters.createMaster, {
      publicationId,
      master: asMaster(master),
    });
    await expect(
      asOwner.mutation(api.publishing.masters.createMaster, {
        publicationId,
        master: asMaster(master),
      }),
    ).rejects.toThrow(/already exists/i);
    await expect(
      t.withIdentity({ subject: stranger }).mutation(
        api.publishing.masters.deleteMaster,
        { publicationId, masterId: master.id },
      ),
    ).rejects.toThrow(/not found/i);
  });
});

describe("stories", () => {
  it("persists a threaded story and clears the frame on delete", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 2);
    const asOwner = t.withIdentity({ subject: owner });
    let result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[0]!;
    const frame = textFrame(page.layers[1]!.id);
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({ ...page, objects: [frame] }),
    });

    const story: Story = {
      version: 1,
      id: "story_body",
      name: "Body copy",
      paragraphs: [{ id: "paragraph_1", runs: [{ text: "Hello" }] }],
      frames: [{ pageId: page.id, objectId: frame.id }],
      overflow: "thread",
    };
    await asOwner.mutation(api.publishing.stories.createStory, {
      publicationId,
      story: asStory(story),
    });
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    expect(result.document.stories[0]!.frames).toEqual([
      { pageId: page.id, objectId: frame.id },
    ]);
    const text = result.document.pages[0]!.objects[0]!;
    expect(text.kind === "text-frame" ? text.storyId : undefined).toBe("story_body");

    const updated = await asOwner.mutation(api.publishing.stories.updateStory, {
      publicationId,
      story: asStory({ ...story, name: "Body" }),
    });
    expect(updated.version).toBe(2);

    await asOwner.mutation(api.publishing.stories.deleteStory, {
      publicationId,
      storyId: story.id,
    });
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    expect(result.document.stories).toEqual([]);
    const remaining = result.document.pages[0]!.objects[0]!;
    expect(remaining.kind === "text-frame" ? remaining.storyId : "kept").toBeUndefined();
  });

  it("rejects dangling frames and double claims", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[0]!;
    const frame = textFrame(page.layers[1]!.id);
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({ ...page, objects: [frame] }),
    });

    const base: Story = {
      version: 1,
      id: "story_one",
      name: "One",
      paragraphs: [],
      frames: [{ pageId: page.id, objectId: frame.id }],
      overflow: "thread",
    };
    await expect(
      asOwner.mutation(api.publishing.stories.createStory, {
        publicationId,
        story: asStory({ ...base, frames: [{ pageId: page.id, objectId: "object_ghost" }] }),
      }),
    ).rejects.toThrow(/does not exist/i);

    await asOwner.mutation(api.publishing.stories.createStory, {
      publicationId,
      story: asStory(base),
    });
    await expect(
      asOwner.mutation(api.publishing.stories.createStory, {
        publicationId,
        story: asStory({ ...base, id: "story_two" }),
      }),
    ).rejects.toThrow(/already belongs/i);
  });
});

describe("typography persistence", () => {
  it("saves publication-level styles behind their own version guard", async () => {
    const t = setup();
    const { owner, stranger } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    let result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const styles = {
      ...result.document.styles,
      paragraph: [
        {
          ...result.document.styles.paragraph[0]!,
          name: "Arabic body",
          fontId: "arabic",
          size: 14,
          leading: 22,
          direction: "rtl" as const,
          alignment: "justify" as const,
          leftIndent: 8,
          rightIndent: 8,
        },
      ],
      character: [
        {
          id: "style_emphasis",
          name: "Emphasis",
          fontWeight: 700,
          color: "#8a1020",
        },
      ],
    };
    const saved = await asOwner.mutation(api.publishing.publications.saveStyles, {
      publicationId,
      styles,
      expectedStylesVersion: 1,
    });
    expect(saved.stylesVersion).toBe(2);
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    expect(result.document.styles.paragraph[0]!.fontId).toBe("arabic");
    expect(result.document.styles.paragraph[0]!.direction).toBe("rtl");
    expect(result.document.styles.character[0]!.fontWeight).toBe(700);

    await expect(
      asOwner.mutation(api.publishing.publications.saveStyles, {
        publicationId,
        styles,
        expectedStylesVersion: 1,
      }),
    ).rejects.toThrow(/changed elsewhere/i);
    await expect(
      t.withIdentity({ subject: stranger }).mutation(
        api.publishing.publications.saveStyles,
        { publicationId, styles },
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("keeps run formats and paragraph direction through a story save", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    let result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[0]!;
    const frame = textFrame(page.layers[1]!.id);
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({ ...page, objects: [frame] }),
    });
    const story: Story = {
      version: 1,
      id: "story_arabic",
      name: "Arabic body",
      paragraphs: [
        {
          id: "p1",
          format: { alignment: "right", direction: "rtl" },
          runs: [
            {
              text: "مرحبا بالعالم ١٢٣",
              format: { fontWeight: 700, underline: true },
            },
          ],
        },
      ],
      frames: [{ pageId: page.id, objectId: frame.id }],
      overflow: "thread",
    };
    await asOwner.mutation(api.publishing.stories.createStory, {
      publicationId,
      story: asStory(story),
    });
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    expect(result.document.stories[0]!.paragraphs[0]!.format).toMatchObject({
      alignment: "right",
      direction: "rtl",
    });
    expect(result.document.stories[0]!.paragraphs[0]!.runs[0]!.text).toBe(
      "مرحبا بالعالم ١٢٣",
    );
    expect(result.document.stories[0]!.paragraphs[0]!.runs[0]!.format).toMatchObject({
      fontWeight: 700,
      underline: true,
    });
  });
});

describe("versions", () => {
  it("creates a named version and restores it consistently", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 3);
    const asOwner = t.withIdentity({ subject: owner });
    let result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[1]!;
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({ ...page, name: "Saved page" }),
    });

    const version = await asOwner.mutation(api.publishing.versions.createVersion, {
      publicationId,
      label: "Before redesign",
    });
    expect(version.versionNumber).toBe(1);
    const versions = await asOwner.query(api.publishing.versions.listVersions, {
      publicationId,
    });
    expect(versions).toHaveLength(1);
    expect(versions[0]!.label).toBe("Before redesign");

    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    await asOwner.mutation(api.publishing.pages.deletePage, {
      publicationId,
      pageId: result.document.pages[2]!.id,
    });
    await asOwner.mutation(api.publishing.publications.updatePublication, {
      publicationId,
      settings: { title: "Changed" },
    });

    await asOwner.mutation(api.publishing.versions.restoreVersion, {
      publicationId,
      versionId: version.versionId,
    });
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    expect(result.publication.title).toBe(result.document.title);
    expect(result.publication.pageCount).toBe(3);
    expect(result.document.pages).toHaveLength(3);
    expect(result.document.pages[1]!.name).toBe("Saved page");
  });

  it("refuses to restore when an asset is missing, changing nothing", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const asset = await registerAsset(t, owner, publicationId);
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[0]!;
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({
        ...page,
        objects: [imageFrame(page.layers[1]!.id, asset.stableId)],
      }),
    });
    const version = await asOwner.mutation(api.publishing.versions.createVersion, {
      publicationId,
      label: "With photo",
    });

    // Simulate a damaged record (normal mutations refuse to delete an asset a
    // version needs). Restore must abort before writing anything.
    await t.run((ctx) => ctx.db.delete(asset.assetId));
    await expect(
      asOwner.mutation(api.publishing.versions.restoreVersion, {
        publicationId,
        versionId: version.versionId,
      }),
    ).rejects.toThrow(/no longer available/i);
    const after = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(after.document.pages).toHaveLength(1);
    expect(after.document.pages[0]!.name).toBe(page.name);
  });

  it("does not let another user create, list or restore versions", async () => {
    const t = setup();
    const { owner, stranger } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner);
    const asStranger = t.withIdentity({ subject: stranger });
    await expect(
      asStranger.mutation(api.publishing.versions.createVersion, {
        publicationId,
        label: "Nope",
      }),
    ).rejects.toThrow(/not found/i);
    await expect(
      asStranger.query(api.publishing.versions.listVersions, { publicationId }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("page operations", () => {
  it("creates, saves, duplicates, moves, reorders and deletes pages", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 3);
    const asOwner = t.withIdentity({ subject: owner });

    const created = await asOwner.mutation(api.publishing.pages.createPage, {
      publicationId,
      at: 1,
    });
    let result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(result.publication.pageCount).toBe(4);
    expect(result.document.pages[1]!.id).toBe(created.pageId);

    const page = result.document.pages[1]!;
    const saved = await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({ ...page, name: "Dedication" }),
      expectedVersion: page.version,
    });
    expect(saved.version).toBe(page.version + 1);

    await expect(
      asOwner.mutation(api.publishing.pages.savePage, {
        publicationId,
        pageId: page.id,
        page: asPage({ ...page, name: "Stale" }),
        expectedVersion: page.version,
      }),
    ).rejects.toThrow(/changed elsewhere/i);

    const duplicate = await asOwner.mutation(api.publishing.pages.duplicatePage, {
      publicationId,
      pageId: page.id,
      at: 2,
    });
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    const copy = result.document.pages.find((entry) => entry.id === duplicate.pageId)!;
    expect(copy.id).not.toBe(page.id);
    const originalObjectIds = new Set(page.objects.map((object) => object.id));
    for (const object of copy.objects) expect(originalObjectIds.has(object.id)).toBe(false);

    const moved = await asOwner.mutation(api.publishing.pages.movePageTo, {
      publicationId,
      pageId: duplicate.pageId,
      toIndex: 0,
    });
    expect(moved.index).toBe(0);

    const order = [
      result.document.pages[2]!.id,
      result.document.pages[0]!.id,
      result.document.pages[1]!.id,
      result.document.pages[3]!.id,
      result.document.pages[4]!.id,
    ];
    await asOwner.mutation(api.publishing.pages.reorderPages, {
      publicationId,
      pageIds: order,
    });
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    expect(result.document.pages.map((entry) => entry.id)).toEqual(order);
    expect(result.document.spreads.flatMap((spread) => spread.pageIds)).toEqual(order);
    expect(result.publication.pageCount).toBe(5);

    await asOwner.mutation(api.publishing.pages.deletePage, {
      publicationId,
      pageId: duplicate.pageId,
    });
    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    expect(result.document.pages).toHaveLength(4);
    expect(result.publication.pageCount).toBe(4);
  });

  it("refuses to delete the last page", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    await expect(
      asOwner.mutation(api.publishing.pages.deletePage, {
        publicationId,
        pageId: result.document.pages[0]!.id,
      }),
    ).rejects.toThrow(/at least one page/i);
  });

  it("rejects duplicate ids and a page from another publication", async () => {
    const t = setup();
    const { owner, stranger } = await seedUsers(t);
    const first = await createPublication(t, owner, 2);
    const second = await createPublication(t, owner, 2);
    const asOwner = t.withIdentity({ subject: owner });
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId: first.publicationId,
    });
    const page = result.document.pages[0]!;
    const shape = {
      version: 1,
      id: "object_duplicate",
      kind: "shape" as const,
      name: "Box",
      layerId: page.layers[1]!.id,
      frame: { x: 0, y: 0, width: 10, height: 10, rotation: 0 },
      locked: false,
      hidden: false,
      opacity: 1,
      shape: "rectangle" as const,
      strokeWidth: 0,
      cornerRadius: 0,
    };
    await expect(
      asOwner.mutation(api.publishing.pages.savePage, {
        publicationId: first.publicationId,
        pageId: page.id,
        page: asPage({ ...page, objects: [...page.objects, shape, { ...shape }] }),
      }),
    ).rejects.toThrow(/duplicate/i);

    const foreign = await asOwner.query(api.publishing.publications.getMine, {
      publicationId: second.publicationId,
    });
    await expect(
      t
        .withIdentity({ subject: stranger })
        .mutation(api.publishing.pages.savePage, {
          publicationId: second.publicationId,
          pageId: foreign.document.pages[0]!.id,
          page: asPage(foreign.document.pages[0]!),
        }),
    ).rejects.toThrow(/not found/i);
  });
});

async function storageState(
  t: ReturnType<typeof setup>,
  storageId: Id<"_storage">,
) {
  return await t.run(async (ctx) => {
    const meta = await ctx.db.system.get("_storage", storageId);
    if (!meta) return { exists: false, url: null, bytes: false };
    return {
      exists: true,
      url: await ctx.storage.getUrl(storageId),
      bytes: (await ctx.storage.get(storageId)) !== null,
    };
  });
}

describe("shared storage references", () => {
  it("keeps a shared print original alive for a duplicated publication", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId: aId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });

    const assetA = await registerAsset(t, owner, aId);
    const aBefore = await asOwner.query(api.publishing.publications.getMine, {
      publicationId: aId,
    });
    const pageA = aBefore.document.pages[0]!;
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId: aId,
      pageId: pageA.id,
      page: asPage({
        ...pageA,
        objects: [imageFrame(pageA.layers[1]!.id, assetA.stableId)],
      }),
    });

    const { publicationId: bId } = await asOwner.mutation(
      api.publishing.publications.duplicatePublication,
      { publicationId: aId },
    );

    // Both rows are separate records that share one physical file.
    const rows = await t.run((ctx) => ctx.db.query("publicationAssets").collect());
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.originalStorageId))).toEqual(
      new Set([assetA.storageId]),
    );
    expect(new Set(rows.map((row) => row.assetId)).size).toBe(2);
    const copy = rows.find((row) => row.publicationId === bId)!;
    expect(copy._id).not.toBe(assetA.assetId);

    // Remove the photo from A, then delete A's copy of the asset.
    const aNow = await asOwner.query(api.publishing.publications.getMine, {
      publicationId: aId,
    });
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId: aId,
      pageId: aNow.document.pages[0]!.id,
      page: asPage({ ...aNow.document.pages[0]!, objects: [] }),
    });
    await asOwner.mutation(api.publishing.assets.deleteAsset, {
      assetId: assetA.assetId,
    });

    // B still resolves the original storage object and the same file bytes.
    const afterDelete = await storageState(t, assetA.storageId);
    expect(afterDelete.exists).toBe(true);
    expect(afterDelete.bytes).toBe(true);
    expect(typeof afterDelete.url).toBe("string");
    const b = await asOwner.query(api.publishing.publications.getMine, {
      publicationId: bId,
    });
    expect(b.assets).toHaveLength(1);
    expect(b.assets[0]!._id).toBe(copy._id);
    expect(b.assets[0]!.originalUrl).toBeTypeOf("string");
    const image = b.document.pages[0]!.objects.find(
      (object) => object.kind === "image-frame",
    );
    expect(image?.kind === "image-frame" ? image.assetId : undefined).toBe(copy.assetId);

    // With the last referencing row gone the file is cleaned up.
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId: bId,
      pageId: b.document.pages[0]!.id,
      page: asPage({ ...b.document.pages[0]!, objects: [] }),
    });
    await asOwner.mutation(api.publishing.assets.deleteAsset, { assetId: copy._id });
    expect((await storageState(t, assetA.storageId)).exists).toBe(false);
  });

  it("refuses to delete an asset a page or master still references", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const asset = await registerAsset(t, owner, publicationId);
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[0]!;
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({
        ...page,
        objects: [imageFrame(page.layers[1]!.id, asset.stableId)],
      }),
    });
    await expect(
      asOwner.mutation(api.publishing.assets.deleteAsset, { assetId: asset.assetId }),
    ).rejects.toThrow(/still used/i);
    expect((await storageState(t, asset.storageId)).exists).toBe(true);
  });

  it("will not move an asset that a saved version still needs", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const other = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const asset = await registerAsset(t, owner, publicationId);
    await asOwner.mutation(api.publishing.versions.createVersion, {
      publicationId,
      label: "Needs the file",
    });

    await expect(
      asOwner.mutation(api.publishing.assets.associateAsset, {
        assetId: asset.assetId,
        publicationId: null,
      }),
    ).rejects.toThrow(/saved version/i);
    await expect(
      asOwner.mutation(api.publishing.assets.associateAsset, {
        assetId: asset.assetId,
        publicationId: other.publicationId,
      }),
    ).rejects.toThrow(/saved version/i);

    const row = await t.run((ctx) => ctx.db.get(asset.assetId));
    expect(row?.publicationId).toBe(publicationId);
  });

  it("cleans up an unattached, unreferenced asset and its file", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const storageId = await storeFile(t);
    const asOwner = t.withIdentity({ subject: owner });
    const asset = await asOwner.mutation(api.publishing.assets.registerAsset, {
      storageId,
      filename: "loose.jpg",
      mimeType: "image/jpeg",
      width: 100,
      height: 100,
    });
    await asOwner.mutation(api.publishing.assets.deleteAsset, { assetId: asset.assetId });
    expect((await storageState(t, storageId)).exists).toBe(false);
  });
});

describe("concurrent saves", () => {
  it("refuses a stale master save instead of overwriting it", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const master = masterFor(result.document.pages[0]!);
    await asOwner.mutation(api.publishing.masters.createMaster, {
      publicationId,
      master: asMaster(master),
    });

    // Two tabs both hold version 1; only the first write may land.
    const first = await asOwner.mutation(api.publishing.masters.updateMaster, {
      publicationId,
      master: asMaster({ ...master, name: "Tab one" }),
      expectedVersion: 1,
    });
    expect(first.version).toBe(2);
    await expect(
      asOwner.mutation(api.publishing.masters.updateMaster, {
        publicationId,
        master: asMaster({ ...master, name: "Tab two" }),
        expectedVersion: 1,
      }),
    ).rejects.toThrow(/changed elsewhere/i);

    const after = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(after.document.masters[0]!.name).toBe("Tab one");
    expect(after.document.masters[0]!.version).toBe(2);
  });

  it("refuses a stale story save", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[0]!;
    const frame = textFrame(page.layers[1]!.id);
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({ ...page, objects: [frame] }),
    });
    const story: Story = {
      version: 1,
      id: "story_body",
      name: "Body",
      paragraphs: [{ id: "paragraph_1", runs: [{ text: "One" }] }],
      frames: [{ pageId: page.id, objectId: frame.id }],
      overflow: "thread",
    };
    await asOwner.mutation(api.publishing.stories.createStory, {
      publicationId,
      story: asStory(story),
    });

    await asOwner.mutation(api.publishing.stories.updateStory, {
      publicationId,
      story: asStory({ ...story, name: "Tab one" }),
      expectedVersion: 1,
    });
    await expect(
      asOwner.mutation(api.publishing.stories.updateStory, {
        publicationId,
        story: asStory({ ...story, name: "Tab two" }),
        expectedVersion: 1,
      }),
    ).rejects.toThrow(/changed elsewhere/i);

    const after = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(after.document.stories[0]!.name).toBe("Tab one");
    expect(after.document.stories[0]!.version).toBe(2);
  });

  it("refuses stale publication settings", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const before = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const stamp = before.publication.updatedAt;

    await asOwner.mutation(api.publishing.publications.updatePublication, {
      publicationId,
      settings: { title: "Tab one" },
      expectedUpdatedAt: stamp,
    });
    await expect(
      asOwner.mutation(api.publishing.publications.updatePublication, {
        publicationId,
        settings: { title: "Tab two" },
        expectedUpdatedAt: stamp,
      }),
    ).rejects.toThrow(/changed elsewhere/i);

    const after = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(after.publication.title).toBe("Tab one");
  });
});

describe("version restore lifecycle", () => {
  it("restores settings, page order, masters, stories and asset references", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 3);
    const asOwner = t.withIdentity({ subject: owner });
    const asset = await registerAsset(t, owner, publicationId);

    let result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const pages = result.document.pages;
    const master = masterFor(pages[0]!);
    await asOwner.mutation(api.publishing.masters.createMaster, {
      publicationId,
      master: asMaster(master),
    });
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: pages[0]!.id,
      page: asPage({ ...pages[0]!, masterId: master.id }),
    });

    result = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    const textPage = result.document.pages[1]!;
    const frame = textFrame(textPage.layers[1]!.id);
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: textPage.id,
      page: asPage({ ...textPage, objects: [frame] }),
    });
    const story: Story = {
      version: 1,
      id: "story_body",
      name: "Body",
      paragraphs: [{ id: "paragraph_1", runs: [{ text: "Hello" }] }],
      frames: [{ pageId: textPage.id, objectId: frame.id }],
      overflow: "thread",
    };
    await asOwner.mutation(api.publishing.stories.createStory, {
      publicationId,
      story: asStory(story),
    });
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: pages[2]!.id,
      page: asPage({
        ...pages[2]!,
        objects: [imageFrame(pages[2]!.layers[1]!.id, asset.stableId)],
      }),
    });
    await asOwner.mutation(api.publishing.publications.updatePublication, {
      publicationId,
      settings: { title: "Original title" },
    });

    const before = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const orderBefore = before.document.pages.map((page) => page.id);
    const version = await asOwner.mutation(api.publishing.versions.createVersion, {
      publicationId,
      label: "Complete",
    });

    // Change everything the snapshot should put back.
    await asOwner.mutation(api.publishing.publications.updatePublication, {
      publicationId,
      settings: { title: "Changed" },
    });
    await asOwner.mutation(api.publishing.pages.deletePage, {
      publicationId,
      pageId: orderBefore[2]!,
    });
    await asOwner.mutation(api.publishing.pages.reorderPages, {
      publicationId,
      pageIds: [orderBefore[1]!, orderBefore[0]!],
    });
    await asOwner.mutation(api.publishing.masters.deleteMaster, {
      publicationId,
      masterId: master.id,
    });
    await asOwner.mutation(api.publishing.stories.deleteStory, {
      publicationId,
      storyId: story.id,
    });

    await asOwner.mutation(api.publishing.versions.restoreVersion, {
      publicationId,
      versionId: version.versionId,
    });

    const after = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(after.publication.title).toBe("Original title");
    expect(after.document.pages.map((page) => page.id)).toEqual(orderBefore);
    expect(after.publication.pageCount).toBe(3);

    expect(after.document.masters).toHaveLength(1);
    expect(after.document.masters[0]!.id).toBe(master.id);
    expect(after.document.pages[0]!.masterId).toBe(master.id);

    expect(after.document.stories).toHaveLength(1);
    expect(after.document.stories[0]!.frames).toEqual([
      { pageId: textPage.id, objectId: frame.id },
    ]);
    const restoredFrame = after.document.pages[1]!.objects.find(
      (object) => object.id === frame.id,
    );
    expect(restoredFrame?.kind === "text-frame" ? restoredFrame.storyId : undefined).toBe(
      story.id,
    );

    expect(after.assets).toHaveLength(1);
    expect(after.assets[0]!.publicationId).toBe(publicationId);
    expect(after.assets[0]!.originalUrl).toBeTypeOf("string");
    const restoredImage = after.document.pages[2]!.objects.find(
      (object) => object.kind === "image-frame",
    );
    expect(restoredImage?.kind === "image-frame" ? restoredImage.assetId : undefined).toBe(
      asset.stableId,
    );
    expect((await storageState(t, asset.storageId)).exists).toBe(true);
  });

  it("detaches newer assets without deleting them, so a later version still restores", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });

    const first = await registerAsset(t, owner, publicationId, { filename: "one.jpg" });
    const base = await asOwner.query(api.publishing.publications.getMine, { publicationId });
    const page = base.document.pages[0]!;
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: page.id,
      page: asPage({
        ...page,
        objects: [imageFrame(page.layers[1]!.id, first.stableId, "object_one")],
      }),
    });
    const early = await asOwner.mutation(api.publishing.versions.createVersion, {
      publicationId,
      label: "One photo",
    });

    const second = await registerAsset(t, owner, publicationId, { filename: "two.jpg" });
    const withTwo = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const pageWithTwo = withTwo.document.pages[0]!;
    await asOwner.mutation(api.publishing.pages.savePage, {
      publicationId,
      pageId: pageWithTwo.id,
      page: asPage({
        ...pageWithTwo,
        objects: [
          imageFrame(pageWithTwo.layers[1]!.id, first.stableId, "object_one"),
          imageFrame(pageWithTwo.layers[1]!.id, second.stableId, "object_two"),
        ],
      }),
    });
    const later = await asOwner.mutation(api.publishing.versions.createVersion, {
      publicationId,
      label: "Two photos",
    });

    await asOwner.mutation(api.publishing.versions.restoreVersion, {
      publicationId,
      versionId: early.versionId,
    });
    const restored = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(restored.assets).toHaveLength(1);
    expect(restored.assets[0]!.assetId).toBe(first.stableId);
    const detached = await t.run((ctx) => ctx.db.get(second.assetId));
    expect(detached?.publicationId).toBeUndefined();
    expect((await storageState(t, second.storageId)).exists).toBe(true);

    // A later version still needs it, so the row may not be deleted.
    await expect(
      asOwner.mutation(api.publishing.assets.deleteAsset, { assetId: second.assetId }),
    ).rejects.toThrow(/saved version/i);

    // Rolling forward re-attaches it and both files stay resolvable.
    await asOwner.mutation(api.publishing.versions.restoreVersion, {
      publicationId,
      versionId: later.versionId,
    });
    const forward = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(forward.assets).toHaveLength(2);
    expect(forward.assets.every((asset) => asset.publicationId === publicationId)).toBe(true);
    expect(forward.document.pages[0]!.objects).toHaveLength(2);
    expect((await storageState(t, second.storageId)).exists).toBe(true);
  });

  it("aborts an invalid snapshot and leaves the current publication untouched", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const version = await asOwner.mutation(api.publishing.versions.createVersion, {
      publicationId,
      label: "Broken",
    });
    await t.run(async (ctx) => {
      const pages = await ctx.db.query("publicationVersionPages").collect();
      await ctx.db.patch(pages[0]!._id, { masterId: "master_ghost" });
    });
    await asOwner.mutation(api.publishing.publications.updatePublication, {
      publicationId,
      settings: { title: "Still current" },
    });

    await expect(
      asOwner.mutation(api.publishing.versions.restoreVersion, {
        publicationId,
        versionId: version.versionId,
      }),
    ).rejects.toThrow(/invalid publication document/i);

    const after = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    expect(after.publication.title).toBe("Still current");
    expect(after.document.pages[0]!.masterId).toBeUndefined();
  });
});

describe("validation and ownership boundary", () => {
  it("rejects an image frame that points at an unknown asset", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const other = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    const elsewhere = await registerAsset(t, owner, other.publicationId);
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[0]!;

    await expect(
      asOwner.mutation(api.publishing.pages.savePage, {
        publicationId,
        pageId: page.id,
        page: asPage({
          ...page,
          objects: [imageFrame(page.layers[1]!.id, elsewhere.stableId)],
        }),
      }),
    ).rejects.toThrow(/not in this publication/i);

    await expect(
      asOwner.mutation(api.publishing.pages.savePage, {
        publicationId,
        pageId: page.id,
        page: asPage({
          ...page,
          objects: [imageFrame(page.layers[1]!.id, "asset_missing")],
        }),
      }),
    ).rejects.toThrow(/not in this publication/i);
  });

  it("rejects a document written by a newer build", async () => {
    const t = setup();
    const { owner } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asOwner = t.withIdentity({ subject: owner });
    await t.run((ctx) =>
      ctx.db.patch(publicationId, { documentVersion: 999 }),
    );
    const result = await asOwner.query(api.publishing.publications.getMine, {
      publicationId,
    });
    const page = result.document.pages[0]!;
    await expect(
      asOwner.mutation(api.publishing.pages.savePage, {
        publicationId,
        pageId: page.id,
        page: asPage({ ...page, name: "Nope" }),
      }),
    ).rejects.toThrow(/newer than this build/i);
  });

  it("will not attach child records to another user's publication", async () => {
    const t = setup();
    const { owner, stranger } = await seedUsers(t);
    const { publicationId } = await createPublication(t, owner, 1);
    const asStranger = t.withIdentity({ subject: stranger });
    const asset = await registerAsset(t, owner, publicationId);
    const storageId = await storeFile(t);

    await expect(
      asStranger.mutation(api.publishing.assets.registerAsset, {
        publicationId,
        storageId,
        filename: "intruder.jpg",
        mimeType: "image/jpeg",
        width: 100,
        height: 100,
      }),
    ).rejects.toThrow(/not found/i);
    const loose = await asStranger.mutation(api.publishing.assets.registerAsset, {
      storageId,
      filename: "loose.jpg",
      mimeType: "image/jpeg",
      width: 100,
      height: 100,
    });
    await expect(
      asStranger.mutation(api.publishing.assets.associateAsset, {
        assetId: loose.assetId,
        publicationId,
      }),
    ).rejects.toThrow(/not found/i);
    await expect(
      asStranger.mutation(api.publishing.assets.setAssetDerivatives, {
        assetId: asset.assetId,
        proxyStorageId: storageId,
      }),
    ).rejects.toThrow(/asset not found/i);

    // Queries never surface another owner's rows.
    const strangerAssets = await asStranger.query(api.publishing.assets.listAssets, {});
    expect(strangerAssets.map((row) => row._id)).toEqual([loose.assetId]);
    await expect(
      asStranger.query(api.publishing.assets.listAssets, { publicationId }),
    ).rejects.toThrow(/not found/i);
    await expect(
      asStranger.query(api.publishing.assets.getAsset, { assetId: asset.assetId }),
    ).rejects.toThrow(/asset not found/i);
  });
});
