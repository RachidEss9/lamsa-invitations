import { describe, it, expect } from "vitest";
import {
  PAGE_EDGES,
  designValueFromInput,
  elementStyleAt,
  formatDesignValue,
  isDesignDocument,
  normalizeDesign,
  pageDimensionsLabel,
  pageEdgeClipPath,
  pageFitScale,
  placeOnPage,
  rulerTicksFor,
  toDesignPx,
  type DesignDocument,
} from "./design";
import type { InvitationContent } from "./invitation";
import { curveIsActive } from "./text-path";

const content: InvitationContent = {
  title: "Amelia & Søren",
  occasion: "wedding",
  templateId: "published",
  names: { primary: "Amelia", secondary: "Søren" },
  eyebrow: "",
  message: "",
  date: "2026-06-14",
  time: "16:00",
  venueName: "The Garden Hall",
  venueAddress: "1 Main Street",
  palette: { background: "#f2f1ed", ink: "#161616", accent: "#710014" },
  fontPair: "romance",
  layout: "centered",
  motif: "sprig",
  animations: true,
};

/** A document as an older client might have stored it: missing fields. */
const legacy = {
  pages: [
    {
      id: "",
      name: "",
      background: "",
      elements: [
        {
          id: "t1",
          kind: "text",
          name: "Names",
          text: "Someone",
          // Corrupt trigger: the union only allows "load" | "scroll".
          animation: { trigger: "sideways" },
          reveal: {
            targetId: "t1",
            effect: "fadeAway",
            direction: "up",
            trigger: "tap",
          },
        },
        {
          id: "s1",
          kind: "shape",
          animation: { trigger: "scroll" },
        },
      ],
    },
  ],
  opening: { experience: "none", autoOpen: false, welcome: "" },
  closing: { enabled: false, style: "message", message: "" },
  transition: { preset: "fade", duration: 700 },
};

