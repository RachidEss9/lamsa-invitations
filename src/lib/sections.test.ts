import { describe, expect, it } from "vitest";
import {
  nextSectionId,
  normalizeSections,
  sectionForPage,
  sectionsOf,
} from "@/lib/sections";
import type { DesignPage, DesignSection, SectionTone } from "@/lib/design";

const PAGE = (id: string, section?: string): DesignPage =>
  ({ id, section, elements: [] }) as unknown as DesignPage;

const SECTION = (
  id: string,
  title: string,
  tone?: SectionTone,
): DesignSection => ({ id, title, tone });

describe("sections", () => {
  it("returns the document's sections, and an empty list when absent", () => {
    expect(sectionsOf({ sections: [SECTION("s1", "One")] } as never)).toEqual([
      SECTION("s1", "One"),
    ]);
    expect(sectionsOf({} as never)).toEqual([]);
  });

  it("drops sections with no id and de-duplicates by id", () => {
    const normalized = normalizeSections(
      [SECTION("s1", "One"), SECTION("", "Ghost"), SECTION("s1", "Repeat")] as never,
    );
    expect(normalized).toHaveLength(1);
    expect(normalized[0].title).toBe("One");
  });

  it("derives the next id after the highest numeric suffix", () => {
    expect(nextSectionId([])).toBe("section-1");
    expect(nextSectionId([SECTION("section-1", "A"), SECTION("section-3", "B")] as never)).toBe(
      "section-4",
    );
    expect(nextSectionId([SECTION("custom", "A")] as never)).toBe("section-1");
  });

  it("resolves the section a page belongs to", () => {
    const sections = [
      SECTION("s1", "Cover"),
      SECTION("s2", "Details"),
    ] as never;
    expect(sectionForPage([PAGE("p1", "s1"), PAGE("p2", "s2")] as never, "p1", sections)?.title).toBe(
      "Cover",
    );
    // A page with no section falls back to the first one, so there is always
    // somewhere to put new elements.
    expect(sectionForPage([PAGE("p1")] as never, "p1", sections)?.title).toBe("Cover");
    expect(sectionForPage([PAGE("p1")] as never, "p1", [])).toBeUndefined();
  });
});