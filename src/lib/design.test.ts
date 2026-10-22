import { describe, it, expect } from "vitest";
import { isDesignDocument, normalizeDesign, type DesignDocument } from "./design";
import type { InvitationContent } from "./invitation";

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
