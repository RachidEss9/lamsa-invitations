// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MockupStudio } from "@/components/studio/MockupStudio";
import { blankInvitationContent } from "@/lib/dashboard";
import {
  createDefaultDesign,
  type DesignDocument,
  type DesignPage,
} from "@/lib/design";
import type { SuitePiece } from "@/lib/suite";

/**
 * Functional verification of the Mockup Studio without a browser: the real
 * component is mounted and driven the way a user drives it — scene buttons,
 * missing-piece creation actions, and the stage markup — for both required
 * project shapes.
 *
 * Project A: invitation only.
 * Project B: invitation, envelope, RSVP and details card.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function page(id: string, width: number, height: number): DesignPage {
  return {
    id,
    name: id,
    background: "#ffffff",
    elements: [],
    width,
    height,
    margin: 24,
  };
}

const PRINT = { unit: "mm" as const, bleedMm: 3, safeMm: 5, cropMarks: false };

function project(shape: "a" | "b"): DesignDocument {
  const base = createDefaultDesign(blankInvitationContent());
  const pages: DesignPage[] = [page("p-inv", 1000, 1400)];
  const pieces: SuitePiece[] = [
    {
      id: "piece-inv",
      name: "Invitation",
      kind: "invitation",
      pageIds: ["p-inv"],
      print: PRINT,
      guestVisible: true,
    },
  ];
  if (shape === "b") {
    pages.push(
      page("p-env-front", 1600, 1100),
      page("p-env-back", 1600, 1100),
      page("p-rsvp", 1000, 700),
      page("p-details", 1000, 700),
    );
    pieces.push(
      {
        id: "piece-env",
        name: "Envelope",
        kind: "envelope",
        pageIds: ["p-env-front", "p-env-back"],
        print: PRINT,
        guestVisible: false,
      },
      {
        id: "piece-rsvp",
        name: "RSVP card",
        kind: "rsvp",
        pageIds: ["p-rsvp"],
        print: PRINT,
        guestVisible: false,
      },
      {
        id: "piece-details",
        name: "Details card",
        kind: "details",
        pageIds: ["p-details"],
        print: PRINT,
        guestVisible: false,
      },
    );
  }
  return {
    ...base,
    pages,
    suite: { version: 1, activePieceId: "piece-inv", pieces },
  };
}

let container: HTMLDivElement;
let root: Root;
let key = 0;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver =
      ResizeObserverStub;
  }
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

interface Harness {
  onCreatePiece: ReturnType<typeof vi.fn>;
  onAddInsidePage: ReturnType<typeof vi.fn>;
}

function mount(shape: "a" | "b"): Harness {
  const onCreatePiece = vi.fn(() => `piece-created-${++key}`);
  const onAddInsidePage = vi.fn();
  act(() => {
    root.render(
      createElement(MockupStudio, {
        open: true,
        onOpenChange: () => undefined,
        design: project(shape),
        designKey: `test-${shape}-${key}`,
        imageUrls: {},
        title: "Test invitation",
        onCreatePiece,
        onAddInsidePage,
      }),
    );
  });
  return { onCreatePiece, onAddInsidePage };
}

function pickScene(label: string) {
  const button = [...document.body.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === label,
  );
  expect(button, `scene button “${label}”`).toBeTruthy();
  act(() => button!.click());
}

const sceneId = () =>
  document.body.querySelector("[data-mockup-scene]")?.getAttribute("data-mockup-scene");

const shownPieces = () =>
  [...document.body.querySelectorAll("[data-mockup-piece]")].map((item) => ({
    id: item.getAttribute("data-mockup-piece"),
    kind: item.getAttribute("data-mockup-kind"),
    z: (item as HTMLElement).style.zIndex,
  }));

const hasText = (text: string) =>
  [...document.body.querySelectorAll("button")].some(
    (item) => item.textContent?.trim() === text,
  );

describe("Mockup Studio — project A (invitation only)", () => {
  it("opens on the single-invitation scene with exactly one card", () => {
    mount("a");
    expect(sceneId()).toBe("card");
    expect(shownPieces().map((item) => item.id)).toEqual(["piece-inv"]);
  });

  it("offers real create actions for the envelope scene and never fakes a piece", () => {
    const { onCreatePiece } = mount("a");
    pickScene("Invitation with envelope");
    expect(sceneId()).toBe("card-envelope");
    // The invitation only — no fake envelope rectangle in its place.
    expect(shownPieces().map((item) => item.id)).toEqual(["piece-inv"]);
    expect(hasText("Create Outer envelope")).toBe(true);
    act(() => {
      [...document.body.querySelectorAll("button")].find(
        (item) => item.textContent?.trim() === "Create Outer envelope",
      )!.click();
    });
    expect(onCreatePiece).toHaveBeenCalledWith("envelope");
  });

  it("lists every missing piece for the suite-spread scene", () => {
    mount("a");
    pickScene("Invitation, RSVP & details");
    expect(hasText("Create RSVP card")).toBe(true);
    expect(hasText("Create Details card")).toBe(true);
  });

  it("offers a real inside page for the folded scene", () => {
    const { onAddInsidePage } = mount("a");
    pickScene("Folded / gatefold");
    expect(hasText("Add inside page")).toBe(true);
    act(() => {
      [...document.body.querySelectorAll("button")].find(
        (item) => item.textContent?.trim() === "Add inside page",
      )!.click();
    });
    expect(onAddInsidePage).toHaveBeenCalledTimes(1);
  });

  it("renders the box tray as scene furniture around the invitation", () => {
    mount("a");
    pickScene("Luxury invitation box");
    expect(sceneId()).toBe("box");
    expect(document.body.querySelector("[data-mockup-tray]")).toBeTruthy();
    expect(shownPieces().map((item) => item.id)).toEqual(["piece-inv"]);
  });
});

describe("Mockup Studio — project B (invitation, envelope, RSVP, details)", () => {
  it("shows a genuinely different composition in every scene", () => {
    mount("b");
    const compositions = new Map<string, string>();
    const scenes = [
      "Single invitation",
      "Invitation with envelope",
      "Open envelope",
      "Invitation, RSVP & details",
      "Stationery collection",
      "Folded / gatefold",
      "Luxury invitation box",
    ];
    for (const label of scenes) {
      pickScene(label);
      const signature = `${sceneId()}:${shownPieces()
        .map((item) => `${item.id}@z${item.z}`)
        .sort()
        .join(",")}`;
      expect(compositions.has(signature), label).toBe(false);
      compositions.set(signature, label);
      // Every scene renders at least the invitation.
      expect(shownPieces().length, label).toBeGreaterThan(0);
      expect(
        shownPieces().map((item) => item.id),
        label,
      ).toContain("piece-inv");
    }
    expect(compositions.size).toBe(scenes.length);
  });

  it("needs no creation prompts for envelope scenes once the pieces exist", () => {
    mount("b");
    pickScene("Invitation with envelope");
    expect(
      [...document.body.querySelectorAll("button")].some(
        (item) => item.textContent?.trim().startsWith("Create "),
      ),
    ).toBe(false);
    const pieces = shownPieces();
    expect(pieces.map((item) => item.id).sort()).toEqual([
      "piece-env",
      "piece-inv",
      "piece-rsvp",
    ]);
    // The envelope shows its flap side with a drawn flap.
    expect(document.body.querySelector('[data-mockup-flap="closed"]')).toBeTruthy();
  });

  it("layers the invitation behind the open envelope's mouth with an open flap", () => {
    mount("b");
    pickScene("Open envelope");
    const pieces = shownPieces();
    const envelope = pieces.find((item) => item.kind === "envelope");
    const invitation = pieces.find((item) => item.kind === "invitation");
    expect(envelope).toBeTruthy();
    expect(invitation).toBeTruthy();
    // The envelope is the front layer: the card emerges from behind it.
    expect(Number(envelope!.z)).toBeGreaterThan(Number(invitation!.z));
    expect(document.body.querySelector('[data-mockup-flap="open"]')).toBeTruthy();
    expect(document.body.querySelector("[data-mockup-mouth]")).toBeTruthy();
  });

  it("fans three separate cards in the suite-spread scene", () => {
    mount("b");
    pickScene("Invitation, RSVP & details");
    const kinds = shownPieces().map((item) => item.kind).sort();
    expect(kinds).toEqual(["details", "invitation", "rsvp"]);
  });

  it("puts every piece in the collection scene", () => {
    mount("b");
    pickScene("Stationery collection");
    expect(shownPieces().map((item) => item.id).sort()).toEqual([
      "piece-details",
      "piece-env",
      "piece-inv",
      "piece-rsvp",
    ]);
  });

  it("preserves the arrangement across reopen", () => {
    const designKey = "test-b-reopen";
    const onCreatePiece = vi.fn(() => "piece-created");
    const render = () =>
      act(() => {
        root.render(
          createElement(MockupStudio, {
            open: true,
            onOpenChange: () => undefined,
            design: project("b"),
            designKey,
            imageUrls: {},
            title: "Test invitation",
            onCreatePiece,
            onAddInsidePage: () => undefined,
          }),
        );
      });
    render();
    pickScene("Stationery collection");
    expect(sceneId()).toBe("collection");
    act(() => root.unmount());
    root = createRoot(container);
    render();
    expect(sceneId()).toBe("collection");
    expect(shownPieces().map((item) => item.id).sort()).toEqual([
      "piece-details",
      "piece-env",
      "piece-inv",
      "piece-rsvp",
    ]);
  });
});
