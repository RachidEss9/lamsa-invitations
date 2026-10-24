import { describe, it, expect } from "vitest";
import { PAGE_LAYOUTS, pageLayoutById } from "./layouts";
import type { InvitationContent } from "./invitation";
import { pageSizeOf } from "./design";

const content: InvitationContent = {
  title: "Amelia & Søren",
  occasion: "wedding",
  templateId: "published",
  names: { primary: "Amelia", secondary: "Søren" },
  eyebrow: "Together",
  message: "Join us",
  date: "2026-06-14",
  time: "16:00",
  venueName: "The Garden Hall",
  venueAddress: "1 Main Street",
  palette: { background: "#f2f1ed", ink: "#161616", accent: "#710014" },
  fontPair: "romance",
  layout: "centered",
  motif: "sprig",
  animations: true,
};

const rsvp = pageLayoutById("rsvp-card");
const details = pageLayoutById("details-card");

describe("stationery page layouts", () => {
  it("are real A6 pages with a print margin", () => {
    for (const layout of [rsvp, details]) {
      expect(layout.category).toBe("Stationery");
      const page = layout.build(content);
      const size = pageSizeOf(page);
      expect(Math.round(size.width)).toBe(397);
      expect(Math.round(size.height)).toBe(559);
      expect(page.margin).toBeGreaterThan(0);
      expect(page.bleed).toBeGreaterThan(0);
    }
  });

  it("keep every layer inside the sheet", () => {
    for (const layout of [rsvp, details]) {
      const page = layout.build(content);
      const { width, height } = pageSizeOf(page);
      for (const element of page.elements) {
        expect(element.x).toBeGreaterThanOrEqual(0);
        expect(element.y).toBeGreaterThanOrEqual(0);
        expect(element.x + element.w).toBeLessThanOrEqual(width + 0.5);
        expect(element.y + element.h).toBeLessThanOrEqual(height + 0.5);
      }
    }
  });

  it("builds an editable RSVP with accept and decline", () => {
    const page = rsvp.build(content);
    const texts = page.elements
      .filter((element) => element.kind === "text")
      .map((element) => element.text);
    expect(texts).toContain("Kindly reply");
    expect(texts).toContain("Accepts with pleasure");
    expect(texts).toContain("Declines with regret");
    expect(texts).toContain("Amelia & Søren");
    expect(
      page.elements.filter((element) => element.kind === "text").every((el) => !el.locked),
    ).toBe(true);
    // The reply boxes are real shapes, so they print and can be restyled.
    expect(
      page.elements.filter(
        (element) => element.kind === "shape" && element.shape === "rect",
      ),
    ).toHaveLength(2);
  });

  it("carries the invitation's own venue and date onto the details card", () => {
    const page = details.build(content);
    const texts = page.elements.map((element) => element.text).filter(Boolean);
    expect(texts.some((value) => value?.includes("The Garden Hall"))).toBe(true);
    expect(texts.some((value) => value?.includes("1 Main Street"))).toBe(true);
    expect(texts.some((value) => value?.includes("2026"))).toBe(true);
  });

  it("leaves classic page layouts on the studio canvas", () => {
    const cover = pageLayoutById("cover").build(content);
    expect(cover.width).toBeUndefined();
    expect(pageSizeOf(cover)).toEqual({ width: 1000, height: 1333.33 });
  });

  it("every layout id resolves and unknown ids fall back safely", () => {
    for (const layout of PAGE_LAYOUTS) {
      expect(pageLayoutById(layout.id).id).toBe(layout.id);
    }
    expect(pageLayoutById("missing").id).toBe(PAGE_LAYOUTS[0].id);
  });
});
