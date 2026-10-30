// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DetailPresentationStudio } from "@/components/studio/DetailPresentationStudio";
import { blankInvitationContent } from "@/lib/dashboard";
import {
  createDefaultDesign,
  type DesignDocument,
  type DesignElement,
  type DesignPage,
} from "@/lib/design";
import { downloadBlob } from "@/lib/print";

/**
 * Functional verification of the Detail Presentation Studio without a browser:
 * the real workspace is mounted and driven the way a owner drives it — adding
 * detail views from the saved page, reordering, switching editorial layouts,
 * drawing a custom focus, exporting and reopening.
 *
 * Everything the stage shows is a crop of the design below; nothing here
 * asserts appearance, only structure, crop geometry, state and export wiring.
 */

const mocks = vi.hoisted(() => ({ failEncode: false }));

vi.mock("@zumer/snapdom", () => ({
  snapdom: vi.fn(async () => ({
    toCanvas: async () => ({
      width: 8,
      height: 8,
      toBlob: (resolve: (blob: Blob | null) => void, type: string) =>
        resolve(mocks.failEncode ? null : new Blob([new Uint8Array([1])], { type })),
    }),
  })),
}));

vi.mock("@/lib/print", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/print")>();
  return { ...actual, downloadBlob: vi.fn() };
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function element(
  id: string,
  kind: DesignElement["kind"],
  box: { x: number; y: number; w: number; h: number },
  extra: Partial<DesignElement> = {},
): DesignElement {
  return {
    id,
    name: id,
    kind,
    ...box,
    animation: {
      enabled: false,
      preset: "fade",
      trigger: "load",
      delay: 0,
      duration: 600,
      easing: "easeOut",
    },
    ...extra,
  };
}

function project(): DesignDocument {
  const base = createDefaultDesign(blankInvitationContent());
  const sheet: DesignPage = {
    id: "p-inv",
    name: "Invitation",
    background: "#ffffff",
    width: 1000,
    height: 1400,
    margin: 24,
    elements: [
      element("t1", "text", { x: 160, y: 520, w: 640, h: 200 }, { text: "Together forever" }),
      element("t2", "text", { x: 240, y: 820, w: 500, h: 120 }, { text: "Saturday at noon" }),
      element("m1", "motif", { x: 700, y: 140, w: 180, h: 180 }),
      element("s1", "shape", { x: 120, y: 1060, w: 320, h: 80 }),
    ],
  };
  return {
    ...base,
    pages: [sheet],
    suite: {
      version: 1,
      activePieceId: "piece-inv",
      pieces: [
        {
          id: "piece-inv",
          name: "Invitation",
          kind: "invitation",
          pageIds: ["p-inv"],
          print: { unit: "mm" as const, bleedMm: 3, safeMm: 5, cropMarks: false },
          guestVisible: true,
        },
      ],
    },
  };
}

let container: HTMLDivElement;
let root: Root;
let key = 0;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;
  }
  window.localStorage.clear();
  mocks.failEncode = false;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(designKey: string) {
  act(() => {
    root.render(
      createElement(DetailPresentationStudio, {
        open: true,
        onOpenChange: () => undefined,
        design: project(),
        designKey,
        imageUrls: {},
        title: "Test invitation",
        rtl: false,
      }),
    );
  });
}

function mount(): string {
  const designKey = `test-${++key}`;
  render(designKey);
  return designKey;
}

const qa = <T extends Element = HTMLElement>(selector: string) =>
  [...document.body.querySelectorAll<T>(selector)];
const q = <T extends Element = HTMLElement>(selector: string) => qa<T>(selector)[0] ?? null;

const rows = () => qa("[data-view-row]");
const stageViews = () => qa("[data-detail-view]");
const stageIds = () => stageViews().map((view) => view.getAttribute("data-detail-view"));
const rowIds = () => rows().map((row) => row.getAttribute("data-view-row"));

function button(selector: string): HTMLButtonElement {
  const found = q<HTMLButtonElement>(selector);
  expect(found, `button ${selector}`).toBeTruthy();
  return found!;
}

function click(target: HTMLElement) {
  act(() => target.click());
}

function pointer(type: string, x: number, y: number) {
  act(() => {
    q("[data-focus-frame]")!.dispatchEvent(
      new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
    );
  });
}

