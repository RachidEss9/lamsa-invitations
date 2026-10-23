import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InvitationJourney } from "@/components/invitation/InvitationJourney";
import type { DesignDocument } from "./design";

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
      experience: "envelope",
      duration: 1400,
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
    // The opening stage renders its own tap affordance before any page.
    expect(html.length).toBeGreaterThan(1000);
    expect(html).not.toContain("Close the invitation");
  });
});
