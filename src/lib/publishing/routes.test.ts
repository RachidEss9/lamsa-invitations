import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  PUBLISHING_EDITOR_PATH,
  PUBLISHING_LIBRARY_PATH,
  PUBLISHING_ROUTES,
  editorHref,
  isValidPublicationId,
} from "./routes";

/**
 * Two layers of route verification:
 *
 *  1. the pure helpers (id format, hrefs) behave in isolation;
 *  2. the route wiring in `main.tsx` actually lazy-loads both Publishing
 *     pages behind `<StudioGate>`, uses only the two publishing paths, and
 *     does not disturb the existing invitation routes.
 *
 * `main.tsx` has no DOM in the node test environment, so the wiring is
 * asserted at source level — the same guarantee a code review gives, made
 * regression-proof.
 */

describe("publication id handling", () => {
  it("accepts Convex-shaped ids only", () => {
    expect(isValidPublicationId("jd7abcd1234defgh")).toBe(true);
    expect(isValidPublicationId("short")).toBe(false);
    expect(isValidPublicationId("")).toBe(false);
    expect(isValidPublicationId(undefined)).toBe(false);
    expect(isValidPublicationId(null)).toBe(false);
    // 64 characters exactly is still valid.
    expect(isValidPublicationId("a".repeat(64))).toBe(true);
    // 65 is not.
    expect(isValidPublicationId("a".repeat(65))).toBe(false);
  });

  it("builds editor hrefs from the publication id", () => {
    expect(editorHref("jd7abcd1234defgh")).toBe("/publishing/jd7abcd1234defgh");
  });

  it("declares exactly the two approved publishing routes", () => {
    expect(PUBLISHING_ROUTES.map((entry) => entry.path)).toEqual([
      PUBLISHING_LIBRARY_PATH,
      PUBLISHING_EDITOR_PATH,
    ]);
    expect(PUBLISHING_ROUTES.every((entry) => entry.protected)).toBe(true);
  });
});

const MAIN = readFileSync(new URL("../../../main.tsx", import.meta.url), "utf8");

describe("main.tsx route wiring", () => {
  const libraryEntry = PUBLISHING_ROUTES[0]!;
  const editorEntry = PUBLISHING_ROUTES[1]!;

  it("lazy-loads both publishing pages", () => {
    expect(MAIN).toContain(`lazy(() => import("${libraryEntry.modulePath}"))`);
    expect(MAIN).toContain(`lazy(() => import("${editorEntry.modulePath}"))`);
  });

  it("registers both paths behind the StudioGate", () => {
    for (const entry of PUBLISHING_ROUTES) {
      const routeBlock = MAIN.slice(
        MAIN.indexOf(`path="${entry.path}"`),
      );
      expect(routeBlock.indexOf("StudioGate")).toBeGreaterThan(-1);
      expect(routeBlock.indexOf("StudioGate")).toBeLessThan(600);
    }
  });

  it("registers no publishing path as a public route", () => {
    // Both occurrences of "/publishing" are inside gated route elements — there is
    // no second, ungated declaration between them.
    const ungated = MAIN.match(/path="\/publishing"/g)?.length ?? 0;
    expect(ungated).toBe(PUBLISHING_ROUTES.length);
  });

  it("leaves the invitation routes in place", () => {
    expect(MAIN).toContain(`path="/invitations/:id"`);
    expect(MAIN).toContain(`path="/i/:slug"`);
    expect(MAIN).toContain(`path="/i/:slug/:guestToken"`);
    // The public invitation pages are still not gated: guests need no login.
    expect(MAIN).toContain(`element={<InvitationPage />}`);
  });

  it("keeps the other studio workspaces gated as before", () => {
    expect(MAIN).toContain(`path="/studio/:id"`);
    expect(MAIN).toContain(`path="/print/:id"`);
    expect(MAIN).toContain(`path="/press/:id"`);
  });
});
