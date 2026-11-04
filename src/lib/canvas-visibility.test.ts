// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { makeElement, type DesignElement, type DesignPage } from "@/lib/design";
import { toggleVisibility } from "@/lib/visibility";

/**
 * The visibility bug was visible on the canvas, so the fix is checked on the
 * canvas: this mounts the real StudioCanvas, presses a real toggle and looks at
 * what the studio actually renders.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", () => 1);
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

function pageWith(elements: DesignElement[]): DesignPage {
  return {
    id: "page-1",
    name: "Cover",
    background: "#fbfaf7",
    width: 1000,
    height: 1333,
    elements,
  };
}

function Harness() {
  const [elements, setElements] = useState<DesignElement[]>([
    makeElement("text", { id: "title", name: "Title", text: "Amelia & Søren" }),
    makeElement("shape", { id: "rule", name: "Rule", fill: "#710014" }),
  ]);
  const [showHidden, setShowHidden] = useState(false);

  return createElement(
    "div",
    null,
    createElement(
      "button",
      {
        id: "toggle-title",
        onClick: () => setElements((current) => toggleVisibility(current, "title")),
      },
      "toggle title",
    ),
    createElement(
      "button",
      { id: "toggle-ghosts", onClick: () => setShowHidden((value) => !value) },
      "toggle ghosts",
    ),
    createElement(StudioCanvas, {
      page: pageWith(elements),
      time: 100_000,
      zoom: 1,
      imageUrls: {},
      selectedIds: [],
      showHidden,
      revealPreview: new Set<string>(),
      aspectLocked: false,
      onZoom: () => undefined,
      onSelect: () => undefined,
      onMove: () => undefined,
      onResize: () => undefined,
      onRotate: () => undefined,
      onReveal: () => undefined,
    }),
  );
}

function press(id: string) {
  const button = container.querySelector<HTMLButtonElement>(`#${id}`)!;
  act(() => button.click());
}

function layer(id: string) {
  return container.querySelector(`[data-element-id="${id}"]`);
}

describe("hiding a layer on the studio canvas", () => {
  it("removes the layer immediately and keeps its neighbour", () => {
    act(() => root.render(createElement(Harness)));
    expect(layer("title")).toBeTruthy();

    press("toggle-title");
    expect(layer("title")).toBeNull();
    // Independence: a different layer is untouched.
    expect(layer("rule")).toBeTruthy();

    press("toggle-title");
    expect(layer("title")).toBeTruthy();
  });

  it("shows a faint, labelled ghost only when ghosting is switched on", () => {
    act(() => root.render(createElement(Harness)));
    press("toggle-title");
    expect(layer("title")).toBeNull();

    press("toggle-ghosts");
    const ghost = layer("title") as HTMLElement;
    expect(ghost).toBeTruthy();
    expect(ghost.style.opacity).toBe("0.25");
    expect(ghost.textContent).toContain("Hidden");

    press("toggle-ghosts");
    expect(layer("title")).toBeNull();
  });
});
