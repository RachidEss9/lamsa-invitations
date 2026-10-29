import { describe, expect, it } from "vitest";
import { blankInvitationContent } from "@/lib/dashboard";
import {
  createDefaultDesign,
  type DesignDocument,
  type DesignPage,
} from "@/lib/design";
import {
  MOCKUP_SCENES,
  MOCKUP_SURFACES,
  clampPlacement,
  clearMockupState,
  defaultMockupState,
  loadMockupState,
  mockupExportName,
  mockupPieces,
  normalizeMockupState,
  resolvePlacements,
  sceneById,
  stageSizeFor,
  surfaceById,
  writeMockupState,
} from "@/lib/mockup";

const PX_PER_MM = 96 / 25.4;

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

/** A suite with a single-page card, a two-sided envelope and an RSVP card. */
function suiteDesign(): DesignDocument {
  const base = createDefaultDesign(blankInvitationContent());
  const pages: DesignPage[] = [
    page("page-inv", 1000, 1400),
    page("page-env-front", 1600, 1100),
    page("page-env-back", 1600, 1100),
    page("page-rsvp", 1000, 700),
  ];
  return {
    ...base,
    pages,
    suite: {
      version: 1,
      activePieceId: "piece-inv",
      pieces: [
        {
          id: "piece-inv",
          name: "Invitation",
          kind: "invitation",
          pageIds: ["page-inv"],
          print: { unit: "mm", bleedMm: 3, safeMm: 5, cropMarks: false },
          guestVisible: true,
        },
        {
          id: "piece-env",
          name: "Envelope",
          kind: "envelope",
          pageIds: ["page-env-front", "page-env-back"],
          print: { unit: "mm", bleedMm: 3, safeMm: 5, cropMarks: false },
          guestVisible: false,
        },
        {
          id: "piece-rsvp",
          name: "RSVP",
          kind: "rsvp",
          pageIds: ["page-rsvp"],
          print: { unit: "mm", bleedMm: 3, safeMm: 5, cropMarks: false },
          guestVisible: false,
        },
      ],
    },
  };
}

describe("mockupPieces", () => {
  it("uses each suite piece's real pages and physical size", () => {
    const pieces = mockupPieces(suiteDesign());
    expect(pieces.map((piece) => piece.id)).toEqual([
      "piece-inv",
      "piece-env",
      "piece-rsvp",
    ]);
    const invitation = pieces[0];
    expect(invitation.pages).toHaveLength(1);
    expect(invitation.widthMm).toBeCloseTo(1000 / PX_PER_MM, 5);
    expect(invitation.heightMm).toBeCloseTo(1400 / PX_PER_MM, 5);
    const envelope = pieces[1];
    expect(envelope.pages.map((item) => item.id)).toEqual([
      "page-env-front",
      "page-env-back",
    ]);
    expect(envelope.widthMm).toBeGreaterThan(invitation.widthMm);
  });

  it("leaves out a piece when every one of its pages is hidden", () => {
    const base = suiteDesign();
    const hidden = {
      ...base,
      pages: base.pages.map((item) =>
        item.id === "page-inv" ? { ...item, hidden: true } : item,
      ),
    };
    const ids = mockupPieces(hidden).map((piece) => piece.id);
    expect(ids).not.toContain("piece-inv");
    expect(ids).toContain("piece-env");
    // A piece with one visible page still shows that page only.
    const halfHidden = {
      ...base,
      pages: base.pages.map((item) =>
        item.id === "page-env-back" ? { ...item, hidden: true } : item,
      ),
    };
    const envelope = mockupPieces(halfHidden).find(
      (piece) => piece.id === "piece-env",
    );
    expect(envelope?.pages.map((item) => item.id)).toEqual(["page-env-front"]);
  });

  it("drops a piece whose pages no longer exist", () => {
    const base = suiteDesign();
    const deleted = { ...base, pages: base.pages.slice(1) };
    const ids = mockupPieces(deleted).map((piece) => piece.id);
    expect(ids).not.toContain("piece-inv");
  });

  it("falls back to visible pages for a project without a suite", () => {
    const base = createDefaultDesign(blankInvitationContent());
    const plain: DesignDocument = {
      ...base,
      pages: [page("p1", 1000, 1400), page("p2", 1000, 1400)],
    };
    const pieces = mockupPieces(plain);
    expect(pieces.map((piece) => piece.kind)).toEqual(["page", "page"]);
    expect(pieces.map((piece) => piece.id)).toEqual(["p1", "p2"]);
  });
});

