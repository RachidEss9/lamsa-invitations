import { describe, expect, it } from "vitest";
import {
  FRAMES,
  FRAME_GROUPS,
  frameBounds,
  frameById,
  framesInGroup,
  type FrameSpec,
} from "./frames";
import { duplicateElements, makeElement, normalizeDesign } from "./design";

function pathsOf(frame: FrameSpec): string[] {
  return [...frame.outline, ...(frame.corner?.art ?? [])];
}

describe("frame collection", () => {
  it("has a varied, non-empty collection", () => {
    expect(FRAMES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(FRAMES.map((frame) => frame.id)).size).toBe(FRAMES.length);
    expect(new Set(FRAMES.map((frame) => frame.name)).size).toBe(FRAMES.length);
  });

  it("covers every advertised group", () => {
    for (const group of FRAME_GROUPS) {
      expect(framesInGroup(group).length).toBeGreaterThan(0);
    }
  });

  it("draws only vector paths, all of them absolute", () => {
    for (const frame of FRAMES) {
      expect(frame.outline.length).toBeGreaterThan(0);
      for (const d of pathsOf(frame)) {
        expect(d.trim().startsWith("M")).toBe(true);
        expect(d.length).toBeGreaterThan(8);
      }
    }
  });

  it("keeps corner ornaments inside a usable size range", () => {
    for (const frame of FRAMES) {
      if (!frame.corner) continue;
      expect(frame.corner.size).toBeGreaterThanOrEqual(4);
      expect(frame.corner.size).toBeLessThanOrEqual(40);
      expect(frame.corner.art.length).toBeGreaterThan(0);
    }
  });

  it("looks a frame up by id and ignores unknown ids", () => {
    const first = FRAMES[0];
    expect(frameById(first.id)?.name).toBe(first.name);
    expect(frameById("no-such-frame")).toBeUndefined();
    expect(frameById(undefined)).toBeUndefined();
    expect(frameById("")).toBeUndefined();
  });
});

describe("frame elements", () => {
  it("stores frame artwork on an ordinary shape layer", () => {
    const element = makeElement("shape", {
      name: "Botanica",
      shape: "frame",
      frameArt: "botanica",
      w: 800,
      h: 1200,
    });
    expect(element.kind).toBe("shape");
    expect(element.frameArt).toBe("botanica");
  });

  it("survives saving and reopening as JSON", () => {
    const element = makeElement("shape", { frameArt: "baroque" });
    const roundTrip = JSON.parse(JSON.stringify({ elements: [element] })) as {
      elements: { frameArt?: string }[];
    };
    expect(roundTrip.elements[0].frameArt).toBe("baroque");
  });

  it("is duplicated with its frame artwork intact", () => {
    const element = makeElement("shape", { frameArt: "moorish-tile" });
    const copies = duplicateElements([element], [element.id]);
    expect(copies).toHaveLength(2);
    expect(copies[1].frameArt).toBe("moorish-tile");
    expect(copies[1].id).not.toBe(element.id);
  });

  it("keeps existing invitations without frames unchanged", () => {
    const content = {
      templateId: "the-vow",
      names: "Alexandra & Omar",
      date: "2027-05-01T16:00:00.000Z",
      venueName: "Riad",
      venueAddress: "Marrakech",
      message: "Join us",
      rsvpDeadline: "2027-04-01",
      palette: {
        background: "#f2f1ed",
        ink: "#161616",
        accent: "#710014",
      },
      fontPair: "cormorant-garamond",
      language: "en" as const,
    };
    const legacy = {
      pages: [
        {
          id: "page-1",
          name: "Page 1",
          background: "#f2f1ed",
          elements: [
            {
              id: "shape-1",
              kind: "shape" as const,
              name: "Keyline",
              x: 40,
              y: 40,
              w: 900,
              h: 1200,
              rotation: 0,
              opacity: 1,
              locked: false,
              hidden: false,
              shape: "frame" as const,
              stroke: "#710014",
              strokeWidth: 1.5,
              animation: {
                enabled: false,
                preset: "fade" as const,
                trigger: "load" as const,
                delay: 0,
                duration: 800,
                easing: "easeOut" as const,
              },
            },
          ],
        },
      ],
    };
    const design = normalizeDesign(legacy, content as never);
    expect(design.pages[0].elements[0].frameArt).toBeUndefined();
    expect(design.pages[0].elements[0].shape).toBe("frame");
  });
});

describe("newly added frames", () => {
  it("sits inset from the trim on a portrait page", () => {
    const bounds = frameBounds({ width: 1050, height: 1500 });
    expect(bounds.x).toBe(58);
    expect(bounds.y).toBe(58);
    expect(bounds.x + bounds.w).toBe(1050 - 58);
    expect(bounds.y + bounds.h).toBe(1500 - 58);
  });

  it("uses the short edge for the inset on landscape and square pages", () => {
    const landscape = frameBounds({ width: 1500, height: 1050 });
    expect(landscape.x).toBe(58);
    expect(landscape.w).toBe(1500 - 116);
    expect(landscape.h).toBe(1050 - 116);

    const square = frameBounds({ width: 800, height: 800 });
    expect(square.x).toBe(44);
    expect(square.w).toBe(800 - 88);
    expect(square.h).toBe(800 - 88);
  });

  it("never leaves the page or collapses to nothing on tiny documents", () => {
    for (const page of [
      { width: 20, height: 20 },
      { width: 1, height: 1 },
      { width: 60, height: 30 },
    ]) {
      const bounds = frameBounds(page);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.w).toBeGreaterThan(0);
      expect(bounds.h).toBeGreaterThan(0);
      expect(bounds.x + bounds.w).toBeLessThanOrEqual(page.width);
      expect(bounds.y + bounds.h).toBeLessThanOrEqual(page.height);
    }
  });

  it("persists a frame layer through save, reopen, and duplication", () => {
    const frame = FRAMES[0];
    const bounds = frameBounds({ width: 1050, height: 1500 });
    const element = makeElement("shape", {
      name: frame.name,
      shape: "frame",
      frameArt: frame.id,
      ...bounds,
      fill: "transparent",
      stroke: "#710014",
      strokeWidth: 2,
    });
    const design = normalizeDesign(
      {
        pages: [
          {
            id: "page-1",
            name: "Page 1",
            background: "#f2f1ed",
            elements: [element],
          },
        ],
      },
      {
        templateId: "the-vow",
        names: "Alexandra & Omar",
        date: "2027-05-01T16:00:00.000Z",
        venueName: "Riad",
        venueAddress: "Marrakech",
        message: "Join us",
        rsvpDeadline: "2027-04-01",
        palette: {
          background: "#f2f1ed",
          ink: "#161616",
          accent: "#710014",
        },
        fontPair: "cormorant-garamond",
        language: "en" as const,
      } as never,
    );
    const saved = design.pages[0].elements[0];
    expect(saved.frameArt).toBe(frame.id);
    expect(saved.shape).toBe("frame");
    expect(saved.w).toBe(bounds.w);

    const copies = duplicateElements([saved], [saved.id]);
    expect(copies).toHaveLength(2);
    expect(copies.every((copy) => copy.frameArt === frame.id)).toBe(true);
    expect(copies[1].id).not.toBe(saved.id);
  });
});
