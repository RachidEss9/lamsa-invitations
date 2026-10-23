// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import type { DesignPage } from "./design";

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

function mount(reducedMotion = false) {
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
        },
        page: page(),
        imageUrls: {},
        accent: "#710014",
        background: "#f2f1ed",
        ink: "#161616",
        guestName: "Amara",
        names: "Amelia & Søren",
        reducedMotion,
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
