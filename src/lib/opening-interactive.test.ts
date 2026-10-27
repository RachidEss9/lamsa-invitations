import { describe, expect, it } from "vitest";
import {
  INTERACTIVE_DRAG_THRESHOLD,
  INTERACTIVE_MOTION,
  channelForStage,
  channelsForStage,
  easingValue,
  initialInteractiveState,
  interactiveBusy,
  interactiveHint,
  interactiveMotionOf,
  normalizeInteractiveOpening,
  reduceInteractive,
  stageAfterSettling,
  stageFromProgress,
  type InteractiveEvent,
  type InteractiveStage,
} from "./opening-interactive";
import { normalizeDesign, type DesignDocument } from "./design";
import type { InvitationContent } from "./invitation";
import { collectDesignStorageIds } from "@/convex/lib/designAssets";

const CONTENT: InvitationContent = {
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

/** Drives the machine the way the component does: events, one by one. */
function play(events: InteractiveEvent[]) {
  return events.reduce(reduceInteractive, initialInteractiveState());
}

describe("interactive opening — closed state", () => {
  it("starts sealed with everything shut", () => {
    const state = initialInteractiveState();
    expect(state.stage).toBe("sealed");
    expect(state.drag).toBe(0);
    expect(channelsForStage(state.stage)).toEqual({ seal: 0, flap: 0, card: 0 });
    expect(interactiveHint(state.stage)).toBe("Tap the seal to begin");
  });

  it("keeps every channel shut until its own stage runs", () => {
    expect(channelsForStage("sealed")).toEqual({ seal: 0, flap: 0, card: 0 });
    expect(channelsForStage("unsealed")).toEqual({ seal: 1, flap: 0, card: 0 });
    expect(channelsForStage("open")).toEqual({ seal: 1, flap: 1, card: 0 });
    expect(channelsForStage("presented")).toEqual({ seal: 1, flap: 1, card: 1 });
  });
});

describe("interactive opening — the interaction order", () => {
  it("runs seal → flap → card, each stage into its own successor", () => {
    const visited: InteractiveStage[] = [];
    let state = initialInteractiveState();
    visited.push(state.stage);
    // Each interaction settles into the next stage, and nowhere else.
    for (let round = 0; round < 3; round += 1) {
      state = reduceInteractive(state, { type: "activate" });
      visited.push(state.stage);
      state = reduceInteractive(state, { type: "settled" });
      visited.push(state.stage);
    }
    expect(visited).toEqual([
      "sealed",
      "breaking",
      "unsealed",
      "lifting",
      "open",
      "drawing",
      "presented",
    ]);
    expect(state.stage).toBe("presented");
    // Each running stage settles into exactly its own successor.
    expect(stageAfterSettling("breaking")).toBe("unsealed");
    expect(stageAfterSettling("lifting")).toBe("open");
    expect(stageAfterSettling("drawing")).toBe("presented");
    expect(stageAfterSettling("sealed")).toBeNull();
    expect(stageAfterSettling("presented")).toBeNull();
  });

  it("answers the guest's tap with the movement for that stage", () => {
    expect(play([{ type: "activate" }]).stage).toBe("breaking");
    expect(
      play([
        { type: "activate" },
        { type: "settled" },
        { type: "activate" },
      ]).stage,
    ).toBe("lifting");
    expect(
      play([
        { type: "activate" },
        { type: "settled" },
        { type: "activate" },
        { type: "settled" },
        { type: "activate" },
      ]).stage,
    ).toBe("drawing");
  });

  it("exposes the channel that moves in each stage", () => {
    expect(channelForStage("breaking")).toBe("seal");
    expect(channelForStage("lifting")).toBe("flap");
    expect(channelForStage("drawing")).toBe("card");
    expect(channelForStage("sealed")).toBeNull();
    expect(channelForStage("presented")).toBeNull();
  });
});

describe("interactive opening — repeated input cannot break the state", () => {
  it("ignores taps while a movement is running", () => {
    const breaking = play([{ type: "activate" }]);
    expect(interactiveBusy(breaking.stage)).toBe(true);
    // Hammering the seal mid-break changes nothing.
    const hammered = play([
      { type: "activate" },
      { type: "activate" },
      { type: "activate" },
      { type: "drag", progress: 0.9 },
      { type: "release", progress: 0.9 },
    ]);
    expect(hammered.stage).toBe("breaking");
    expect(hammered.drag).toBe(0);
    // Exactly one settle later it lands where it should — no further.
    expect(reduceInteractive(hammered, { type: "settled" }).stage).toBe("unsealed");
    expect(reduceInteractive(hammered, { type: "settled" }).stage).not.toBe("open");
  });

  it("ignores stray settles once nothing is running", () => {
    const sealed = initialInteractiveState();
    expect(reduceInteractive(sealed, { type: "settled" })).toEqual(sealed);
    const open = play([{ type: "activate" }, { type: "settled" }, { type: "activate" }, { type: "settled" }]);
    expect(open.stage).toBe("open");
    // An extra settle after the flap has stopped must not open the card.
    expect(reduceInteractive(open, { type: "settled" })).toEqual(open);
  });

  it("only accepts drags on the flap and the card, while they wait", () => {
    const sealed = reduceInteractive(initialInteractiveState(), { type: "drag", progress: 0.5 });
    expect(sealed.drag).toBe(0);
    const unsealed = play([{ type: "activate" }, { type: "settled" }]);
    expect(reduceInteractive(unsealed, { type: "drag", progress: 0.6 }).drag).toBe(0.6);
    const breaking = play([{ type: "activate" }]);
    expect(reduceInteractive(breaking, { type: "drag", progress: 0.6 })).toEqual(breaking);
  });
});

describe("interactive opening — dragging", () => {
  const unsealed = play([{ type: "activate" }, { type: "settled" }]);

  it("completes a pull released past the threshold", () => {
    const state = reduceInteractive(unsealed, {
      type: "release",
      progress: INTERACTIVE_DRAG_THRESHOLD,
    });
    expect(state.stage).toBe("lifting");
    expect(state.drag).toBe(INTERACTIVE_DRAG_THRESHOLD);
  });

  it("springs back a pull released short of the threshold", () => {
    const dragged = reduceInteractive(unsealed, { type: "drag", progress: 0.3 });
    const released = reduceInteractive(dragged, {
      type: "release",
      progress: 0.3,
    });
    expect(released.stage).toBe("unsealed");
    expect(released.drag).toBe(0);
  });

  it("pulls the card from the open envelope the same way", () => {
    const open = play([{ type: "activate" }, { type: "settled" }, { type: "activate" }, { type: "settled" }]);
    expect(open.stage).toBe("open");
    expect(
      reduceInteractive(open, { type: "release", progress: 0.9 }).stage,
    ).toBe("drawing");
  });

  it("clamps nonsense progress instead of throwing", () => {
    const dragged = reduceInteractive(unsealed, { type: "drag", progress: Number.NaN });
    expect(dragged.drag).toBe(0);
    const over = reduceInteractive(unsealed, { type: "drag", progress: 4 });
    expect(over.drag).toBe(1);
  });
});

describe("interactive opening — replay", () => {
  it("restores every layer to its original position", () => {
    const finished = play([
      { type: "activate" },
      { type: "settled" },
      { type: "activate" },
      { type: "settled" },
      { type: "activate" },
      { type: "settled" },
    ]);
    expect(finished.stage).toBe("presented");
    const replayed = reduceInteractive(finished, { type: "replay" });
    expect(replayed).toEqual(initialInteractiveState());
    expect(channelsForStage(replayed.stage)).toEqual({ seal: 0, flap: 0, card: 0 });
  });
});

describe("interactive opening — guest guidance", () => {
  it("tells the guest exactly what to do next, and nothing while busy", () => {
    expect(interactiveHint("sealed")).toBe("Tap the seal to begin");
    expect(interactiveHint("unsealed")).toBe("Lift the flap");
    expect(interactiveHint("open")).toBe("Pull the card out");
    expect(interactiveHint("presented")).toBe("Tap to open the invitation");
    expect(interactiveHint("breaking")).toBeNull();
    expect(interactiveHint("lifting")).toBeNull();
    expect(interactiveHint("drawing")).toBeNull();
    // The cover variant has no card to pull.
    expect(interactiveHint("open", "cover")).toBeNull();
  });

  it("maps preview scrub positions onto real stages", () => {
    expect(stageFromProgress(0.05)).toBe("sealed");
    expect(stageFromProgress(0.3)).toBe("unsealed");
    expect(stageFromProgress(0.55)).toBe("open");
    expect(stageFromProgress(0.92)).toBe("presented");
  });
});

describe("interactive opening — saved configuration", () => {
  it("keeps real settings and repairs damaged ones", () => {
    const kept = normalizeInteractiveOpening({
      enabled: true,
      scene: "envelope-seal",
      layers: {
        seal: { storageId: "seal-asset", kind: "image" },
        backdrop: { storageId: "clip-asset", kind: "video" },
        // Unknown layer and junk entries are dropped.
        moon: { storageId: "nope", kind: "image" },
        body: "not-an-object",
      },
      motion: { sealMs: 900, flapMs: 99999, flapEasing: "nonsense", pullMs: 40 },
    });
    expect(kept?.enabled).toBe(true);
    expect(kept?.layers).toEqual({
      seal: { storageId: "seal-asset", kind: "image" },
      backdrop: { storageId: "clip-asset", kind: "video" },
    });
    // Timings are clamped into a range that can always finish; unset fields
    // come back filled with their defaults.
    expect(kept?.motion).toEqual({
      sealMs: 900,
      flapMs: 4000,
      flapEasing: "easeInOut",
      pullMs: 150,
      pullEasing: "easeOut",
    });

    expect(normalizeInteractiveOpening({ enabled: false })).toBeUndefined();
    expect(normalizeInteractiveOpening({ enabled: "yes" })).toBeUndefined();
    expect(normalizeInteractiveOpening(undefined)).toBeUndefined();
    expect(normalizeInteractiveOpening("junk")).toBeUndefined();
  });

  it("falls back to the built-in timings when nothing is saved", () => {
    const motion = interactiveMotionOf(undefined);
    expect(motion.sealMs).toBe(INTERACTIVE_MOTION.sealMs);
    expect(motion.flapMs).toBe(INTERACTIVE_MOTION.flapMs);
    expect(motion.pullMs).toBe(INTERACTIVE_MOTION.pullMs);
  });

  it("uses the same easing curves the editor offers", () => {
    expect(easingValue("linear", 0.5)).toBe(0.5);
    expect(easingValue("easeOut", 0)).toBe(0);
    expect(easingValue("easeOut", 1)).toBe(1);
    expect(easingValue("easeInOut", 1)).toBe(1);
    // Monotonic: a guest's drag never runs backwards through the easing.
    let previous = -1;
    for (let step = 0; step <= 20; step += 1) {
      const value = easingValue("easeInOut", step / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("interactive opening — persistence", () => {
  function savedDesign(): DesignDocument {
    return {
      version: 1,
      pages: [{ id: "page-cover", name: "Cover", background: "#f2f1ed", elements: [] }],
      opening: {
        experience: "envelope",
        duration: 2600,
        autoOpen: false,
        welcome: "For {{guest}}",
        interactive: {
          enabled: true,
          scene: "envelope-seal",
          layers: {
            seal: { storageId: "seal-123", kind: "image" },
            backdrop: { storageId: "clip-456", kind: "video" },
          },
          motion: { sealMs: 700 },
        },
      },
      closing: { enabled: false, style: "fade", message: "", duration: 1200 },
      transition: { preset: "fade", duration: 600 },
      startedAt: 1_700_000_000_000,
    } as DesignDocument;
  }

  it("survives a save and reload through the design document", () => {
    const original = savedDesign();
    const stored = JSON.parse(JSON.stringify(original)) as DesignDocument;
    const reloaded = normalizeDesign(stored, CONTENT);

    expect(reloaded.opening.interactive).toEqual({
      enabled: true,
      scene: "envelope-seal",
      layers: {
        seal: { storageId: "seal-123", kind: "image" },
        backdrop: { storageId: "clip-456", kind: "video" },
      },
      // Reload fills the movement defaults around the saved seal timing.
      motion: {
        sealMs: 700,
        flapMs: 1500,
        flapEasing: "easeInOut",
        pullMs: 1700,
        pullEasing: "easeOut",
      },
    });
  });

  it("leaves invitations saved before the engine existed untouched", () => {
    const legacy = savedDesign();
    delete (legacy.opening as { interactive?: unknown }).interactive;
    const reloaded = normalizeDesign(
      JSON.parse(JSON.stringify(legacy)) as DesignDocument,
      CONTENT,
    );
    expect(reloaded.opening.interactive).toBeUndefined();
    // The automatic opening is untouched: same experience, same duration.
    expect(reloaded.opening.experience).toBe("envelope");
    expect(reloaded.opening.duration).toBe(2600);
  });

  it("hands guests every asset the layers reference", () => {
    const ids = collectDesignStorageIds(savedDesign());
    expect(ids).toContain("seal-123");
    expect(ids).toContain("clip-456");
    // Ordinary page images still resolve the same way.
    const withPageImage = {
      pages: [{ elements: [{ imageStorageId: "page-img" }] }],
      opening: {},
    };
    expect(collectDesignStorageIds(withPageImage)).toContain("page-img");
  });
});