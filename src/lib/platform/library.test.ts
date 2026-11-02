import { describe, expect, it } from "vitest";
import { filterLibrary } from "@/lib/platform/library";

interface Item {
  id: string;
  name: string;
  note: string;
  group: string;
}

const ITEMS: Item[] = [
  { id: "a", name: "Burgundy Arch", note: "letterpress frame", group: "Frames" },
  { id: "b", name: "Ivory Rule", note: "thin border", group: "Frames" },
  { id: "c", name: "Silk Ribbon", note: "print texture", group: "Textures" },
];

const text = (item: Item) => [item.name, item.note, item.group];

describe("filterLibrary", () => {
  it("returns everything when there is no query", () => {
    expect(filterLibrary(ITEMS, { query: "  ", text })).toHaveLength(3);
  });

  it("matches case-insensitively across every text field", () => {
    expect(
      filterLibrary(ITEMS, { query: "LETTERPRESS", text }).map((item) => item.id),
    ).toEqual(["a"]);
    expect(
      filterLibrary(ITEMS, { query: "frames", text }).map((item) => item.id),
    ).toEqual(["a", "b"]);
  });

  it("applies the category restriction before searching", () => {
    expect(
      filterLibrary(ITEMS, {
        query: "",
        matches: (item) => item.group === "Textures",
        text,
      }).map((item) => item.id),
    ).toEqual(["c"]);
  });

  it("keeps only favourites when favourites-only is on", () => {
    const isFavourite = (item: Item) => item.id === "b";
    expect(
      filterLibrary(ITEMS, {
        query: "",
        favouritesOnly: true,
        isFavourite,
        text,
      }).map((item) => item.id),
    ).toEqual(["b"]);
    // A tab without stars has no favourite entries, so the star filter hides
    // everything rather than silently showing all of it.
    expect(filterLibrary(ITEMS, { query: "", favouritesOnly: true, text })).toEqual([]);
  });

  it("combines restriction, star and query", () => {
    expect(
      filterLibrary(ITEMS, {
        query: "border",
        matches: (item) => item.group === "Frames",
        favouritesOnly: true,
        isFavourite: (item) => item.id === "b",
        text,
      }).map((item) => item.id),
    ).toEqual(["b"]);
  });
});