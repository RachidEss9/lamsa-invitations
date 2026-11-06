import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { WORKSPACES } from "@/lib/workspaces";
import { PUBLISHING_LIBRARY_PATH, isPublishingPath } from "./routes";

/**
 * Discoverability is a navigation fact, not a route fact: the library route
 * existed for a whole phase without a single link into it. These assertions
 * pin the entry to the authenticated workspace navigation, which drives both
 * the desktop rail and the narrow-screen workspace menu.
 */

const DASHBOARD = readFileSync(
  new URL("../../pages/Dashboard.tsx", import.meta.url),
  "utf8",
);
const MAIN = readFileSync(new URL("../../main.tsx", import.meta.url), "utf8");

describe("Publishing Studio navigation", () => {
  const publishing = WORKSPACES.find((workspace) => workspace.id === "publishing");

  it("is a ready workspace with the approved label and route", () => {
    expect(publishing).toMatchObject({
      name: "Publishing Studio",
      shortName: "Publishing",
      route: PUBLISHING_LIBRARY_PATH,
      ready: true,
    });
    expect(publishing?.tagline).toContain("photo albums");
  });

  it("keeps every older workspace in place", () => {
    expect(WORKSPACES.map((workspace) => workspace.name)).toEqual(
      expect.arrayContaining([
        "Digital Experiences",
        "Print Lab",
        "Shape Maker",
        "Press",
        "Publishing Studio",
      ]),
    );
  });

  it("renders the same workspace list in the desktop rail and mobile menu", () => {
    // Both surfaces are fed by WORKSPACES; neither hard-codes a second list.
    expect(DASHBOARD.match(/WORKSPACES\.map/g)?.length).toBe(2);
    expect(DASHBOARD).toContain('aria-label="Workspaces"');
    expect(DASHBOARD).toContain("StudioRail");
  });

  it("marks the entry active on both publishing routes", () => {
    expect(DASHBOARD).toContain("isPublishingPath(pathname)");
    expect(DASHBOARD).toContain("publishingActive");
    expect(isPublishingPath("/publishing")).toBe(true);
    expect(isPublishingPath("/publishing/jd7abcd1234defgh")).toBe(true);
  });

  it("keeps both publishing routes behind StudioGate", () => {
    for (const path of ["/publishing", "/publishing/:publicationId"]) {
      const block = MAIN.slice(MAIN.indexOf(`path="${path}"`));
      expect(block.indexOf("StudioGate"), path).toBeGreaterThan(-1);
      expect(block.indexOf("StudioGate"), path).toBeLessThan(600);
    }
  });

  it("leaves public invitation routes public", () => {
    expect(MAIN).toContain('path="/i/:slug"');
    expect(MAIN).toContain("element={<InvitationPage />}");
  });
});