describe("normalizeDesign save/reload consistency", () => {
  it("is idempotent: normalising a normalised document changes nothing", () => {
    const initial = normalizeDesign(undefined, content);
    const firstPass = normalizeDesign(initial, content);
    const secondPass = normalizeDesign(firstPass, content);
    expect(secondPass).toEqual(firstPass);
  });

  it("survives a storage round-trip (JSON serialisation) unchanged", () => {
    const saved = normalizeDesign(legacy, content);
    const stored = JSON.parse(JSON.stringify(saved));
    const reloaded = normalizeDesign(stored, content);
    expect(reloaded).toEqual(saved);
  });

  it("keeps element ids stable across repeated normalisation", () => {
    const once = normalizeDesign(legacy, content);
    const ids = once.pages.flatMap((page) => page.elements.map((el) => el.id));
    expect(new Set(ids).size).toBe(ids.length);
    const twice = normalizeDesign(JSON.parse(JSON.stringify(once)), content);
    expect(twice.pages[0].elements.map((el) => el.id)).toEqual(
      once.pages[0].elements.map((el) => el.id),
    );
  });

  it("backfills a missing reveal interaction id exactly once", () => {
    const once = normalizeDesign(legacy, content);
    const firstId = once.pages[0].elements.find((el) => el.id === "t1")?.reveal
      ?.interactionId;
    expect(firstId).toBeTruthy();
    const twice = normalizeDesign(once, content);
    expect(twice.pages[0].elements.find((el) => el.id === "t1")?.reveal?.interactionId).toBe(
      firstId,
    );
  });

  it("repairs corrupt pages and elements without dropping content", () => {
    const out = normalizeDesign(legacy, content);
    const page = out.pages[0];
    expect(page.id).toBeTruthy();
    expect(page.name).toBeTruthy();
    expect(page.background).toBe(content.palette.background);

    const text = page.elements.find((el) => el.id === "t1")!;
    expect(text.text).toBe("Someone");
    expect(text.animation.trigger).toBe("load");
    expect(text.animation.enabled).toBe(true);
    expect(text.reveal?.duration).toBe(900);
    expect(text.reveal?.trigger).toBe("tap");

    const shape = page.elements.find((el) => el.id === "s1")!;
    expect(shape.animation.trigger).toBe("scroll");
  });

  it("never yields an empty document, even for corrupt input", () => {
    const junk: unknown[] = [null, undefined, "text", 42, {}, { pages: [] }, { pages: [{}] }];
    for (const value of junk) {
      const out = normalizeDesign(value, content);
      expect(out.pages.length).toBeGreaterThan(0);
      expect(Array.isArray(out.pages[0].elements)).toBe(true);
    }
  });

  it("isDesignDocument accepts real documents and rejects corrupt shapes", () => {
    expect(isDesignDocument(normalizeDesign(undefined, content))).toBe(true);
    expect(isDesignDocument(legacy)).toBe(true);
    expect(isDesignDocument(null)).toBe(false);
    expect(isDesignDocument({})).toBe(false);
    expect(isDesignDocument({ pages: [] })).toBe(false);
    expect(isDesignDocument({ pages: [{ elements: "no" }] })).toBe(false);
  });

  it("keeps layer flips through save and reload and mirrors them when drawn", () => {
    const saved = normalizeDesign(
      { pages: [{ elements: [{ id: "s1", kind: "shape", flipX: true, flipY: true }] }] },
      content,
    );
    const reloaded = normalizeDesign(JSON.parse(JSON.stringify(saved)), content);
    const shape = reloaded.pages[0].elements[0];
    expect(shape.flipX).toBe(true);
    expect(shape.flipY).toBe(true);

    const transform = String(elementStyleAt(shape, 100000).style.transform);
    expect(transform).toContain("scaleX(-1)");
    expect(transform).toContain("scaleY(-1)");

    const plain = elementStyleAt(
      { ...shape, flipX: undefined, flipY: undefined },
      100000,
    ).style.transform;
    expect(String(plain)).not.toContain("scaleX");
  });

  it("keeps editable layer effects through save and reload", () => {
    const saved = normalizeDesign(
      {
        pages: [
          {
            elements: [
              {
                id: "s1",
                kind: "shape",
                effects: {
                  shadow: {
                    enabled: true,
                    color: "#710014",
                    opacity: 0.35,
                    blur: 22,
                    distance: 8,
                    angle: 90,
                  },
                  gradient: {
                    enabled: true,
                    from: "#710014",
                    to: "#c3a469",
                    angle: 45,
                  },
                  outline: { enabled: true, color: "#ffffff", width: 2 },
                },
              },
            ],
          },
        ],
      },
      content,
    );
    const reloaded = normalizeDesign(JSON.parse(JSON.stringify(saved)), content);
    const effects = reloaded.pages[0].elements[0].effects;
    expect(effects?.shadow?.opacity).toBe(0.35);
    expect(effects?.shadow?.blur).toBe(22);
    expect(effects?.gradient?.angle).toBe(45);
    expect(effects?.outline?.width).toBe(2);
  });

  it("keeps a text curve through save and reload, and clamps a wild one", () => {
    const saved = normalizeDesign(
      {
        pages: [
          {
            elements: [
              { id: "t1", kind: "text", text: "Amelia", curve: 0.6 },
              { id: "t2", kind: "text", text: "Søren", curve: 9 },
              { id: "t3", kind: "text", text: "Hello" },
            ],
          },
        ],
      },
      content,
    );
    const reloaded = normalizeDesign(JSON.parse(JSON.stringify(saved)), content);
    expect(reloaded.pages[0].elements[0].curve).toBe(0.6);
    expect(reloaded.pages[0].elements[1].curve).toBe(1);
    // A document that never curved stays on the straight rendering path.
    expect(reloaded.pages[0].elements[2].curve).toBeUndefined();
    expect(curveIsActive(reloaded.pages[0].elements[2].curve)).toBe(false);
  });

  it("leaves older documents without effects, and drops corrupt ones", () => {
    const legacyDoc = normalizeDesign(
      { pages: [{ elements: [{ id: "t1", kind: "text", text: "Hello" }] }] },
      content,
    );
    expect(legacyDoc.pages[0].elements[0].effects).toBeUndefined();

    const corrupt = normalizeDesign(
      {
        pages: [
          {
            elements: [
              { id: "t2", kind: "text", text: "Hi", effects: "glow" },
              { id: "t3", kind: "text", text: "Hi", effects: { shadow: { blur: -4 } } },
            ],
          },
        ],
      },
      content,
    );
    expect(corrupt.pages[0].elements[0].effects).toBeUndefined();
    expect(corrupt.pages[0].elements[1].effects?.shadow?.blur).toBe(0);
  });

  it("normalised output matches the DesignDocument shape after JSON storage", () => {
    const saved: DesignDocument = normalizeDesign(undefined, content);
    const stored: DesignDocument = JSON.parse(JSON.stringify(saved));
    expect(stored.version).toBe(saved.version);
    expect(stored.pages).toEqual(saved.pages);
    expect(stored.opening).toEqual(saved.opening);
    expect(stored.closing).toEqual(saved.closing);
    expect(stored.transition).toEqual(saved.transition);
  });
});