describe("resolvePlacements", () => {
  const pieces = mockupPieces(suiteDesign());

  it("sends the envelope to the slot that asks for it, whatever the selection order", () => {
    const scene = sceneById("card-envelope");
    const placements = resolvePlacements(
      scene,
      pieces,
      ["piece-inv", "piece-rsvp", "piece-env"],
      {},
    );
    const bySlot = new Map(
      placements.map((placement) => [placement.slotId, placement.pieceId]),
    );
    expect(bySlot.get("envelope")).toBe("piece-env");
    expect(bySlot.get("card")).toBe("piece-inv");
    expect(bySlot.get("extra")).toBe("piece-rsvp");
    // Draw order is bottom-to-top by stack.
    const stack = placements.map((placement) => placement.z);
    expect(stack).toEqual([...stack].sort((a, b) => a - b));
  });

  it("drops slots that cannot show anything instead of rendering empties", () => {
    // The open-envelope slot needs the envelope's second page; a single-page
    // project must not consume a piece and then paint nothing.
    const scene = sceneById("open-envelope");
    const placements = resolvePlacements(scene, pieces, ["piece-inv"], {});
    expect(placements.every((placement) => placement.slotId !== "envelope")).toBe(
      true,
    );
    expect(placements).toHaveLength(1);
    // A lone piece reads centred, not parked in a corner slot.
    expect(placements[0].x).toBe(0.5);
    expect(placements[0].y).toBe(0.5);
    expect(placements[0].z).toBe(3);
  });

  it("never shows a piece that was not selected", () => {
    const scene = sceneById("collection");
    const placements = resolvePlacements(scene, pieces, ["piece-rsvp"], {});
    expect(placements).toHaveLength(1);
    expect(placements[0].pieceId).toBe("piece-rsvp");
    expect(
      resolvePlacements(scene, pieces, ["ghost-piece"], {}),
    ).toHaveLength(0);
  });

  it("applies the saved repositioning, rotation, scale and stacking", () => {
    const scene = sceneById("card-envelope");
    const placements = resolvePlacements(scene, pieces, ["piece-inv", "piece-env"], {
      card: { x: 0.1, y: 0.2, rotation: 15, scale: 1.4, z: 9 },
    });
    const card = placements.find((placement) => placement.slotId === "card");
    expect(card).toMatchObject({
      x: 0.1,
      y: 0.2,
      rotation: 15,
      scale: 1.4,
      z: 9,
    });
    const untouched = placements.find(
      (placement) => placement.slotId === "envelope",
    );
    expect(untouched?.rotation).toBe(-7);
    expect(untouched?.scale).toBe(1);
  });

  it("keeps a dragged piece on the stage", () => {
    const scene = sceneById("card");
    const [placement] = resolvePlacements(scene, pieces, ["piece-inv"], {});
    const clamped = clampPlacement({ ...placement, x: 4, y: -9, scale: 12 });
    expect(clamped.x).toBe(1.15);
    expect(clamped.y).toBe(-0.15);
    expect(clamped.scale).toBe(2.5);
    const kept = clampPlacement({ ...placement, x: 0.4, y: 0.6, scale: 1 });
    expect(kept).toMatchObject({ x: 0.4, y: 0.6, scale: 1 });
  });
});

