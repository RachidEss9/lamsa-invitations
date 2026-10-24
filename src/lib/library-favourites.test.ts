import { describe, it, expect } from "vitest";
import {
  FAVOURITES_KEY,
  favouriteKey,
  isFavourite,
  kindOfFavourite,
  readFavourites,
  toggleFavouriteKey,
  writeFavourites,
} from "./library-favourites";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
}

describe("library favourites", () => {
  it("builds namespaced keys", () => {
    expect(favouriteKey("font", "amiri")).toBe("font:amiri");
    expect(kindOfFavourite("font:amiri")).toBe("font");
  });

  it("adds a new favourite to the front", () => {
    const next = toggleFavouriteKey(["font:amiri"], "template:ivory");
    expect(next).toEqual(["template:ivory", "font:amiri"]);
  });

  it("removes an existing favourite", () => {
    expect(
      toggleFavouriteKey(["font:amiri", "template:ivory"], "font:amiri"),
    ).toEqual(["template:ivory"]);
  });

  it("does not duplicate a key", () => {
    const once = toggleFavouriteKey([], "asset:paper");
    const twice = toggleFavouriteKey(once, "asset:paper");
    const thrice = toggleFavouriteKey(twice, "asset:paper");
    expect(thrice).toEqual(["asset:paper"]);
  });

  it("caps the list so storage cannot grow without bound", () => {
    let keys: string[] = [];
    for (let index = 0; index < 420; index += 1) {
      keys = toggleFavouriteKey(keys, `font:${index}`);
    }
    expect(keys).toHaveLength(400);
    expect(keys[0]).toBe("font:419");
  });

  it("round-trips through storage", () => {
    const store = fakeStorage();
    writeFavourites(["font:amiri", "template:ivory"], store);
    expect(readFavourites(store)).toEqual(["font:amiri", "template:ivory"]);
    expect(isFavourite(readFavourites(store), "template:ivory")).toBe(true);
  });

  it("ignores corrupt or non-array values", () => {
    expect(readFavourites(fakeStorage({ [FAVOURITES_KEY]: "not json" }))).toEqual(
      [],
    );
    expect(readFavourites(fakeStorage({ [FAVOURITES_KEY]: '{"a":1}' }))).toEqual(
      [],
    );
  });

  it("drops non-string entries without losing good ones", () => {
    const store = fakeStorage({
      [FAVOURITES_KEY]: JSON.stringify(["font:amiri", 4, null, ""]),
    });
    expect(readFavourites(store)).toEqual(["font:amiri"]);
  });

  it("works without storage at all", () => {
    expect(readFavourites(null)).toEqual([]);
    expect(writeFavourites(["font:amiri"], null)).toEqual(["font:amiri"]);
  });
});
