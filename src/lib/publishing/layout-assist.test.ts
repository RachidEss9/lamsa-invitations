import { describe, expect, it } from "vitest";

import {
  createDocument,
  createImageFrame,
  createTextFrame,
} from "./factory";
import { createSequentialIds } from "./ids";
import type { PublicationDocument, PublicationObject } from "./model";
import {
  analyzeLayout,
  applySuggestion,
  suggestionsForPages,
} from "./layout-assist";
import {
  applyDocumentChanges,
  createEditorSession,
  sessionDocument,
  undo,
} from "./session";

const ids = createSequentialIds(5000);

function withImages(): PublicationDocument {
  const document = createDocument({ title: "Assist", pageCount: 3, ids });
  const image = (id: string, assetId: string, x: number, y: number) =>
    ({
      ...createImageFrame({
        name: id,
        layerId: document.pages[0]!.layers[document.pages[0]!.layers.length - 1]!.id,
        x,
        y,
        width: 120,
        height: 90,
        assetId,
      }),
      id,
    }) as PublicationObject;
  return {
    ...document,
    pages: document.pages.map((page, index) =>
      index === 0
        ? {
            ...page,
            objects: [
              image("one", "asset_a", 40, 30),
              image("two", "asset_b", 210, 260),
              image("three", "asset_c", 360, 120),
            ],
          }
        : page,
    ),
  };
}

describe("assisted layout", () => {
  it("finds composition suggestions on a page with photographs", () => {
    const document = withImages();
    const analysis = analyzeLayout(document);
    const suggestions = suggestionsForPages(analysis, [document.pages[0]!.id]);
    expect(suggestions.some((suggestion) => suggestion.code === "compose")).toBe(true);
    expect(suggestions.every((suggestion) => suggestion.changes.length > 0)).toBe(true);
  });

  it("reports empty and overcrowded pages as observations, not errors", () => {
    const document = withImages();
    const crowded = {
      ...document,
      pages: document.pages.map((page, index) =>
        index === 1
          ? {
              ...page,
              objects: Array.from({ length: 6 }, (_, position) =>
                createImageFrame({
                  name: `photo ${position}`,
                  layerId: page.layers[page.layers.length - 1]!.id,
                  x: 30 + (position % 3) * 240,
                  y: 30 + Math.floor(position / 3) * 360,
                  width: 500,
                  height: 500,
                  assetId: `asset_${position}`,
                }),
              ),
            }
          : page,
      ),
    };
    const analysis = analyzeLayout(crowded);
    expect(analysis.issues.some((issue) => issue.code === "empty")).toBe(true);
    expect(analysis.issues.some((issue) => issue.code === "overcrowded")).toBe(true);
  });

  it("is deterministic: the same document yields the same proposal", () => {
    const document = withImages();
    const suggestion = analyzeLayout(document).suggestions.find(
      (entry) => entry.code === "compose",
    )!;
    const first = applySuggestion(document, suggestion);
    const second = applySuggestion(document, suggestion);
    expect(second.pages[0]!.objects.map((object) => object.frame)).toEqual(
      first.pages[0]!.objects.map((object) => object.frame),
    );
  });

  it("produces another deterministic alternative on request", () => {
    const document = withImages();
    const suggestion = analyzeLayout(document).suggestions.find(
      (entry) => entry.code === "compose",
    )!;
    expect(suggestion.variantCount).toBeGreaterThan(1);
    const first = applySuggestion(document, {
      ...suggestion,
      propose: (page) => suggestion.propose(page, 0),
    });
    const alternate = applySuggestion(document, {
      ...suggestion,
      propose: (page) => suggestion.propose(page, 1),
    });
    expect(alternate.pages[0]!.objects.map((object) => object.frame)).not.toEqual(
      first.pages[0]!.objects.map((object) => object.frame),
    );
  });

  it("keeps non-image objects exactly where they are", () => {
    const document = withImages();
    const page = document.pages[0]!;
    const text = createTextFrame({
      name: "Heading",
      layerId: page.layers[page.layers.length - 1]!.id,
      x: 30,
      y: 500,
      width: 200,
      height: 60,
    });
    const withText = {
      ...document,
      pages: document.pages.map((entry, index) =>
        index === 0 ? { ...entry, objects: [...entry.objects, text] } : entry,
      ),
    };
    const suggestion = analyzeLayout(withText).suggestions.find(
      (entry) => entry.code === "compose",
    )!;
    const next = applySuggestion(withText, suggestion);
    const after = next.pages[0]!.objects.find((object) => object.id === text.id)!;
    expect(after.frame).toEqual(text.frame);
  });

  it("applies as one undoable content edit", () => {
    const document = withImages();
    const suggestion = analyzeLayout(document).suggestions.find(
      (entry) => entry.code === "compose",
    )!;
    const next = applySuggestion(document, suggestion);
    const session = createEditorSession(document);
    const applied = applyDocumentChanges(session, next, "Apply layout suggestion");
    expect(sessionDocument(applied).pages[0]!.objects).not.toEqual(
      document.pages[0]!.objects,
    );
    const undone = undo(applied);
    expect(sessionDocument(undone).pages[0]!.objects.map((object) => object.frame)).toEqual(
      document.pages[0]!.objects.map((object) => object.frame),
    );
  });

  it("does not propose on pages with no photographs", () => {
    const document = createDocument({ title: "Plain", pageCount: 1, ids });
    const analysis = analyzeLayout(document);
    expect(analysis.suggestions.some((suggestion) => suggestion.code === "compose")).toBe(
      false,
    );
  });
});
