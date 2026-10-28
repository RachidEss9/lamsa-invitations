// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RevealOpening } from "@/components/invitation/RevealOpening";

let root: Root | null = null;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  class Noop {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= Noop;
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
});

describe("debug cover", () => {
  it("prints the cover markup", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
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
          onOpen: vi.fn(),
        }),
      ),
    );
    const stage = host.querySelector("[data-interactive-opening]");
    console.log("stage:", stage?.getAttribute("data-stage"));
    console.log("hint:", host.querySelector("[data-hint]")?.textContent ?? "NONE");
    console.log("labels:", [...host.querySelectorAll("button")].map((b) => b.getAttribute("aria-label")));
    expect(stage).toBeTruthy();
  });
});