describe("page cut edges", () => {
  const width = 1000;
  const height = 1333;

  it("leaves a plain rectangle unclipped", () => {
    expect(pageEdgeClipPath("straight", width, height)).toBeUndefined();
    expect(pageEdgeClipPath(undefined, width, height)).toBeUndefined();
  });

  it("draws every cut edge inside the page box, the same every time", () => {
    for (const edge of PAGE_EDGES) {
      if (edge.id === "straight") continue;
      const path = pageEdgeClipPath(edge.id, width, height);
      expect(path, edge.id).toBeTruthy();
      expect(path, edge.id).toMatch(/^M/);
      expect(path, edge.id).toMatch(/Z$/);
      // Deterministic: a saved invitation keeps the exact edge it was given.
      expect(pageEdgeClipPath(edge.id, width, height)).toBe(path);
      // Every coordinate sits in the sheet's own box — a cut never draws
      // outside the page it belongs to.
      const numbers = (path ?? "").match(/-?\d+(\.\d+)?/g) ?? [];
      const values = numbers.map(Number);
      const xs = values.filter((_, index) => index % 2 === 0);
      const ys = values.filter((_, index) => index % 2 === 1);
      expect(Math.min(...xs), edge.id).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs), edge.id).toBeLessThanOrEqual(width);
      expect(Math.min(...ys), edge.id).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys), edge.id).toBeLessThanOrEqual(height);
    }
  });

  it("keeps a saved edge and drops an unknown one", () => {
    const kept = normalizeDesign(
      { pages: [{ elements: [], edge: "deckle" }] },
      content,
    );
    expect(kept.pages[0].edge).toBe("deckle");

    const dropped = normalizeDesign(
      { pages: [{ elements: [], edge: "zigzag-of-doom" }] },
      content,
    );
    expect(dropped.pages[0].edge).toBeUndefined();
  });
});

describe("placeOnPage", () => {
  /* The classic coordinates every studio default is written in: a heading
     box centred on the 1000 × 1333 card. */
  const heading = { x: 140, y: 520, w: 720, h: 160 };

  it("is the identity on the classic studio card", () => {
    expect(pageFitScale({ width: 1000, height: 1333.33 })).toBe(1);
    expect(placeOnPage({ width: 1000, height: 1333.33 }, heading)).toEqual(
      heading,
    );
  });

  it("keeps a new layer fully on a millimetre-sized suite piece", () => {
    // The invitation piece is 127 × 178 mm, which is 480 × 672 design px —
    // the old defaults ran 380 px off its right edge.
    const page = { width: 480, height: 672 };
    const box = placeOnPage(page, heading);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.w).toBeLessThanOrEqual(page.width);
    expect(box.y + box.h).toBeLessThanOrEqual(page.height);
    // The box keeps its proportions rather than being squashed.
    expect(box.w / box.h).toBeCloseTo(heading.w / heading.h, 2);
    // A box centred on the classic card stays centred on a card of the same
    // proportions at any size.
    expect(box.x + box.w / 2).toBeCloseTo(page.width / 2, 1);
  });

  it("lands inside the trim on every page shape the studio offers", () => {
    const pages = [
      { width: 672, height: 480 }, // 7 × 5 in, landscape
      { width: 567, height: 567 }, // 150 mm square
      { width: 397, height: 559 }, // A6
      { width: 1080, height: 1920 }, // mobile story
      { width: 794, height: 189 }, // belly band strip
    ];
    for (const page of pages) {
      const box = placeOnPage(page, { x: 190, y: 470, w: 620, h: 420 });
      const label = `${page.width}×${page.height}`;
      expect(box.x, label).toBeGreaterThanOrEqual(0);
      expect(box.y, label).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w, label).toBeLessThanOrEqual(page.width);
      expect(box.y + box.h, label).toBeLessThanOrEqual(page.height);
    }
  });

  it("clamps a box authored outside the design space", () => {
    const page = { width: 480, height: 672 };
    const box = placeOnPage(page, { x: 900, y: 1300, w: 400, h: 400 });
    expect(box.x + box.w).toBeLessThanOrEqual(page.width);
    expect(box.y + box.h).toBeLessThanOrEqual(page.height);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
  });
});

