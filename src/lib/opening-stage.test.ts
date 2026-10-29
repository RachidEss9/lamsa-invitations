// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import {
  OPENING_EXPERIENCES,
  openingHint,
  pageSizeOf,
  type DesignPage,
  type OpeningSettings,
} from "./design";
import {
  OPENING_STYLE_DURATION,
  openingStyleFrame,
  type OpeningStyleId,
} from "./opening-style";

let queue: FrameRequestCallback[] = [];
let root: Root | null = null;
let host: HTMLDivElement | null = null;
let clock = 0;
let onDone = vi.fn<() => void>();

const STYLES: OpeningStyleId[] = ["cinematic", "monogram", "silk"];

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (!(("ResizeObserver" in globalThis) as boolean)) {
    class NoopResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      NoopResizeObserver as unknown as typeof ResizeObserver;
  }
});

beforeEach(() => {
  vi.useFakeTimers();
  queue = [];
  clock = 0;
  onDone = vi.fn<() => void>();
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) =>
    queue.push(callback as FrameRequestCallback) as unknown as number,
  );
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  queue = [];
  vi.restoreAllMocks();
  vi.useRealTimers();
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
  overrides: Partial<OpeningSettings> = {},
  options: {
    reducedMotion?: boolean;
    stillAt?: number;
    rtl?: boolean;
  } = {},
) {
  const opening: OpeningSettings = {
    experience: "cinematic",
    duration: OPENING_STYLE_DURATION.cinematic,
    autoOpen: false,
    welcome: "For {{guest}}",
    ...overrides,
  };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      createElement(OpeningStage, {
        opening,
        page: page(),
        imageUrls: {},
        accent: "#710014",
        background: "#f2f1ed",
        ink: "#161616",
        guestName: "Amara",
        names: "Amelia & Søren",
        reducedMotion: options.reducedMotion ?? false,
        stillAt: options.stillAt,
        rtl: options.rtl,
        onDone,
      }),
    ),
  );
  return host;
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
  expect(button, `button "${label}"`).toBeTruthy();
  act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

/** Tidy up between cases so each style starts from a clean mount. */
function unmount() {
  if (root) act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
}

/** Flush queued frames while advancing the tween clock until nothing is left. */
function settle(budgetMs = 8000, step = 60) {
  let elapsed = 0;
  for (let guard = 0; guard < 400 && elapsed < budgetMs; guard += 1) {
    const pending = queue;
    queue = [];
    if (pending.length === 0) return;
    clock += step;
    elapsed += step;
    act(() => {
      for (const callback of pending) callback(clock);
    });
  }
}

function engineState(container: HTMLElement) {
  return container
    .querySelector("[data-opening-engine]")
    ?.getAttribute("data-stage");
}

