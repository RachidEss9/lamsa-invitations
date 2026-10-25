// @vitest-environment jsdom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { makeElement, type DesignElement, type DesignPage } from "@/lib/design";

/**
 * The canvas hands direct manipulation to the same drag engine that moves
 * layers: a pointerdown on a handle starts a resize, a pointermove reports the
 * new box, and pointerup ends it. These tests exist because that wiring cannot
 * be checked by the type system — without it a layer is only resizable through
 * the Inspector's numeric fields.
 */

let container: HTMLDivElement;
let root: Root;
let frames: FrameRequestCallback[] = [];

/** Runs the callbacks a real browser would run on the next paint. */
function flushFrame() {
  const queued = frames;
  frames = [];
  act(() => {
    queued.forEach((callback) => callback(0));
  });
}

function pageWith(element: DesignElement): DesignPage {
  return {
    id: "page-1",
    name: "Page 1",
    background: "#fbfaf7",
    width: 1000,
    height: 1333,
    elements: [element],
  };
}

type CanvasProps = ComponentProps<typeof StudioCanvas>;

function render(page: DesignPage, overrides: Partial<CanvasProps> = {}) {
  const onResize = vi.fn();
  const onRotate = vi.fn();
  const onMove = vi.fn();
  const props: CanvasProps = {
    page,
    time: 0,
    zoom: 1,
    imageUrls: {},
    selectedIds: page.elements.map((candidate) => candidate.id),
    showHidden: false,
    revealPreview: new Set<string>(),
    aspectLocked: false,
    onZoom: () => undefined,
    onSelect: () => undefined,
    onMove,
    onResize,
    onRotate,
    onReveal: () => undefined,
    ...overrides,
  };
  act(() => {
    root.render(createElement(StudioCanvas, props));
  });
  return { onResize, onRotate, onMove };
}

/** React listens for the native event names, so plain MouseEvents are enough. */
function pointer(type: "pointerdown" | "pointermove" | "pointerup", x: number, y: number) {
  return new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  // jsdom has no ResizeObserver; the canvas uses one only to fit the page.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  // Geometry is batched to one update per frame, so the tests own the frame
  // clock instead of waiting on jsdom's timer.
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("canvas selection handles", () => {
  it("shows all eight resize points and a rotation grip for one selected layer", () => {
    const element = makeElement("text", { id: "title", text: "Save the date" });
    render(pageWith(element));

    const handles = container.querySelectorAll('[aria-label^="Resize from"]');
    expect(handles).toHaveLength(8);
    expect(container.querySelector('[aria-label="Rotate layer"]')).toBeTruthy();
  });

  it("offers no handles for a locked layer", () => {
    const element = makeElement("text", { id: "title", locked: true });
    render(pageWith(element));

    expect(container.querySelector('[aria-label^="Resize from"]')).toBeNull();
    expect(container.querySelector('[aria-label="Rotate layer"]')).toBeNull();
  });

  it("offers no handles while several layers are selected", () => {
    const first = makeElement("text", { id: "a", x: 40, y: 40 });
    const second = makeElement("shape", { id: "b", x: 400, y: 400 });
    const page = pageWith(first);
    page.elements.push(second);
    render(page);

    expect(container.querySelector('[aria-label^="Resize from"]')).toBeNull();
  });

  it("resizes the layer when a corner handle is dragged", () => {
    const element = makeElement("text", { id: "title", x: 100, y: 100, w: 400, h: 120 });
    const { onResize } = render(pageWith(element));

    const handle = container.querySelector('[aria-label="Resize from the bottom right"]')!;
    act(() => {
      handle.dispatchEvent(pointer("pointerdown", 500, 220));
    });
    act(() => {
      window.dispatchEvent(pointer("pointermove", 560, 260));
    });
    flushFrame();

    expect(onResize).toHaveBeenCalled();
    const [id, box] = onResize.mock.calls[onResize.mock.calls.length - 1];
    expect(id).toBe("title");
    expect(box.w).toBeGreaterThan(400);
    expect(box.h).toBeGreaterThan(120);
    expect(box.x).toBe(100);
    expect(box.y).toBe(100);

    act(() => {
      window.dispatchEvent(pointer("pointerup", 560, 260));
    });
    // Once the drag ends, further movement must not keep resizing the layer.
    const settled = onResize.mock.calls.length;
    act(() => {
      window.dispatchEvent(pointer("pointermove", 700, 400));
    });
    flushFrame();
    expect(onResize).toHaveBeenCalledTimes(settled);
  });

  it("batches several pointer moves into one geometry update per frame", () => {
    const element = makeElement("shape", { id: "panel", x: 100, y: 100, w: 300, h: 300 });
    const { onResize } = render(pageWith(element));

    const handle = container.querySelector('[aria-label="Resize from the bottom right"]')!;
    act(() => {
      handle.dispatchEvent(pointer("pointerdown", 400, 400));
    });
    act(() => {
      window.dispatchEvent(pointer("pointermove", 430, 430));
      window.dispatchEvent(pointer("pointermove", 460, 460));
      window.dispatchEvent(pointer("pointermove", 500, 500));
    });

    // Nothing reaches the document until the frame runs…
    expect(onResize).not.toHaveBeenCalled();
    flushFrame();

    // …and then exactly one update, carrying the final pointer position.
    expect(onResize).toHaveBeenCalledTimes(1);
    const coalesced = onResize.mock.calls[0][1];
    expect(coalesced.w).toBeGreaterThan(300);

    // A second drag that only ever lands on that same point produces exactly
    // the same box, which proves the batched update used the last event and
    // not one of the two it replaced.
    act(() => {
      window.dispatchEvent(pointer("pointerup", 500, 500));
    });
    act(() => {
      handle.dispatchEvent(pointer("pointerdown", 400, 400));
    });
    act(() => {
      window.dispatchEvent(pointer("pointermove", 500, 500));
    });
    flushFrame();

    expect(onResize).toHaveBeenCalledTimes(2);
    expect(onResize.mock.calls[1][1]).toEqual(coalesced);
  });

  it("turns the layer when the rotation grip is dragged", () => {
    const element = makeElement("shape", { id: "frame", x: 100, y: 100, w: 400, h: 400 });
    const { onRotate } = render(pageWith(element));

    // The pivot sits at 5% of the layer's centre (the page is unscaled in
    // jsdom), so a quarter turn around it is an exact 90° change.
    const grip = container.querySelector('[aria-label="Rotate layer"]')!;
    act(() => {
      grip.dispatchEvent(pointer("pointerdown", 15, -85));
    });
    act(() => {
      window.dispatchEvent(pointer("pointermove", 115, 15));
    });
    flushFrame();

    expect(onRotate).toHaveBeenCalled();
    const [id, rotation] = onRotate.mock.calls[onRotate.mock.calls.length - 1];
    expect(id).toBe("frame");
    expect(rotation).toBeGreaterThan(70);
    expect(rotation).toBeLessThan(110);
  });
});