describe("display units", () => {
  /* Every field reads a converted number and writes it back, so the round trip
     has to be exact: a workspace left open all evening must not creep a layer
     a pixel at a time. */
  it("reads and types every unit without walking the stored value", () => {
    for (const unit of ["mm", "cm", "in", "px"] as const) {
      for (const px of [8, 137, 480, 672, 1000]) {
        const back = designValueFromInput(formatDesignValue(px, unit), unit);
        expect(back, `${px}px shown as ${unit}`).toBe(px);
        // And doing it again changes nothing either.
        expect(designValueFromInput(formatDesignValue(back, unit), unit), unit).toBe(px);
      }
    }
  });

  it("keeps whole pixels whole and physical values to two decimals", () => {
    expect(formatDesignValue(137.6, "px")).toBe(138);
    expect(formatDesignValue(toDesignPx(25, "mm"), "mm")).toBe(25);
    expect(formatDesignValue(toDesignPx(12.5, "mm"), "mm")).toBe(12.5);
    expect(formatDesignValue(toDesignPx(5, "in"), "in")).toBe(5);
  });

  it("ticks the ruler in the display unit, labelling major ticks only", () => {
    // An A6 sheet measured in millimetres.
    const mm = rulerTicksFor(toDesignPx(105, "mm"), "mm");
    expect(mm[0]).toEqual({ value: 0, major: true, label: "0" });
    expect(mm[1].major).toBe(false);
    expect(mm[1].label).toBe("");
    expect(mm.filter((tick) => tick.major).map((tick) => tick.label)).toContain("100");
    // Ticks never run off the page they describe.
    expect(mm[mm.length - 1].value).toBeLessThanOrEqual(toDesignPx(105, "mm") + 0.01);

    // A 5 × 7 card measured in inches: quarter-inch ticks, half-inch labels.
    const inches = rulerTicksFor(toDesignPx(5, "in"), "in");
    const labels = inches.filter((tick) => tick.major).map((tick) => tick.label);
    expect(labels).toContain("0.5");
    expect(labels).toContain("5");

    // A pixel page stays in pixels.
    const pixels = rulerTicksFor(480, "px");
    expect(pixels.filter((tick) => tick.major).map((tick) => tick.label)).toContain("100");

    expect(rulerTicksFor(0, "mm")).toEqual([]);
  });

  it("reads a page's physical size, in its own orientation", () => {
    const portrait = {
      width: toDesignPx(105, "mm"),
      height: toDesignPx(148, "mm"),
    };
    expect(pageDimensionsLabel(portrait, "mm")).toBe("105 × 148 mm");
    // Landscape keeps its own order instead of being normalised to portrait.
    expect(pageDimensionsLabel({ width: portrait.height, height: portrait.width }, "mm")).toBe(
      "148 × 105 mm",
    );
    expect(pageDimensionsLabel({ width: toDesignPx(7, "in"), height: toDesignPx(5, "in") }, "in")).toBe(
      "7 × 5 in",
    );
    expect(pageDimensionsLabel({ width: 1000, height: 1333.33 }, "px")).toBe(
      "1000 × 1333 px",
    );
    // Absent pages fall back to the classic card rather than throwing.
    expect(pageDimensionsLabel(null, "mm")).toMatch(/mm$/);
  });
});
