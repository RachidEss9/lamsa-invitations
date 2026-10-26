import { describe, it, expect } from "vitest";
import {
  elementStyleAt,
  isDesignDocument,
  normalizeDesign,
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
  opening: {},
  closing: {},
  transition: {},
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
