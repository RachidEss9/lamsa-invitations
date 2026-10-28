// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import { RevealOpening } from "@/components/invitation/RevealOpening";
import type { DesignPage, OpeningSettings } from "./design";

type FakeRaf = (callback: unknown) => number;

let queue: FrameRequestCallback[] = [];
let root: Root | null = null;
let host: HTMLDivElement | null = null;
let clock = 0;


beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (!("ResizeObserver" in globalThis)) {
    class NoopResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      NoopResizeObserver;
  }
});

beforeEach(() => {
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) =>
    queue.push(callback) as number,
  );
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);
});

beforeEach(() => {
  queue = [];
  clock = 0;
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  queue = [];
});

afterAll(() => {
  vi.restoreAllMocks();
  if ((globalThis as unknown as { document?: HTMLDocument }).document) {
    delete (globalThis as unknown as { document?: HTMLDocument }).document;
  }
});

function page(): DesignPage {
  return {
    id: "cover",
    name: "Cover",
    background: "#f2f1ed",
    elements: [
      {
        id: "names",
        kind: "text",
        name: "Names",
        text: "Amelia & Søren",
        x: 100,
        y: 500,
        w: 800,
        h: 160,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        font: "cormorant-garamond",
        fontSize: 72,
        color: "#161616",
        animation: {
          enabled: true,
          preset: "fade",
          trigger: "load",
          delay: 0,
          duration: 600,
          easing: "easeOut",
        },
      },
    ],
  } as DesignPage;
}

function mountInteractive(
  overrides: Partial<OpeningSettings> = {},
  props: Record<string, unknown> = {},
) {
  const onDone = vi.fn();
  host = document.createElement("div");
  // jsdom reports no box; give the stage a phone-sized viewport.
  Object.defineProperties(host, {
    clientWidth: { value: 390 },
    clientHeight: { value: 844 },
  });
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      createElement(
        OpeningStage,
        {
          opening: {
            experience: "envelope",
            duration: 2600,
            autoOpen: false,
            welcome: "For {{guest}}",
            interactive: { enabled: true, scene: "envelope-seal" as const },
            ...overrides,
          },
          page: page(),
          imageUrls: {},
          accent: "#710014",
          background: "#f2f1ed",
          ink: "#161616",
          guestName: "Amara",
          names: "Amelia & Søren",
          onDone,
          ...props,
        } as never,
      ),
    ),
  );
  return { container: host, onDone };
}

function mountCover(onOpen = vi.fn()) {
  host = document.createElement("div");
  if (!(globalThis as unknown as { document: unknown }).document) {
    (globalThis as unknown as { document: HTMLDocument }).document = document.implementation.createHTMLDocument("cover");
  }
  Object.defineProperties(host, {
    clientWidth: { value: 390 },
    clientHeight: { value: 844 },
  });
  const doc = (globalThis as unknown as { document: HTMLDocument }).document;
  const body = doc.body;
  if (!body) {
    (globalThis as unknown as { body: HTMLBodyElement }).body = doc.createElement("body");
  }
  (globalThis as unknown as { document: HTMLDocument }).document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      createElement(RevealOpening, {
        layout: "envelope",
        accent: "#710014",
        background: "#f2f1ed",
        ink: "#161616",
        go: false,
        reducedMotion: false,
        onOpen,
      }),
    ),
  );
  return { container: host, onOpen };
}

/** Flush queued frames while advancing the tween clock until nothing is left. */
function settle(budgetMs = 5000, step = 60) {
  let elapsed = 0;
  act(() => {
    for (let guard = 0; guard < 400 && elapsed < budgetMs; guard += 1) {
      const pending = queue;
      queue = [];
      if (pending.length === 0) return;
      clock += step;
      elapsed += step;
      for (const callback of pending) callback(clock);
    }
  });
}

function flushFrames(count = 2) {
  act(() => {
    for (let index = 0; index < count; index += 1) {
      const pending = queue;
      queue = [];
      clock += 16;
      for (const callback of pending) callback(clock);
    }
  });
}

function stageOf(container: HTMLElement): string | null | undefined {
  return container
    .querySelector("[data-interactive-opening]")
    ?.getAttribute("data-stage");
}

function hint(container: HTMLElement): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>("[data-hint]");
}

function tapHint(container: HTMLElement) {
  const button = hint(container);
  expect(button, "hint button").toBeTruthy();
  act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

function fire(element: Element, type: string, clientY: number, clientX = 500) {
  act(() => {
    element.dispatchEvent(
      new MouseEvent(type, { bubbles: true, clientX, clientY, button: 0 }),
    );
  });
}

function buttonByLabel(container: HTMLElement, label: string): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (candidate) => candidate.getAttribute("aria-label") === label,
    ) ?? null
  );
}

