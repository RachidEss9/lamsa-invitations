import { describe, it, expect } from "vitest";
import { normalizeDesign, type DesignDocument, type DesignElement } from "./design";
import { removeElements } from "./studio-edit";
import type { InvitationContent } from "./invitation";

const content: InvitationContent = {
  title: "Amelia & Søren",
  occasion: "wedding",
  templateId: "published",
  names: { primary: "Amelia", secondary: "Søren" },
  eyebrow: "Together with their families",
  message: "Join us",
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

function text(id: string, overrides: Partial<DesignElement> = {}): DesignElement {
  return {
    id,
    kind: "text",
    name: id,
    x: 100,
    y: 200,
    w: 700,
    h: 120,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    text: "A considered line",
    font: "great-vibes",
    fontSize: 64,
    color: "#710014",
    animation: {
      enabled: true,
      preset: "fadeUp",
      trigger: "load",
      delay: 200,
      duration: 900,
      easing: "easeOut",
    },
    ...overrides,
  } as DesignElement;
}

/** A design the host has already customised, as stored in Convex. */
function savedDesign(): DesignDocument {
  return {
    version: 1,
    pages: [
      {
        id: "page-cover",
        name: "Cover",
        background: "#f2f1ed",
        elements: [text("names"), text("date", { fontSize: 22 })],
      },
      {
        id: "page-venue",
        name: "Venue",
        background: "#161616",
        hidden: false,
        elements: [text("venue", { color: "#f2f1ed" })],
      },
      {
        id: "page-old",
        name: "Old draft",
        background: "#e9e6dc",
        hidden: true,
        elements: [text("draft")],
      },
    ],
    opening: {
      experience: "secret-world" as const,
      duration: 1700,
      autoOpen: false,
      welcome: "For {{guest}}, with love",
      coverStorageId: "cover-image",
    },
    closing: {
      enabled: true,
      style: "seal",
      message: "With love",
      duration: 1600,
    },
    transition: { preset: "flip", duration: 900 },
    startedAt: 1_700_000_000_000,
  };
}

describe("saved-design integrity", () => {
  it("keeps every custom opening, closing, transition and page setting", () => {
    const saved = savedDesign();
    const stored = JSON.parse(JSON.stringify(saved)) as DesignDocument;
    const reloaded = normalizeDesign(stored, content);

    expect(reloaded.opening).toEqual(saved.opening);
    expect(reloaded.closing).toEqual(saved.closing);
    expect(reloaded.transition).toEqual(saved.transition);
    expect(reloaded.startedAt).toBe(saved.startedAt);
    expect(reloaded.pages.map((page) => page.id)).toEqual(
      saved.pages.map((page) => page.id),
    );
    expect(reloaded.pages.map((page) => Boolean(page.hidden))).toEqual(
      saved.pages.map((page) => Boolean(page.hidden)),
    );
    expect(reloaded.pages[1].background).toBe("#161616");
    expect(reloaded.pages[0].elements[0].font).toBe("great-vibes");
  });

  it("persists a deletion without touching any other saved content", () => {
    const saved = savedDesign();
    const before = saved.pages[0];
    const outcome = removeElements(before.elements, ["date"]);
    saved.pages[0] = { ...before, elements: outcome.elements };

    const reloaded = normalizeDesign(
      JSON.parse(JSON.stringify(saved)) as DesignDocument,
      content,
    );

    expect(reloaded.pages[0].elements.map((item) => item.id)).toEqual(["names"]);
    expect(reloaded.pages[1].elements.map((item) => item.id)).toEqual(["venue"]);
    expect(reloaded.pages[2].hidden).toBe(true);
    expect(reloaded.closing.style).toBe("seal");
    expect(reloaded.transition.preset).toBe("flip");
    expect(reloaded.opening.welcome).toBe("For {{guest}}, with love");
    // The three approved scenes are the only presentations the studio keeps;
    // a saved value is preserved verbatim, and anything else falls back to the
    // first scene, which is the renderer a legacy opening lands on.
    expect(reloaded.opening.experience).toBe("secret-world");
  });

  it("maps an opening saved under a retired scene onto a style that renders", () => {
    // Invitations saved before the three-style engine keep opening on a
    // renderer that exists instead of falling back to nothing.
    const retired: Record<string, string> = {
      envelope: "secret-world",
      curtain: "living-art",
      typography: "impossible",
      "wax-seal": "secret-world",
      personal: "impossible",
      paper: "living-art",
      unknownScene: "secret-world",
    for (const [legacy, expected] of Object.entries(retired)) {
      const saved = savedDesign();
      (saved.opening as { experience?: string }).experience = legacy;
      const reloaded = normalizeDesign(
        JSON.parse(JSON.stringify(saved)) as DesignDocument,
        content,
      );
      expect(reloaded.opening.experience, legacy).toBe(expected);
    }
  });

  it("does not leak edits into the guest's personalized fields", () => {
    // Editing a design only ever rewrites design data; the public page still
    // receives the invitation content and guest name from Convex separately.
    const saved = savedDesign();
    const reloaded = normalizeDesign(
      JSON.parse(JSON.stringify(saved)) as DesignDocument,
      content,
    );
    expect(reloaded.pages[0].elements[0].text).toBe("A considered line");
    expect(reloaded.pages[0].elements[0].color).toBe("#710014");
    expect(content.names.primary).toBe("Amelia");
  });

  it("keeps reveal wiring and hidden pages stable across save/reload", () => {
    const saved = savedDesign();
    saved.pages[0].elements[0].reveal = {
      interactionId: "interaction-stable",
      targetId: "names",
      effect: "fadeAway",
      direction: "up",
      duration: 900,
      trigger: "tap",
      hint: "Tap to open",
    };
    const once = normalizeDesign(saved, content);
    const twice = normalizeDesign(
      JSON.parse(JSON.stringify(once)) as DesignDocument,
      content,
    );
    expect(twice.pages[0].elements[0].reveal).toEqual(
      once.pages[0].elements[0].reveal,
    );
    expect(twice.pages.length).toBe(3);
  });
});
