// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
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
  vi.useRealTimers();
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

function buttonByLabel(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.getAttribute("aria-label") === label,
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
    const closeButton = buttonByLabel(container, "Close the invitation");
    expect(closeButton).toBeTruthy();
    // The option to finish is stated in words, not an unlabelled glyph.
    expect(closeButton?.textContent).toContain("Close");

    act(() => closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.textContent).toContain("With love, always");
    expect(buttonByText(container, "Continue")).toBeUndefined();
  });

  it("hands the guest the reference opening, then settles the first section", () => {
    vi.useFakeTimers();
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      queue.push(callback);
      return queue.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const withOpening = design();
    withOpening.opening = {
      experience: "envelope",
      duration: 1200,
      autoOpen: false,
      welcome: "",
    };

    const container = mount(
      createElement(InvitationJourney, {
        design: withOpening,
        imageUrls: {},
        guestName: "Amara",
        reducedMotion: false,
      }),
    );

    // The envelope suite runs the reference engine even though this saved
    // design carries no guest-driven settings: the guest taps the real seal.
    const open = buttonByLabel(container, "Tap the seal to begin");
    expect(open).toBeTruthy();
    act(() => open?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(
      container
        .querySelector("[data-interactive-opening]")
        ?.getAttribute("data-stage"),
    ).toBe("breaking");

    // The invitation is inside the envelope before the guest opens it.
    expect(container.querySelector("[data-opening-card]")).toBeTruthy();

    // The guest can always reach the invitation: the stage offers the hand-off.
    const skip = buttonByLabel(container, "Skip the opening animation");
    expect(skip).toBeTruthy();
    act(() => skip?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    // The opening has handed over to the same section, now a live page.
    expect(container.querySelector("[data-opening-card]")).toBeNull();
    expect(container.textContent).toContain("Amelia and Soren");

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(buttonByLabel(container, "Continue to section 2 of 2")).toBeTruthy();

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("offers an invitation-integrated flourish rather than a button plaque", () => {
    const container = mount(
      createElement(InvitationJourney, {
        design: design(),
        imageUrls: {},
        reducedMotion: true,
      }),
    );
    const cue = container.querySelector("[data-journey-cue]");
    expect(cue).toBeTruthy();
    // It is a real, named control with a drawn ornament, not a page picker.
    expect(cue?.tagName).toBe("BUTTON");
    expect(cue?.getAttribute("aria-label")).toBe("Continue to section 2 of 2");
    expect(cue?.querySelector("svg")).toBeTruthy();
    expect(container.querySelector("[aria-label^='Page ']")).toBeNull();
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
