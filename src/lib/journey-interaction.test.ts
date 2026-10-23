// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { InvitationJourney } from "@/components/invitation/InvitationJourney";
import type { DesignDocument, DesignPage } from "./design";

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

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
});

function page(id: string, text: string): DesignPage {
  return {
    id,
    name: id,
    background: "#f2f1ed",
    elements: [
      {
        id: `${id}-text`,
        kind: "text",
        name: id,
        text,
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

function design(): DesignDocument {
  return {
    version: 1,
    pages: [page("Cover", "Amelia and Soren"), page("Venue", "The Garden Hall")],
    opening: { experience: "none", duration: 1200, autoOpen: false, welcome: "" },
    closing: { enabled: true, style: "message", message: "With love, always", duration: 1200 },
    transition: { preset: "fade", duration: 600 },
  };
}

function mount(node: React.ReactElement) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root?.render(node));
  return host;
}

function buttonByText(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    (button.textContent ?? "").trim().startsWith(label),
  );
}

describe("guest journey interaction", () => {
  it("reveals one section at a time and closes on the last one", () => {
    const container = mount(
      createElement(InvitationJourney, {
        design: design(),
        imageUrls: {},
        reducedMotion: true,
      }),
    );

    // Section one is present; section two has not been forced in yet.
    expect(container.textContent).toContain("Amelia and Soren");
    expect(container.textContent).not.toContain("The Garden Hall");

    const continueButton = buttonByText(container, "Continue");
    expect(continueButton).toBeTruthy();
    act(() => continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(container.textContent).toContain("The Garden Hall");
    const closeButton = buttonByText(container, "Close the invitation");
    expect(closeButton).toBeTruthy();

    act(() => closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.textContent).toContain("With love, always");
    expect(buttonByText(container, "Continue")).toBeUndefined();
  });

  it("offers no transport controls to the guest", () => {
    const container = mount(
      createElement(InvitationJourney, {
        design: design(),
        imageUrls: {},
        reducedMotion: true,
      }),
    );
    const labels = Array.from(container.querySelectorAll("button")).map(
      (button) => `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`,
    );
    expect(labels.some((label) => /pause|resume|replay|previous section|next section/i.test(label))).toBe(false);
  });
});