function cardTransform(container: HTMLElement): string {
  return (
    container.querySelector<HTMLElement>("[data-opening-card]")?.style.transform ?? ""
  );
}

describe("interactive opening — the guest journey", () => {
  it("starts in its closed state with clear instructions", () => {
    const { container } = mountInteractive();
    expect(stageOf(container)).toBe("sealed");
    // The seal is the first control the guest can reach.
    expect(buttonByLabel(container, "Tap the seal to begin")).toBeTruthy();
    expect(hint(container)?.textContent).toContain("Tap the seal to begin");
    // Nothing has moved: the invitation is still shut inside the envelope.
    expect(cardTransform(container)).toContain("translateY(0px)");
    // And it does not autoplay before the guest takes part.
    flushFrames(4);
    expect(stageOf(container)).toBe("sealed");
  });

  it("reveals the invitation in the correct sequence", () => {
    const { container } = mountInteractive();

    // 1 — the seal breaks.
    tapHint(container);
    expect(stageOf(container)).toBe("breaking");
    settle();
    expect(stageOf(container)).toBe("unsealed");
    expect(buttonByLabel(container, "Tap the seal to begin")).toBeNull();
    expect(buttonByLabel(container, "Lift the flap")).toBeTruthy();

    // 2 — the flap swings open around its hinge.
    tapHint(container);
    expect(stageOf(container)).toBe("lifting");
    const flap = buttonByLabel(container, "Lift the flap");
    expect(flap?.style.transform).toContain("rotateX(");
    settle();
    expect(stageOf(container)).toBe("open");
    // The real saved invitation is now sitting in the pocket.
    expect(container.textContent).toContain("Amelia & Søren");
    expect(cardTransform(container)).toContain("translateY(0px)");

    // 3 — the card is drawn out of the envelope.
    tapHint(container);
    expect(stageOf(container)).toBe("drawing");
    settle();
    expect(stageOf(container)).toBe("presented");
    expect(cardTransform(container)).toContain("scale(1.25)");
    expect(cardTransform(container)).toContain("translateY(-260px)");

    // 4 — the guest is told how to hand over to the invitation itself.
    expect(hint(container)?.textContent).toContain("Tap to open the invitation");
  });

  it("hands over exactly once when the guest finishes", () => {
    const { container, onDone } = mountInteractive();
    tapHint(container);
    settle();
    tapHint(container);
    settle();
    tapHint(container);
    settle();
    expect(stageOf(container)).toBe("presented");
    tapHint(container);
    expect(onDone).toHaveBeenCalledTimes(1);
    // Further taps cannot fire the hand-off again.
    tapHint(container);
    tapHint(container);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("lets the guest drag the flap open instead of tapping", () => {
    const { container } = mountInteractive();
    tapHint(container);
    settle();
    const flap = buttonByLabel(container, "Lift the flap");
    expect(flap).toBeTruthy();
    fire(flap!, "pointerdown", 520);
    fire(flap!, "pointermove", 400);
    fire(flap!, "pointerup", 400);
    expect(stageOf(container)).toBe("lifting");
    settle();
    expect(stageOf(container)).toBe("open");
  });

  it("springs a half-finished drag back instead of stalling halfway", () => {
    const { container } = mountInteractive();
    tapHint(container);
    settle();
    const flap = buttonByLabel(container, "Lift the flap");
    fire(flap!, "pointerdown", 520);
    fire(flap!, "pointermove", 500);
    fire(flap!, "pointerup", 500);
    // Not far enough: the flap returns to its shut position.
    expect(stageOf(container)).toBe("unsealed");
    settle(600);
    expect(cardTransform(container)).toContain("translateY(0px)");
    const button = buttonByLabel(container, "Lift the flap");
    expect(button?.style.transform).toContain("rotateX(0deg)");
  });

  it("cannot be broken by repeated or impatient taps", () => {
    const { container, onDone } = mountInteractive();
    // Hammering the seal once triggers exactly one break: while it runs the
    // hint is withdrawn and the still-mounted seal control is inert.
    tapHint(container);
    expect(stageOf(container)).toBe("breaking");
    expect(hint(container)).toBeNull();
    const seal = buttonByLabel(container, "Tap the seal to begin");
    act(() => seal?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    act(() => seal?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(stageOf(container)).toBe("breaking");
    settle();
    expect(stageOf(container)).toBe("unsealed");

    // Same during the flap swing: the control is locked, so clicking the
    // moving flap directly changes nothing.
    const flap = buttonByLabel(container, "Lift the flap");
    tapHint(container);
    expect(stageOf(container)).toBe("lifting");
    expect(hint(container)).toBeNull();
    act(() => flap?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(stageOf(container)).toBe("lifting");
    settle();
    expect(stageOf(container)).toBe("open");

    // Same while the card is being drawn.
    const cardButton = buttonByLabel(container, "Pull the invitation out");
    tapHint(container);
    expect(stageOf(container)).toBe("drawing");
    expect(hint(container)).toBeNull();
    act(() => cardButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(stageOf(container)).toBe("drawing");
    settle();
    expect(stageOf(container)).toBe("presented");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("replays from a pristine closed state", () => {
    const { container, onDone } = mountInteractive();
    tapHint(container);
    settle();
    tapHint(container);
    settle();
    tapHint(container);
    settle();
    tapHint(container);
    expect(onDone).toHaveBeenCalledTimes(1);

    // A replay remounts the stage, exactly as the editor's Replay does.
    act(() => root?.unmount());
    const replayed = mountInteractive();
    expect(stageOf(replayed.container)).toBe("sealed");
    expect(cardTransform(replayed.container)).toContain("translateY(0px)");
    expect(cardTransform(replayed.container)).toContain("scale(1)");
    expect(hint(replayed.container)?.textContent).toContain("Tap the seal to begin");
  });

  it("skips on demand for accessibility", () => {
    const { container, onDone } = mountInteractive();
    const skip = buttonByLabel(container, "Skip the opening animation");
    expect(skip).toBeTruthy();
    act(() => skip?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("hands straight over when the guest prefers reduced motion", () => {
    const { container, onDone } = mountInteractive({}, { reducedMotion: true });
    flushFrames(2);
    expect(onDone).toHaveBeenCalledTimes(1);
    // No forced autoplay: nothing is mid-animation afterwards.
    expect(["sealed", "presented"]).toContain(stageOf(container));
  });

  it("holds any step still for the editor's previews", () => {
    const { container, onDone } = mountInteractive({}, { stillAt: 0.55 });
    expect(stageOf(container)).toBe("open");
    // A held step never plays and never hands over.
    flushFrames(4);
    expect(stageOf(container)).toBe("open");
    expect(onDone).not.toHaveBeenCalled();
    expect(hint(container)).toBeNull();
  });

  it("wears the saved artwork when the host assigned some", () => {
    const { container } = mountInteractive(
      {
        interactive: {
          enabled: true,
          scene: "envelope-seal",
          layers: {
            seal: { storageId: "seal-1", kind: "image" },
            backdrop: { storageId: "clip-1", kind: "video" },
          },
        },
      },
      {
        imageUrls: {
          "seal-1": "https://cdn.test/seal.png",
          "clip-1": "https://cdn.test/backdrop.mp4",
        },
      },
    );
    const backdrop = container.querySelector("[data-backdrop]");
    expect(backdrop?.getAttribute("data-backdrop")).toBe("video");
    expect(backdrop?.getAttribute("src")).toContain("backdrop.mp4");
    // The seal artwork rides inside the same control the guest taps.
    expect(buttonByLabel(container, "Tap the seal to begin")).toBeTruthy();
    expect(
      container
        .querySelector('button[aria-label="Tap the seal to begin"] image')
        ?.getAttribute("href"),
    ).toContain("seal.png");
  });

  it("falls back to the built-in artwork when an upload is missing", () => {
    const { container } = mountInteractive({
      interactive: {
        enabled: true,
        scene: "envelope-seal",
        layers: { backdrop: { storageId: "gone", kind: "image" } },
      },
    });
    // No URL resolves for it, so the stage colour stays — never a blank layer.
    expect(container.querySelector("[data-backdrop]")?.getAttribute("data-backdrop")).toBe(
      "colour",
    );
    expect(buttonByLabel(container, "Tap the seal to begin")).toBeTruthy();
  });
});

describe("interactive opening — the cover reveal", () => {
  it("replaces the old triangular envelope with the shared engine", () => {
    const { container } = mountCover();
    expect(container.querySelector("[data-interactive-opening]")).toBeTruthy();
    // The legacy clip-path placeholder is gone for good.
    expect(container.querySelector(".lamsa-env")).toBeNull();
    expect(container.querySelector(".lamsa-flap")).toBeNull();
    expect(container.querySelector(".lamsa-seal")).toBeNull();
  });

  it("opens through seal then flap and calls back once", () => {
    const { container, onOpen } = mountCover();
    expect(stageOf(container)).toBe("sealed");
    tapHint(container);
    settle();
    expect(stageOf(container)).toBe("unsealed");
    expect(onOpen).not.toHaveBeenCalled();
    tapHint(container);
    settle();
    expect(stageOf(container)).toBe("open");
    expect(onOpen).toHaveBeenCalledTimes(1);
    // The cover has no card of its own; the page beneath is the reveal.
    expect(container.querySelector("[data-opening-card]")).toBeNull();
  });
});
