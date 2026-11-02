import { describe, expect, it } from "vitest";
import {
  appendSection,
  assignPageToSection,
  removeSection,
  reorderSections,
  sectionForPage,
  updateSection,
} from "@/lib/sections";
import type { DesignDocument, DesignPage, DesignSection } from "@/lib/design";

const DOC = (): DesignDocument =>
  ({
    sections: [
      { id: "s1", title: "Cover" },
      { id: "s2", title: "Details" },
    ],
    pages: [
      { id: "p1", section: "s1", elements: [] },
      { id: "p2", section: "s2", elements: [] },
      { id: "p3", elements: [] },
    ],
  }) as unknown as DesignDocument;

describe("section editing", () => {
  it("assigns a page to an existing section without touching the others", () => {
    const next = assignPageToSection(DOC(), 2, "s2");
    expect(next.pages[2].section).toBe("s2");
    expect(next.pages[0].section).toBe("s1");
    expect(DOC().pages[2].section).toBeUndefined();
  });

  it("refuses an unknown section id", () => {
    const doc = DOC();
    expect(assignPageToSection(doc, 0, "nope")).toBe(doc);
  });

  it("renames a section in place", () => {
    const next = updateSection(DOC(), "s2", { title: "Timings" });
    expect(next.sections?.map((section: DesignSection) => section.title)).toEqual([
      "Cover",
      "Timings",
    ]);
  });

  it("reorders sections, clamping to the list", () => {
    const moved = reorderSections(DOC(), "s2", 0);
    expect(moved.sections?.map((section) => section.id)).toEqual(["s2", "s1"]);
    expect(reorderSections(DOC(), "s1", 99).sections?.[1]?.id).toBe("s1");
    expect(reorderSections(DOC(), "missing", 0).sections).toHaveLength(2);
  });

  it("appends a section with a fresh id", () => {
    const { design, id } = appendSection(DOC(), "  Gifts  ");
    expect(id).toBe("section-1");
    expect(design.sections?.[2]).toEqual({ id, title: "Gifts" });
    expect(appendSection(DOC(), "   ").design.sections?.[2].title).toBe(
      "Untitled section",
    );
  });

  it("removes a section and reparents its pages", () => {
    const next = removeSection(DOC(), "s2");
    expect(next.sections).toHaveLength(1);
    // p2 sat in the removed section and falls back to the one above it.
    expect(next.pages[1].section).toBe("s1");
    // p1 was untouched.
    expect(next.pages[0].section).toBe("s1");
    expect(removeSection(DOC(), "missing").sections).toHaveLength(2);
  });

  it("keeps a page answerable after every edit", () => {
    const next = removeSection(DOC(), "s1");
    expect(sectionForPage(next.pages, "p1", next.sections ?? [])?.id).toBe("s2");
    expect(sectionForPage(next.pages, "p1", [])).toBeUndefined();
  });
});