describe("stage sizing", () => {
  it("scales the stage as a multiple of the largest piece, in millimetres", () => {
    const pieces = mockupPieces(suiteDesign());
    const scene = sceneById("card");
    const stage = stageSizeFor(scene, pieces);
    const widest = Math.max(...pieces.map((piece) => piece.widthMm));
    expect(stage.widthMm).toBeCloseTo(widest * scene.stage.w, 5);
    expect(stage.heightMm).toBeGreaterThan(0);
    // With nothing selected the stage still has a usable size.
    const empty = stageSizeFor(scene, []);
    expect(empty.widthMm).toBeGreaterThan(0);
    expect(empty.heightMm).toBeGreaterThan(0);
  });

  it("gives every scene sane slot geometry", () => {
    expect(MOCKUP_SCENES.length).toBeGreaterThanOrEqual(7);
    for (const scene of MOCKUP_SCENES) {
      expect(scene.slots.length).toBeGreaterThan(0);
      expect(scene.stage.w).toBeGreaterThan(1);
      expect(scene.stage.h).toBeGreaterThan(1);
      for (const slot of scene.slots) {
        expect(Math.abs(slot.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(slot.y)).toBeLessThanOrEqual(1);
        expect(slot.w).toBeGreaterThan(0);
        expect(slot.z).toBeGreaterThan(0);
      }
    }
  });
});

describe("saved arrangements", () => {
  const pieces = mockupPieces(suiteDesign());

  it("keeps only real, known pieces and sane values", () => {
    const normalized = normalizeMockupState(
      {
        pieceIds: ["piece-inv", "ghost"],
        sceneId: "ghost-scene",
        surfaceId: "ghost-surface",
        light: 250,
        tilt: -99,
        thickness: 7,
        overrides: { card: { x: 3, rotation: 500 } },
      },
      pieces,
    );
    expect(normalized).not.toBeNull();
    expect(normalized!.pieceIds).toEqual(["piece-inv"]);
    expect(normalized!.sceneId).toBe("card");
    expect(normalized!.surfaceId).toBe("ivory");
    expect(normalized!.light).toBe(100);
    expect(normalized!.tilt).toBe(-14);
    expect(normalized!.thickness).toBe(3);
    expect(normalized!.overrides.card?.x).toBe(1.15);
    expect(normalized!.overrides.card?.rotation).toBe(180);
  });

  it("rejects arrangements that reference nothing real", () => {
    expect(normalizeMockupState({ pieceIds: ["ghost"] }, pieces)).toBeNull();
    expect(normalizeMockupState(null, pieces)).toBeNull();
    expect(normalizeMockupState("not an object", pieces)).toBeNull();
  });

  it("starts with a card scene, real pieces and modest defaults", () => {
    const state = defaultMockupState(pieces);
    expect(state.sceneId).toBe("card");
    expect(state.surfaceId).toBe("ivory");
    expect(state.pieceIds).toEqual(["piece-inv", "piece-env", "piece-rsvp"]);
    expect(state.overrides).toEqual({});
    expect(state.seal).toBe(false);
    expect(state.ribbon).toBe(false);
  });

  it("round-trips one arrangement per invitation without touching design data", () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    };
    const original = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: fake },
      configurable: true,
      writable: true,
    });
    try {
      const saved = {
        ...defaultMockupState(pieces),
        pieceIds: ["piece-inv", "piece-rsvp"],
        surfaceId: "linen",
        tilt: -6,
        overrides: { card: { rotation: 7 } },
      };
      writeMockupState("inv-a", saved);
      const restored = loadMockupState("inv-a", pieces);
      expect(restored).not.toBeNull();
      expect(restored!.pieceIds).toEqual(["piece-inv", "piece-rsvp"]);
      expect(restored!.surfaceId).toBe("linen");
      expect(restored!.tilt).toBe(-6);
      expect(restored!.overrides.card?.rotation).toBe(7);
      // Another invitation never inherits this arrangement.
      expect(loadMockupState("inv-b", pieces)).toBeNull();
      // Corrupt storage degrades to "no saved arrangement", never a crash.
      store.set("lamsa.mockups", "{broken");
      expect(loadMockupState("inv-a", pieces)).toBeNull();
      store.set("lamsa.mockups", JSON.stringify({ "inv-a": saved }));
      clearMockupState("inv-a");
      expect(loadMockupState("inv-a", pieces)).toBeNull();
    } finally {
      if (original) Object.defineProperty(globalThis, "window", original);
      else delete (globalThis as { window?: unknown }).window;
    }
  });
});

describe("mockup export naming", () => {
  it("always separates a mockup file from the print artwork", () => {
    const png = mockupExportName("Our wedding", "png");
    const jpg = mockupExportName("Our wedding", "jpeg");
    expect(png).toBe("our-wedding-mockup.png");
    expect(jpg).toBe("our-wedding-mockup.jpg");
    expect(png).not.toMatch(/\.pdf$/);
    expect(png).toContain("mockup");
    expect(jpg).toContain("mockup");
    // Arabic titles survive safe filenames.
    expect(mockupExportName("لمة", "png")).toBe("لمة-mockup.png");
    // An empty title still produces a usable name.
    expect(mockupExportName("   ", "png")).toBe("lamsa-invitation-mockup.png");
  });
});

describe("surfaces", () => {
  it("offers distinct presentation surfaces with a safe fallback", () => {
    const ids = MOCKUP_SURFACES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("ivory");
    expect(surfaceById("does-not-exist").id).toBe("ivory");
    expect(surfaceById("linen").label).toBe("Warm linen");
  });
});