describe("opening stage — one engine, three styles", () => {
  it("renders the saved invitation exactly once, inside one environment", () => {
    for (const experience of STYLES) {
      const container = mount({ experience });
      const cards = container.querySelectorAll("[data-opening-card]");
      const environments = container.querySelectorAll(
        "[data-opening-environment]",
      );
      expect(cards, experience).toHaveLength(1);
      expect(environments, experience).toHaveLength(1);
      // The card is the real saved page, not a stand-in or a photograph.
      expect(container.textContent).toContain("Amelia & Søren");
      expect(
        environments[0]?.getAttribute("data-opening-environment"),
      ).toBe(experience);
      // The card keeps the page's own box, so its aspect ratio is untouched.
      const card = container.querySelector<HTMLElement>("[data-opening-card]");
      const box = pageSizeOf(page());
      expect(card?.style.width).toBe(`${box.width}px`);
      expect(card?.style.height).toBe(`${box.height}px`);
      expect(card?.style.transform).toMatch(/^scale\(/);
      expect(card?.style.opacity).toBeDefined();
      unmount();
    }
  });

  it("gives each style its own recognisable sequence", () => {
    const cinematic = openingStyleFrame("cinematic", 0.35);
    const monogram = openingStyleFrame("monogram", 0.35);
    const silk = openingStyleFrame("silk", 0.35);

    // Three different mechanisms, not one animation in three colours.
    expect(cinematic.spotlight).toBeGreaterThan(0);
    expect(cinematic.letters).toBe(0);
    expect(cinematic.ribbon).toBe(0);

    expect(monogram.letters).toBeGreaterThan(0);
    expect(monogram.shimmer).toBeGreaterThan(0);
    expect(monogram.spotlight).toBe(0);
    expect(monogram.ribbon).toBe(0);

    expect(silk.ribbon).toBeGreaterThan(0);
    expect(silk.wipe).toBeGreaterThan(0);
    expect(silk.spotlight).toBe(0);
    expect(silk.letters).toBe(0);

    // Every style lands on the presented invitation with nothing covering it.
    for (const style of STYLES) {
      const end = openingStyleFrame(style, 1);
      expect(end.reveal, style).toBe(1);
      expect(end.backdrop, style).toBe(0);
      // `reveal` never runs backwards, so the card can never flicker away.
      let previous = 0;
      for (let p = 0; p <= 1.0001; p += 0.05) {
        const value = openingStyleFrame(style, Math.min(1, p)).reveal;
        expect(value, `${style}@${p}`).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
    }
  });

  it("offers a clear start, then reveals and hands over exactly once", () => {
    for (const experience of OPENING_EXPERIENCES) {
      if (experience.id === "none") continue;
      onDone.mockClear();
      const container = mount({ experience: experience.id });
      const label = openingHint(experience.id);

      expect(engineState(container)).toBe("idle");
      // The guest's first control is the style's own prompt.
      expect(buttonByLabel(container, label)).toBeTruthy();
      // The welcome line sits with it, personalised for the guest.
      expect(container.textContent).toContain("For Amara");

      click(container, label);
      expect(engineState(container)).toBe("playing");
      // Discreet skip, always available once the run has begun.
      expect(
        buttonByLabel(container, "Skip the opening animation"),
      ).toBeTruthy();

      settle();
      expect(onDone).toHaveBeenCalledTimes(1);
      expect(engineState(container)).toBe("done");

      unmount();
    }
  });

  it("hands straight over for guests who prefer reduced motion", () => {
    const container = mount({ experience: "silk" }, { reducedMotion: true });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(buttonByLabel(container, "Skip the opening animation")).toBeNull();
  });

  it("starts on its own when the host asked for no tap", () => {
    const container = mount({ experience: "monogram", autoOpen: true });
    expect(engineState(container)).toBe("playing");
    expect(buttonByLabel(container, "Reveal the names")).toBeNull();
    settle();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("holds one exact frame for the editor without ever completing", () => {
    const early = mount({ experience: "cinematic" }, { stillAt: 0.04 });
    expect(engineState(early)).toBe("still");
    expect(buttonByLabel(early, "Begin the reveal")).toBeNull();
    settle();
    expect(onDone).not.toHaveBeenCalled();

    unmount();

    const late = mount({ experience: "cinematic" }, { stillAt: 0.95 });
    settle();
    expect(onDone).not.toHaveBeenCalled();
    const card = late.querySelector<HTMLElement>("[data-opening-card]");
    const settledCard = card?.style.opacity;
    // A late frame shows far more of the invitation than an early one.
    expect(Number(settledCard)).toBeGreaterThan(0.9);
  });

  it("renders nothing when the invitation has no opening", () => {
    const container = mount({ experience: "none" });
    expect(container.querySelector("[data-opening-engine]")).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("supports Arabic RTL content", () => {
    const container = mount({ experience: "monogram" }, { rtl: true });
    const engine = container.querySelector("[data-opening-engine]");
    expect(engine?.getAttribute("dir")).toBe("rtl");
    expect(engine?.textContent).toContain("For Amara");
  });

  it("always offers the guest a way to the invitation, exactly once", () => {
    const container = mount({ experience: "cinematic" });
    expect(buttonByLabel(container, "Begin the reveal")).toBeTruthy();
    click(container, "Begin the reveal");
    const skip = buttonByLabel(container, "Skip the opening animation");
    expect(skip).toBeTruthy();
    // Impatient repeated taps never hand over twice.
    act(() => {
      skip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      skip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    settle();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(engineState(container)).toBe("done");
    // Once settled there is nothing left to skip — the invitation is presented.
    expect(buttonByLabel(container, "Skip the opening animation")).toBeNull();
    expect(container.querySelectorAll("[data-opening-card]")).toHaveLength(1);
  });
});
