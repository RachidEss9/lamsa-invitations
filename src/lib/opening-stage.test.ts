// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import type { DesignPage, OpeningSettings } from "./design";

let queue: FrameRequestCallback[] = [];
let root: Root | null = null;
let host: HTMLDivElement | null = null;

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
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  queue = [];
  vi.useRealTimers();
});

afterAll(() => {
  vi.unstubAllGlobals();
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
  };
}

function mount(
  reducedMotion = false,
  overrides: Partial<OpeningSettings> = {},
  stillAt?: number,
) {
  const onDone = vi.fn();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      createElement(OpeningStage, {
        opening: {
          experience: "envelope",
          duration: 1200,
          autoOpen: false,
          welcome: "For {{guest}}",
          ...overrides,
        },
        page: page(),
        imageUrls: {},
        accent: "#710014",
        background: "#f2f1ed",
        ink: "#161616",
        guestName: "Amara",
        names: "Amelia & Søren",
        reducedMotion,
        stillAt,
        onDone,
      }),
    ),
  );
  return { container: host, onDone };
}

function click(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === label,
  );
  expect(button, `button ${label}`).toBeTruthy();
  act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

/** Advance the stubbed animation clock to an absolute timestamp. */
function frame(now: number) {
  const pending = queue;
  queue = [];
  act(() => {
    for (const callback of pending) callback(now);
  });
}

function cardTransform(container: HTMLElement): string {
  const card = container.querySelector<HTMLElement>("[data-opening-card]");
  return card?.style.transform ?? "";
}

describe("opening stage", () => {
  it("shows the real invitation inside the envelope before it opens", () => {
    const { container } = mount();
    // The card is the saved first section, not an unrelated placeholder.
    expect(container.textContent).toContain("Amelia & Søren");
    expect(cardTransform(container)).toContain("scale(0.6)");
    expect(cardTransform(container)).toContain("translate3d(0, 560px, 0)");
    click(container, "Break the seal");
  });

  it("emerges the card and completes exactly once", () => {
    const { container, onDone } = mount();
    click(container, "Break the seal");

    frame(0);
    // Still sealed at the very start of the run.
    expect(cardTransform(container)).toContain("scale(0.6)");

    frame(1200);
    const midway = cardTransform(container);
    const scale = Number(midway.match(/scale\(([\d.]+)\)/)?.[1]);
    const offset = Number(midway.match(/translate3d\(0, (-?[\d.]+)px/)?.[1]);
    expect(scale).toBeGreaterThan(0.6);
    expect(scale).toBeLessThan(1);
    expect(offset).toBeLessThan(560);
    expect(offset).toBeGreaterThan(0);

    frame(2400);
    frame(2400);
    expect(cardTransform(container)).toContain("scale(1)");
    expect(cardTransform(container)).toContain("translate3d(0, 0px, 0)");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("hands over at once for guests who prefer reduced motion", () => {
    const { container, onDone } = mount(true);
    frame(0);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Amelia & Søren");
    expect(container.textContent).not.toContain("Break the seal");
  });

  it("wears the saved material and emergence", () => {
    const { container } = mount(false, {
      tone: "ivory",
      palette: { accent: "#7b1027", paper: "#f4ecdd", hull: "#1b1a18" },
      motion: { startScale: 0.7, rise: 420, cardStart: 0.3 },
    });
    // The card waits where the host designed it, not at the preset's default.
    expect(cardTransform(container)).toContain("scale(0.7)");
    expect(cardTransform(container)).toContain("translate3d(0, 420px, 0)");
    // The suite's own colour comes from the saved opening palette.
    expect(container.innerHTML.toLowerCase()).toContain("244, 236, 221");
    click(container, "Break the seal");
  });

  it("holds one stage of the sequence still for the designer", () => {
    const { container, onDone } = mount(
      false,
      { motion: { startScale: 0.7, rise: 420, cardStart: 0.3 } },
      0.68,
    );
    const still = cardTransform(container);
    const scale = Number(still.match(/scale\(([\d.]+)\)/)?.[1]);
    const offset = Number(still.match(/translate3d\(0, (-?[\d.]+)px/)?.[1]);
    expect(scale).toBeGreaterThan(0.7);
    expect(scale).toBeLessThan(1);
    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(420);
    // A still is never a guest state: it does not play or hand over.
    expect(onDone).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Break the seal");
  });

  it("completes even if animation frames stall", () => {
    vi.useFakeTimers();
    const { container, onDone } = mount();
    click(container, "Break the seal");
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
