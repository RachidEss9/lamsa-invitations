import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InvitationJourney } from "@/components/invitation/InvitationJourney";
import { OPENING_EXPERIENCES, type DesignDocument } from "./design";

function design(): DesignDocument {
  return {
    version: 1,
    pages: [
      {
        id: "page-1",
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
      },
    ],
    opening: {
      experience: "secret-world" as const,
      duration: 3200,
      autoOpen: false,
      welcome: "For {{guest}}",
    },
    closing: { enabled: true, style: "message", message: "With love", duration: 1400 },
    transition: { preset: "fade", duration: 700 },
  };
}

describe("invitation journey rendering", () => {
  it("renders saved page content in the shared journey (no player chrome)", () => {
    const html = renderToStaticMarkup(
      createElement(InvitationJourney, {
        design: design(),
        imageUrls: {},
        guestName: "Amara",
        names: "Amelia & Søren",
        reducedMotion: true,
      }),
    );
    expect(html).toContain("Amelia &amp; Søren");
    // No playback transport or page picker reaches the guest.
    expect(html).not.toContain("Pause");
    expect(html).not.toContain("Previous section");
    expect(html).not.toContain("Next section");
    // The last section of a closing invitation offers the closing hand-off.
    expect(html).toContain("Close the invitation");
  });

  it("starts on the opening cover when motion is allowed", () => {
    const html = renderToStaticMarkup(
      createElement(InvitationJourney, {
        design: design(),
        imageUrls: {},
        reducedMotion: false,
      }),
    );
    // The opening stage renders its own tap affordance before any page, and
    // the invitation card inside it is the saved first section itself.
    expect(html).toContain("Begin the reveal");
    expect(html).toContain("Amelia &amp; Søren");
    expect(html).toContain("data-opening-card");
    // Exactly one invitation and one environment — no duplicate reveal layer.
    expect(html.split("data-opening-card").length - 1).toBe(1);
    expect(html.split("data-opening-environment").length - 1).toBe(1);
    expect(html).not.toContain("Close the invitation");
    expect(html).not.toContain("data-journey-cue");
  });

  it("gives every opening preset the real first section to reveal", () => {
    for (const experience of OPENING_EXPERIENCES) {
      if (experience.id === "none") continue;
      const doc = design();
      doc.opening.experience = experience.id;
      const html = renderToStaticMarkup(
        createElement(InvitationJourney, {
          design: doc,
          imageUrls: {},
          guestName: "Amara",
          reducedMotion: false,
        }),
      );
      expect(html, experience.id).toContain("data-opening-card");
      expect(html, experience.id).toContain("Amelia &amp; Søren");
      expect(html, experience.id).toContain('role="dialog"');
    }
  });

  it("never renders playback transport or a page selector", () => {
    const html = renderToStaticMarkup(
      createElement(InvitationJourney, {
        design: design(),
        imageUrls: {},
        reducedMotion: true,
      }),
    );
    expect(html).not.toContain("Pause");
    expect(html).not.toContain("Play");
    expect(html).not.toContain("Replay this page");
    expect(html).not.toMatch(/aria-label="Page \d/);
  });
});
