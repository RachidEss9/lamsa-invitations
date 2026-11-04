// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CanvasControls, type CanvasControlsProps } from "@/components/studio/CanvasControls";

/**
 * These tests press the buttons a host presses. Rendering alone proves
 * nothing: a control that looks right but calls nothing is exactly the failure
 * this phase is about.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function setup(overrides: Partial<CanvasControlsProps> = {}) {
  const handlers = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFit: vi.fn(),
    onActualSize: vi.fn(),
    onReset: vi.fn(),
    onPrevPage: vi.fn(),
    onNextPage: vi.fn(),
    onToggleShowHidden: vi.fn(),
  };
  const props: CanvasControlsProps = {
    percent: 62,
    pageIndex: 1,
    pageCount: 3,
    showHidden: false,
    ...handlers,
    ...overrides,
  };
  act(() => root.render(createElement(CanvasControls, props)));
  return handlers;
}

function press(label: string) {
  const button = container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
  expect(button).toBeTruthy();
  act(() => button!.click());
  return button!;
}

describe("canvas controls", () => {
  it("shows the real percentage and the current page", () => {
    setup();
    expect(container.querySelector("[data-zoom-readout]")?.textContent).toBe("62%");
    expect(container.querySelector("[data-page-readout]")?.textContent).toBe("2 / 3");
  });

  it("wires every zoom button", () => {
    const handlers = setup();

    press("Zoom in");
    expect(handlers.onZoomIn).toHaveBeenCalledTimes(1);

    press("Zoom out");
    expect(handlers.onZoomOut).toHaveBeenCalledTimes(1);

    press("Fit to screen");
    expect(handlers.onFit).toHaveBeenCalledTimes(1);

    press("Actual size, 100%");
    expect(handlers.onActualSize).toHaveBeenCalledTimes(1);

    // The percentage readout is the Reset control.
    press("Zoom 62 percent, reset to fit");
    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });

  it("disables the page arrows at the ends of the document", () => {
    const handlers = setup({ pageIndex: 1, pageCount: 3 });
    press("Previous page");
    press("Next page");
    expect(handlers.onPrevPage).toHaveBeenCalledTimes(1);
    expect(handlers.onNextPage).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    root = createRoot(container);
    setup({ pageIndex: 0, pageCount: 3 });
    const previous = container.querySelector<HTMLButtonElement>('[aria-label="Previous page"]');
    expect(previous?.disabled).toBe(true);
    expect(container.querySelector('[aria-label="Next page"]')?.hasAttribute("disabled")).toBe(
      false,
    );

    act(() => root.unmount());
    root = createRoot(container);
    setup({ pageIndex: 2, pageCount: 3 });
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(
      true,
    );
  });

  it("reflects and toggles the hidden-layer ghost mode", () => {
    const handlers = setup({ showHidden: true });
    const toggle = container.querySelector('[aria-label="Hide hidden layers"]')!;
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    act(() => (toggle as HTMLButtonElement).click());
    expect(handlers.onToggleShowHidden).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    root = createRoot(container);
    setup({ showHidden: false });
    expect(container.querySelector('[aria-label="Show hidden layers"]')).toBeTruthy();
  });

  it("labels the controls for pointer and keyboard users", () => {
    setup();
    for (const label of [
      "Zoom in",
      "Zoom out",
      "Fit to screen",
      "Actual size, 100%",
      "Previous page",
      "Next page",
      "Show hidden layers",
    ]) {
      const button = container.querySelector(`[aria-label="${label}"]`)!;
      expect(button.getAttribute("title")).toBeTruthy();
    }
  });
});
