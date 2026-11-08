import { describe, expect, it } from "vitest";

import {
  createDocument,
  createImageFrame,
  createParagraph,
  createShape,
  createStory,
  createTextFrame,
} from "./factory";
import { createSequentialIds } from "./ids";
import type { PublicationDocument, PublicationPage } from "./model";
import {
  DEFAULT_PREFLIGHT_SETTINGS,
  effectiveDpi,
  runPreflight,
} from "./preflight";

const ids = createSequentialIds(7000);

function emptyDocument(): PublicationDocument {
  return createDocument({ title: "Preflight", pageCount: 2, ids });
}

function firstPage(document: PublicationDocument): PublicationPage {
  return document.pages[0]!;
}

function layerId(page: PublicationPage): string {
  return page.layers[page.layers.length - 1]!.id;
}

describe("preflight", () => {
  it("reports empty pages as warnings attached to the page", () => {
    const document = emptyDocument();
    const report = runPreflight(document, []);
    const empty = report.findings.find((finding) => finding.code === "page/empty");
    expect(empty).toBeDefined();
    expect(empty?.pageId).toBe(firstPage(document).id);
    expect(empty?.confidence).toBe("measured");
  });

  it("flags a missing image file as an error", () => {
    const document = emptyDocument();
    const page = firstPage(document);
    const image = createImageFrame({
      name: "Photo",
      layerId: layerId(page),
      x: 40,
      y: 40,
      width: 240,
      height: 180,
      assetId: "asset_missing",
    });
    const withImage: PublicationDocument = {
      ...document,
      pages: document.pages.map((entry, index) =>
        index === 0 ? { ...entry, objects: [image] } : entry,
      ),
    };
    const report = runPreflight(withImage, [
      {
        id: "asset_missing",
        name: "lost.jpg",
        width: 800,
        height: 600,
        mime: "image/jpeg",
        storageId: undefined,
      },
    ]);
    expect(report.findings.some((finding) => finding.code === "image/missing-file")).toBe(
      true,
    );
    expect(report.errors).toBeGreaterThan(0);
  });

  it("measures effective resolution from the placed frame size", () => {
    const document = emptyDocument();
    const page = firstPage(document);
    const image = createImageFrame({
      name: "Photo",
      layerId: layerId(page),
      x: 10,
      y: 10,
      width: 360,
      height: 360,
      assetId: "asset_small",
    });
    const withImage: PublicationDocument = {
      ...document,
      pages: document.pages.map((entry, index) =>
        index === 0 ? { ...entry, objects: [image] } : entry,
      ),
    };
    const report = runPreflight(withImage, [
      {
        id: "asset_small",
        name: "small.jpg",
        width: 300,
        height: 300,
        mime: "image/jpeg",
        storageId: "storage_1",
      },
    ]);
    const low = report.findings.find(
      (finding) => finding.code === "image/low-resolution",
    );
    expect(low).toBeDefined();
    expect(low?.confidence).toBe("measured");
    expect(effectiveDpi(360, 1, 300)).toBe(60);
  });

  it("flags a master reference that no longer exists", () => {
    const document = emptyDocument();
    const page = firstPage(document);
    const broken: PublicationDocument = {
      ...document,
      pages: document.pages.map((entry, index) =>
        index === 0 ? { ...entry, masterId: "master_missing" } : entry,
      ),
    };
    const report = runPreflight(broken, []);
    const finding = report.findings.find(
      (candidate) => candidate.code === "page/master-missing",
    );
    expect(finding?.severity).toBe("error");
    expect(finding?.pageId).toBe(page.id);
  });

  it("flags objects outside the bleed and a missing layer", () => {
    const document = emptyDocument();
    const outside = createShape({
      name: "Offcut",
      layerId: "layer_missing",
      x: -200,
      y: -200,
      width: 40,
      height: 40,
      fill: "#000000",
      strokeWidth: 0,
    });
    const modified: PublicationDocument = {
      ...document,
      pages: document.pages.map((entry, index) =>
        index === 0 ? { ...entry, objects: [outside] } : entry,
      ),
    };
    const report = runPreflight(modified, []);
    expect(
      report.findings.some((finding) => finding.code === "object/outside-bleed"),
    ).toBe(true);
    expect(
      report.findings.some((finding) => finding.code === "object/layer-missing"),
    ).toBe(true);
  });

  it("detects RTL text and reports the output colour limitation honestly", () => {
    const story = createStory("Arabic", {
      paragraphs: [createParagraph("مرحبا بالعالم")],
      ids,
    });
    const document = emptyDocument();
    const page = firstPage(document);
    const frame = createTextFrame({
      name: "Body",
      layerId: layerId(page),
      x: 40,
      y: 40,
      width: 300,
      height: 180,
      storyId: story.id,
    });
    const modified: PublicationDocument = {
      ...document,
      stories: [story],
      pages: document.pages.map((entry, index) =>
        index === 0 ? { ...entry, objects: [frame] } : entry,
      ),
    };
    const report = runPreflight(modified, []);
    expect(report.findings.some((finding) => finding.code === "text/rtl")).toBe(true);
    const colour = report.findings.find(
      (finding) => finding.code === "output/rgb-only",
    );
    expect(colour?.severity).toBe("info");
    expect(colour?.detail.toLowerCase()).toContain("cmyk");
  });

  it("adds bleed errors when the print profile requires bleed", () => {
    const document = emptyDocument();
    const page = firstPage(document);
    // Remove the bleed to create a real, measurable error.
    const noBleed: PublicationDocument = {
      ...document,
      pages: document.pages.map((entry, index) =>
        index === 0
          ? {
              ...entry,
              spec: { ...entry.spec, bleed: 0 },
            }
          : entry,
      ),
    };
    const report = runPreflight(noBleed, [], {
      ...DEFAULT_PREFLIGHT_SETTINGS,
      requireBleed: true,
    });
    expect(
      report.findings.some((finding) => finding.code === "page/no-bleed"),
    ).toBe(true);
    expect(page.id).toBeTruthy();
    expect(report.printable).toBe(false);
  });

  it("is printable when a simple page has no errors", () => {
    const document = emptyDocument();
    const page = firstPage(document);
    const shape = createShape({
      name: "Panel",
      layerId: layerId(page),
      x: 60,
      y: 60,
      width: 200,
      height: 200,
      fill: "#d9d2c3",
      strokeWidth: 0,
    });
    const modified: PublicationDocument = {
      ...document,
      pages: document.pages.map((entry, index) =>
        index === 0 ? { ...entry, objects: [shape] } : entry,
      ),
    };
    const report = runPreflight(modified, []);
    expect(report.errors).toBe(0);
    expect(report.printable).toBe(true);
  });
});
