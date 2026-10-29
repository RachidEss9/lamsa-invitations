// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OpeningStage } from "@/components/invitation/OpeningStage";

export {};
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
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  const raf = vi.spyOn(globalThis, "requestAnimationFrame");
  raf.mockImplementation((callback) => queue.push(callback) as number);
  const cac = vi.spyOn(globalThis, "cancelAnimationFrame");
  cac.mockImplementation(() => undefined);
});

beforeEach(() => {
  vi.useFakeTimers();
  if ((globalThis as unknown as { document?: Document }).document) {
    delete (globalThis as unknown as { document?: Document }).document;
  }
  queue = [];
  clock = 0;
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  queue = [];
  vi.useRealTimers();
  if ((globalThis as unknown as { document?: Document }).document) {
    delete (globalThis as unknown as { document?: Document }).document;
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
  };
}

/**
 * The envelope experience mounts with no saved guest-driven settings — the
 * exact configuration behind the screenshot this suite guards against: the
 * reference engine must render anyway.
 */
function mount(
  reducedMotion = false,
  overrides: Partial<OpeningSettings> = {},
  stillAt?: number,
) {
  const onDone = vi.fn();
  host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { value: 390 },
    clientHeight: { value: 844 },
  });
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

function buttonByLabel(container: HTMLElement, label: string) {
  return (
    Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.getAttribute("aria-label") === label,
    ) ?? null
  );
}

function click(container: HTMLElement, label: string) {
  const button = buttonByLabel(container, label);
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

/** Flush queued frames while advancing the tween clock until nothing is left. */
function settle(budgetMs = 8000, step = 60) {
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

function cardTransform(container: HTMLElement): string {
  const card = container.querySelector<HTMLElement>("[data-opening-card]");
  return card?.style.transform ?? "";
}

describe("opening stage", () => {
  it("renders the photographed reference envelope, not the procedural one", () => {
    const { container } = mount();

    // The closed state is the supplied reference artwork…
    expect(stageOf(container)).toBe("sealed");
    const sealed = container.querySelector<HTMLImageElement>('[data-ref-layer="sealed"]');
    expect(sealed?.getAttribute("src") ?? "").toMatch(/env-scene/);
    expect(container.querySelector('[data-ref-layer="ground"]')).toBeTruthy();
    expect(container.querySelector('[data-ref-layer="lid"]')).toBeTruthy();
    expect(container.querySelector('[data-ref-layer="pocket"]')).toBeTruthy();

    // …and the guest reaches the real wax seal.
    expect(buttonByLabel(container, "Tap the seal to begin")).toBeTruthy();
    expect(hint(container)?.textContent).toContain("Tap the seal to begin");

    // The invitation waits inside the envelope, as the saved first section.
    expect(container.querySelector("[data-opening-card]")).toBeTruthy();
    expect(container.textContent).toContain("Amelia & Søren");

    // The old procedural envelope (its folded pocket clip) never draws.
    expect(container.innerHTML).not.toContain("polygon(0 100%, 0 23%, 50% 10%");

    // Nothing autoplays before the guest takes part.
    settle(300);
    expect(stageOf(container)).toBe("sealed");
  });

  it("breaks the seal, opens the flap and hands over exactly once", () => {
    const { container, onDone } = mount();

    // 1 — the wax seal cracks and falls away.
    tapHint(container);
    expect(stageOf(container)).toBe("breaking");
    settle();
    expect(stageOf(container)).toBe("unsealed");
    expect(buttonByLabel(container, "Tap the seal to begin")).toBeNull();

    // 2 — the flap swings open around its hinge.
    tapHint(container);
    expect(stageOf(container)).toBe("lifting");
    settle();
    expect(stageOf(container)).toBe("open");

    // 3 — the invitation card is drawn out of the pocket.
    tapHint(container);
    expect(stageOf(container)).toBe("drawing");
    settle();
    expect(stageOf(container)).toBe("presented");

    // 4 — the last tap hands over to the journey, once and only once.
    tapHint(container);
    settle();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Amelia & Søren");
  });

  it("hands over at once for guests who prefer reduced motion", () => {
    const { container, onDone } = mount(true);
    frame(0);
    settle();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Amelia & Søren");
  });

  it("wears the saved opening palette on the reference stage", () => {
    const { container } = mount(false, {
      tone: "ivory",
      palette: { accent: "#7b1027", paper: "#f4ecdd", hull: "#1b1a18" },
    });
    // The saved accent drives the stage behind the photographed envelope.
    expect(container.innerHTML.toLowerCase()).toContain("123, 16, 39");
    expect(stageOf(container)).toBe("sealed");
  });

  it("holds one stage of the reference engine still for the designer", () => {
    const { container, onDone } = mount(false, {}, 0.68);
    // Pinned to the open state: flap open, card seated, no guest controls.
    expect(stageOf(container)).toBe("open");
    expect(hint(container)).toBeNull();
    // A still is never a guest state: it does not play or hand over.
    expect(onDone).not.toHaveBeenCalled();
    settle(300);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("always offers the guest a way to the invitation", () => {
    const { container, onDone } = mount();
    click(container, "Skip the opening animation");
    expect(onDone).toHaveBeenCalledTimes(1);
    // A second press cannot complete the opening twice.
    click(container, "Skip the opening animation");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("plays a saved sequence on the automatic scenes and reveals the real invitation", () => {
    const { container, onDone } = mount(false, {
      // Envelope suites run the reference engine; the automatic choreography
      // is proven on another preset of the same stage.
      experience: "arch",
      motion: { startScale: 0.7, rise: 420, cardStart: 0.3 },
      sequence: [
        { id: "seal", role: "seal", delay: 0, duration: 400, easing: "easeOut" },
        { id: "cover", role: "cover", delay: -200, duration: 1200, easing: "easeInOut" },
        { id: "card", role: "card", delay: -700, duration: 1500, easing: "easeOut" },
        { id: "exit", role: "exit", delay: -400, duration: 800, easing: "easeIn" },
      ],
    });
    click(container, "Step through the arch");

    frame(0);
    // The saved artwork waits inside the suite — the real page, not a stand-in.
    expect(cardTransform(container)).toContain("scale(0.7)");
    expect(cardTransform(container)).toContain("translate3d(0, 420px, 0)");
    expect(container.textContent).toContain("Amelia & Søren");

    // Half-way through the 2600 ms run the card is genuinely emerging.
    frame(1430);
    const midway = cardTransform(container);
    const scale = Number(midway.match(/scale\(([\d.]+)\)/)?.[1]);
    expect(scale).toBeGreaterThan(0.7);
    expect(scale).toBeLessThan(1);

    frame(2600);
    frame(2600);
    expect(cardTransform(container)).toContain("scale(1)");
    expect(cardTransform(container)).toContain("translate3d(0, 0px, 0)");
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Amelia & Søren");
  });
});