function domRect(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("Detail Presentation Studio", () => {
  it("opens with a composed presentation of real views of the invitation", () => {
    mount();
    expect(stageViews().length).toBeGreaterThanOrEqual(3);
    expect(rowIds()).toEqual(stageIds());
    expect(q("[data-detail-presentation]")?.getAttribute("data-detail-presentation")).toBe(
      "spread",
    );
    const kinds = stageViews().map((view) => view.getAttribute("data-view-kind"));
    expect(kinds).toContain("full");
    expect(kinds).toContain("paper");
    // Every plate crops a page that exists in the design.
    for (const plate of qa("[data-detail-plate]")) {
      expect(plate.getAttribute("data-crop")).toMatch(/^-?\d+,-?\d+,\d+,\d+$/);
    }
  });

  it("adds typography and artwork views, and never duplicates one", () => {
    mount();
    const start = rows().length;
    click(button('button[data-add-view="typography"]'));
    expect(rows().length).toBe(start + 1);
    expect(
      stageViews().some((view) => view.getAttribute("data-view-kind") === "typography"),
    ).toBe(true);

    click(button('button[data-add-view="typography"]'));
    expect(rows().length).toBe(start + 1);
    expect(document.body.textContent).toContain("already in the presentation");

    click(button('button[data-add-view="artwork"]'));
    expect(rows().length).toBe(start + 2);
    expect(
      stageViews().some((view) => view.getAttribute("data-view-kind") === "artwork"),
    ).toBe(true);
  });

  it("reorders and removes views", () => {
    mount();
    const before = rowIds();
    expect(before.length).toBeGreaterThan(2);
    click(rows()[1].querySelector<HTMLElement>('[data-action="up"]')!);
    expect(rowIds()[0]).toBe(before[1]);
    expect(rowIds()[1]).toBe(before[0]);
    expect(stageIds()).toEqual(rowIds());

    const count = rows().length;
    const removedId = rows()[0].getAttribute("data-view-row");
    click(rows()[0].querySelector<HTMLElement>('[data-action="remove"]')!);
    expect(rows().length).toBe(count - 1);
    expect(stageIds()).toEqual(rowIds());
    expect(stageIds()).not.toContain(removedId);
  });

  it("switches layouts, backgrounds, alignment and the title switch", () => {
    mount();
    click(button('button[data-layout-option="triptych"]'));
    expect(q("[data-detail-presentation]")?.getAttribute("data-detail-presentation")).toBe(
      "triptych",
    );
    click(button('button[data-background-option="ink"]'));
    expect(q("[data-detail-presentation]")?.getAttribute("data-background")).toBe("ink");
    click(button('button[data-align-option="start"]'));
    expect(button('button[data-align-option="start"]').getAttribute("aria-pressed")).toBe(
      "true",
    );

    // Titles render once the owner writes one, and switch off cleanly.
    click(rows()[0].querySelector<HTMLElement>("[data-select-view]")!);
    const input = q<HTMLInputElement>("[data-view-title]");
    expect(input).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input!, "The monogram");
    act(() => input!.dispatchEvent(new Event("input", { bubbles: true })));
    expect(q("figcaption")).toBeTruthy();
    click(q<HTMLElement>("[data-show-titles]")!);
    expect(q("figcaption")).toBeNull();
  });

  it("frames a custom focus from the saved invitation", () => {
    mount();
    const start = rows().length;
    click(button("[data-focus-start]"));
    const frame = q("[data-focus-frame]");
    expect(frame).toBeTruthy();
    expect(q("[data-detail-presentation]")).toBeNull();

    const rect = domRect(760, 1064); // the page's own proportions
    frame!.getBoundingClientRect = () => rect;
    pointer("pointerdown", 100, 200);
    pointer("pointermove", 400, 500);
    pointer("pointerup", 400, 500);

    const selection = q("[data-focus-selection]");
    expect(selection).toBeTruthy();
    expect(selection!.style.width).toBe("300px");
    expect(selection!.style.height).toBe("300px");
    click(button("[data-focus-commit]"));

    expect(rows().length).toBe(start + 1);
    expect(rows()[rows().length - 1].textContent).toContain("Custom Focus");
    // 760 px of frame = 1000 design units, so the crop is the exact scale-up.
    expect(
      stageViews().some(
        (view) => view.getAttribute("data-view-kind") === "focus",
      ),
    ).toBe(true);
    const plate = qa("[data-detail-plate]").find(
      (node) => node.getAttribute("data-crop") === "132,263,395,395",
    );
    expect(plate, "focus crop region").toBeTruthy();
    expect(q("[data-focus-frame]")).toBeNull();
  });

  it("exports a high-resolution PNG with real dimensions and an error state", async () => {
    mount();
    const stage = q<HTMLElement>("[data-detail-presentation]");
    expect(stage).toBeTruthy();
    stage!.getBoundingClientRect = () => domRect(800, 1200);

    await act(async () => {
      button('[data-export="png"]').click();
      await new Promise((resolve) => setTimeout(resolve, 320));
    });

    expect(vi.mocked(downloadBlob)).toHaveBeenCalledTimes(1);
    const [, filename] = vi.mocked(downloadBlob).mock.calls[0];
    expect(filename).toBe("test-invitation-presentation.png");
    expect(filename).not.toContain("print");
    expect(q("[data-export-done]")?.textContent).toContain("2400 × 3600 px");
    expect(q("[data-export-error]")).toBeNull();

    mocks.failEncode = true;
    await act(async () => {
      button('[data-export="jpeg"]').click();
      await new Promise((resolve) => setTimeout(resolve, 320));
    });
    expect(q("[data-export-error]")?.textContent).toContain("encode");
    expect(q("[data-export-done]")).toBeNull();
  });

  it("preserves the presentation across reopen", () => {
    const designKey = `reopen-${++key}`;
    render(designKey);
    const initial = rows().length;
    click(button('button[data-add-view="typography"]'));
    click(rows()[0].querySelector<HTMLElement>("[data-select-view]")!);
    const input = q<HTMLInputElement>("[data-view-title]");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input!, "The couple");
    act(() => input!.dispatchEvent(new Event("input", { bubbles: true })));
    const saved = rows().length;
    expect(saved).toBe(initial + 1);

    act(() => root.unmount());
    root = createRoot(container);
    render(designKey);

    expect(rows().length).toBe(saved);
    expect(stageIds()).toEqual(rowIds());
    expect(rows()[0].textContent).toContain("The couple");
    expect(q("[data-detail-presentation]")?.getAttribute("data-detail-presentation")).toBe(
      "spread",
    );
  });
});
