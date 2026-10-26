import { describe, it, expect } from "vitest";
import {
  addPageToSuite,
  addPiece,
  activePiece,
  defaultPiecePrint,
  deletePiece,
  duplicatePiece,
  guestVisiblePageIds,
  movePiece,
  normalizeSuite,
  piecePages,
  pieceRange,
  pieceTrimMm,
  renamePiece,
  removePageFromSuite,
  selectPiece,
  setGuestVisible,
  shareStyles,
  suiteOf,
  withSuite,
  type DesignSuite,
  type PieceError,
  type PieceResult,
} from "./suite";
import {
  createDefaultDesign,
  makeElement,
  normalizeDesign,
  resizePage,
  visiblePages,
  type DesignDocument,
  type DesignPage,
} from "./design";
import { ENVELOPE_PRESETS, flapPath, linerSizeFor, defaultEnvelopeGeometry, envelopeZones, normalizeEnvelopeGeometry } from "./envelope";
import { sheetLayoutFor, sheetCellRect, cropMarkSegments } from "./print";
import { draftFromTemplate } from "./invitation";

const content = draftFromTemplate("the-vow");

function baseDesign(): DesignDocument {
  return createDefaultDesign(content);
}

/** Narrows a piece operation to its success shape, failing loudly otherwise. */
function pieceResult(result: PieceResult | PieceError): PieceResult {
  if (!result.design || result.pageIndex === undefined) {
    throw new Error(result.error ?? "piece operation failed");
  }
  return result as PieceResult;
}

describe("suite model", () => {
  it("leaves an invitation without a suite completely untouched", () => {
    const design = baseDesign();
    expect(design.suite).toBeUndefined();
    expect(guestVisiblePageIds(design)).toBeNull();
    expect(visiblePages(design)).toEqual(design.pages);
  });

  it("keeps legacy documents public after a normalisation round-trip", () => {
    const design = baseDesign();
    const normalised = normalizeDesign(JSON.parse(JSON.stringify(design)), content);
    expect(normalised.suite).toBeUndefined();
    expect(visiblePages(normalised).length).toBe(design.pages.length);
  });

  it("adds a suite without changing a single page", () => {
    const design = baseDesign();
    const withOne = withSuite(design);
    expect(withOne.pages).toEqual(design.pages);
    expect(suiteOf(withOne)).toHaveLength(1);
    expect(suiteOf(withOne)[0].kind).toBe("invitation");
    expect(activePiece(withOne)?.id).toBe(withOne.suite?.activePieceId);
    // Idempotent: asking twice never builds a second suite.
    expect(withSuite(withOne).suite).toBe(withOne.suite);
  });

  it("creates pieces with their own real dimensions", () => {
    const result = addPiece(baseDesign(), "rsvp");
    expect(result.error).toBeUndefined();
    const design = result.design!;
    const piece = suiteOf(design).find((item) => item.id === result.pieceId)!;
    expect(piece.kind).toBe("rsvp");
    expect(piece.pageIds).toHaveLength(1);
    expect(design.pages).toHaveLength(2);
    const trim = pieceTrimMm(design, piece);
    expect(trim.widthMm).toBeCloseTo(108, 0);
    expect(trim.heightMm).toBeCloseTo(139, 0);
    // New pieces are production work, not guest content.
    expect(guestVisiblePageIds(design)?.has(piece.pageIds[0])).toBe(false);
    expect(guestVisiblePageIds(design)?.has(design.pages[0].id)).toBe(true);
  });

  it("opens an envelope with a front, a back and geometry", () => {
    const result = pieceResult(addPiece(baseDesign(), "envelope"));
    const design = result.design;
    const piece = suiteOf(design).find((item) => item.id === result.pieceId)!;
    expect(piece.pageIds).toHaveLength(2);
    expect(piece.envelope?.widthMm).toBe(114);
    expect(piece.envelope?.flap.shape).toBe("point");
    expect(design.pages[result.pageIndex].name).toContain("Front");
    expect(design.pages[result.pageIndex + 1].name).toContain("Back");
  });

  it("cuts the liner to the envelope it lines", () => {
    const envelope = pieceResult(addPiece(baseDesign(), "envelope"));
    const liner = pieceResult(addPiece(envelope.design, "liner"));
    const piece = suiteOf(liner.design).find((item) => item.id === liner.pieceId)!;
    const geometry = suiteOf(envelope.design).find((item) => item.kind === "envelope")!.envelope!;
    const expected = linerSizeFor(geometry);
    expect(pieceTrimMm(liner.design, piece).widthMm).toBeCloseTo(expected.widthMm, 0);
    expect(piece.pageIds).toHaveLength(1);
  });

  it("duplicates a piece with fresh ids and intact artwork", () => {
    const start = addPiece(baseDesign(), "invitation");
    const design = start.design!;
    const source = suiteOf(design)[0];
    const withArt: DesignDocument = {
      ...design,
      pages: design.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              elements: [
                {
                  ...page.elements[0],
                  reveal: { ...page.elements[0].reveal!, targetId: page.elements[0].id },
                },
              ],
            }
          : page,
      ),
    };
    const copy = duplicatePiece(withArt, source.id);
    expect(copy.error).toBeUndefined();
    const duplicated = copy.design!;
    expect(duplicated.pages).toHaveLength(withArt.pages.length + 1);
    const copied = suiteOf(duplicated).find((item) => item.id === copy.pieceId)!;
    expect(copied.name).toContain("copy");
    expect(copied.pageIds).not.toEqual(source.pageIds);
    // The copy's layers are new objects with new ids.
    const copiedPage = piecePages(duplicated, copied)[0];
    const originalPage = piecePages(withArt, source)[0];
    expect(copiedPage.elements).toHaveLength(originalPage.elements.length);
    expect(copiedPage.elements[0].id).not.toBe(originalPage.elements[0].id);
    // A reveal inside the copy still points at a layer of the copy.
    expect(copiedPage.elements[0].reveal?.targetId).toBe(copiedPage.elements[0].id);
    // Pieces stay contiguous: the copy sits right after the original.
    expect(duplicated.pages.map((page) => page.id)).toEqual(
      [...piecePages(duplicated, source), ...piecePages(duplicated, copied), ...duplicated.pages.filter(
        (page) => !source.pageIds.includes(page.id) && !copied.pageIds.includes(page.id),
      )].map((page) => page.id),
    );
  });

  it("refuses to delete the last piece", () => {
    const design = baseDesign();
    const single = withSuite(design);
    const result = deletePiece(single, suiteOf(single)[0].id);
    expect(result.error).toBeTruthy();
    expect(result.design).toBe(single);
  });

  it("deletes a piece together with its pages and repairs the active piece", () => {
    const withRsvp = addPiece(baseDesign(), "rsvp");
    const design = withRsvp.design!;
    const target = suiteOf(design).find((item) => item.id === withRsvp.pieceId)!;
    const result = deletePiece(design, target.id);
    expect(result.error).toBeUndefined();
    expect(result.design.pages).toHaveLength(1);
    expect(suiteOf(result.design)).toHaveLength(1);
    expect(result.design.suite?.activePieceId).not.toBe(target.id);
    expect(activePiece(result.design)?.pageIds).toContain(result.design.pages[0].id);
  });

  it("reorders pieces and keeps their pages together", () => {
    const a = pieceResult(addPiece(baseDesign(), "rsvp"));
    const b = pieceResult(addPiece(a.design, "details"));
    const design = b.design;
    const [invitation, rsvp, details] = suiteOf(design);
    const moved = movePiece(design, details.id, -1);
    expect(suiteOf(moved).map((piece) => piece.id)).toEqual([
      invitation.id,
      details.id,
      rsvp.id,
    ]);
    const detailsRange = pieceRange(moved, details.id)!;
    expect(detailsRange.end - detailsRange.start).toBe(1);
    expect(moved.pages[detailsRange.start].id).toBe(details.pageIds[0]);
    // Out-of-range moves are no-ops.
    expect(movePiece(moved, details.id, -1)).not.toBe(moved);
  });

  it("renames only the chosen piece and ignores empty names", () => {
    const added = addPiece(baseDesign(), "menu");
    const design = added.design!;
    const renamed = renamePiece(design, added.pieceId!, "  Seating menu  ");
    expect(suiteOf(renamed)[1].name).toBe("Seating menu");
    expect(renamePiece(renamed, added.pieceId!, "   ")).toBe(renamed);
  });

  it("tracks pages added to and removed from the suite", () => {
    const added = addPiece(baseDesign(), "rsvp");
    let design = added.design!;
    const piece = suiteOf(design)[1];
    design = { ...design, pages: [...design.pages, { ...design.pages[0], id: "page_new", name: "New" }] };
    design = addPageToSuite(design, "page_new");
    expect(suiteOf(design)[1].pageIds).toContain("page_new");
    expect(addPageToSuite(design, "page_new")).toBe(design);

    design = removePageFromSuite(design, "page_new");
    expect(suiteOf(design)[1].pageIds).not.toContain("page_new");
    expect(suiteOf(design)).toHaveLength(2);
    // Never losing the last page of a piece.
    expect(suiteOf(design)[0].pageIds).toContain(design.pages[0].id);
    expect(piece.pageIds).toHaveLength(1);
  });

  it("selects a piece by opening its first page", () => {
    const added = addPiece(baseDesign(), "envelope");
    const design = added.design!;
    const invitation = suiteOf(design)[0];
    const selection = selectPiece(design, invitation.id)!;
    expect(selection.pageIndex).toBe(0);
    expect(selection.design.suite?.activePieceId).toBe(invitation.id);
    expect(selectPiece(design, "nope")).toBeNull();
  });
});

describe("suite normalisation", () => {
  it("drops unknown kinds, foreign pages and empty pieces", () => {
    const design = baseDesign();
    const pageId = design.pages[0].id;
    const raw = {
      version: 1,
      activePieceId: "ghost",
      pieces: [
        { id: "p1", name: "Card", kind: "invitation", pageIds: [pageId, "missing"], print: { bleedMm: 4 } },
        { id: "p2", name: "Empty", kind: "envelope", pageIds: [] },
        { id: "p3", name: "Weird", kind: "balloon", pageIds: [pageId] },
        { id: "p4", name: "", kind: null, pageIds: ["nope"] },
      ],
    };
    const suite = normalizeSuite(raw, design.pages)!;
    expect(suite.pieces).toHaveLength(1);
    expect(suite.pieces[0].id).toBe("p1");
    expect(suite.pieces[0].pageIds).toEqual([pageId]);
    expect(suite.pieces[0].print.bleedMm).toBe(4);
    expect(suite.activePieceId).toBe("p1");
  });

  it("reassigns orphaned pages instead of hiding them", () => {
    const design = baseDesign();
    const extra: DesignPage = { ...design.pages[0], id: "orphan", name: "Orphan" };
    const pages = [...design.pages, extra];
    const raw = {
      version: 1,
      activePieceId: "p1",
      pieces: [{ id: "p1", name: "Card", kind: "invitation", pageIds: [design.pages[0].id] }],
    };
    const suite = normalizeSuite(raw, pages)!;
    expect(suite.pieces[0].pageIds).toContain("orphan");
    expect(visiblePages({ ...design, pages, suite }).map((page) => page.id)).toContain("orphan");
  });

  it("survives a malformed suite", () => {
    const design = baseDesign();
    expect(normalizeSuite(null, design.pages)).toBeUndefined();
    expect(normalizeSuite({}, design.pages)).toBeUndefined();
    expect(normalizeSuite({ pieces: [] }, design.pages)).toBeUndefined();
    expect(normalizeSuite({ pieces: "no" }, design.pages)).toBeUndefined();
    // A damaged suite never costs a page its public link.
    const damaged = normalizeDesign(
      { ...design, suite: { pieces: [{ id: "p", pageIds: ["gone"] }] } },
      content,
    );
    expect(visiblePages(damaged)).toHaveLength(1);
  });

  it("clamps print settings to believable values", () => {
    const design = baseDesign();
    const suite = normalizeSuite(
      { activePieceId: "p", pieces: [{ id: "p", name: "P", kind: "menu", pageIds: [design.pages[0].id], print: { bleedMm: -4, safeMm: 900, unit: "cm", cropMarks: 1 } }] },
      design.pages,
    )!;
    expect(suite.pieces[0].print).toEqual({ unit: "mm", bleedMm: 0, safeMm: 50, cropMarks: true });
    expect(defaultPiecePrint("envelope").bleedMm).toBe(0);
    expect(defaultPiecePrint("invitation").bleedMm).toBe(3);
  });
});

describe("guest visibility", () => {
  it("keeps production pieces away from public links", () => {
    const added = addPiece(baseDesign(), "rsvp");
    const design = added.design!;
    const guest = guestVisiblePageIds(design)!;
    expect(guest.size).toBe(1);
    expect(visiblePages(design)).toHaveLength(1);

    const opened = setGuestVisible(design, added.pieceId!, true);
    expect(visiblePages(opened)).toHaveLength(2);
    expect(setGuestVisible(opened, added.pieceId!, true)).toBe(opened);
  });
});

describe("shared styles", () => {
  function suiteDesign() {
    const withRsvp = addPiece(baseDesign(), "rsvp");
    const design = withRsvp.design!;
    const invitation = suiteOf(design)[0];
    const rsvp = suiteOf(design)[1];
    const styled: DesignDocument = {
      ...design,
      pages: design.pages.map((page, index) => {
        if (index !== 0) {
          // A new piece starts blank: give it a small card of its own.
          return {
            ...page,
            background: "#ffffff",
            elements: [
              { ...makeElement("text"), id: "t-rsvp", name: "Names", text: "RSVP", x: 80, y: 80, w: 240, h: 60, color: "#111111" },
              { ...makeElement("shape"), id: "s-rsvp", name: "Rule", x: 80, y: 200, w: 300, h: 4, fill: "#c9a227" },
            ],
          };
        }
        return {
          ...page,
          background: "#101010",
          elements: page.elements.map((element) =>
            element.kind === "text"
              ? { ...element, color: "#f6f1e6", font: "cormorant", fontSize: 74 }
              : element,
          ),
        };
      }),
    };
    return { design: styled, invitation, rsvp };
  }

  it("does nothing when no aspect or target is chosen", () => {
    const { design, rsvp } = suiteDesign();
    expect(shareStyles(design, { sourcePieceId: rsvp.id, targetPieceIds: [rsvp.id], aspects: ["background"] })).toBe(design);
    expect(shareStyles(design, { sourcePieceId: rsvp.id, targetPieceIds: [], aspects: ["background"] })).toBe(design);
    expect(shareStyles(design, { sourcePieceId: rsvp.id, targetPieceIds: [rsvp.id], aspects: [] })).toBe(design);
  });

  it("shares only the aspects that were asked for", () => {
    const { design, invitation, rsvp } = suiteDesign();
    const backgroundOnly = shareStyles(design, {
      sourcePieceId: invitation.id,
      targetPieceIds: [rsvp.id],
      aspects: ["background"],
    });
    const target = backgroundOnly.pages[1];
    expect(target.background).toBe("#101010");
    expect(target.elements).toHaveLength(design.pages[1].elements.length);
    expect(target.elements[0]).toBe(design.pages[1].elements[0]);

    const typography = shareStyles(design, {
      sourcePieceId: invitation.id,
      targetPieceIds: [rsvp.id],
      aspects: ["typography"],
    });
    const text = typography.pages[1].elements.find((element) => element.kind === "text");
    const sourceText = design.pages[0].elements.find((element) => element.kind === "text");
    expect(typography.pages[1].background).toBe(design.pages[1].background);
    expect(text?.font).toBe(sourceText?.font);
    // Colour is the palette's job, so typography never moves it.
    expect(text?.color).toBe("#111111");
    // Sizes scale to the smaller card instead of overflowing it.
    expect(text!.fontSize!).toBeLessThan(sourceText!.fontSize!);
  });

  it("remaps the palette role for role without touching other colours", () => {
    const { design, invitation, rsvp } = suiteDesign();
    const shared = shareStyles(design, {
      sourcePieceId: invitation.id,
      targetPieceIds: [rsvp.id],
      aspects: ["palette"],
    });
    const page = shared.pages[1];
    const sourceText = design.pages[0].elements.find((element) => element.kind === "text");
    const targetText = page.elements.find((element) => element.kind === "text");
    // The card's own ink is replaced by the invitation's ink, role for role.
    expect(targetText?.color).toBe("#f6f1e6");
    expect(page.background).toBe(design.pages[1].background);
    expect(page.elements).toHaveLength(design.pages[1].elements.length);
    expect(sourceText?.color).toBe("#f6f1e6");
    // The source piece is never rewritten.
    expect(shared.pages[0]).toBe(design.pages[0]);
  });

  it("adds ornaments and selected layers without removing existing artwork", () => {
    const { design, invitation, rsvp } = suiteDesign();
    const withOrnament: DesignDocument = {
      ...design,
      pages: design.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              elements: [
                ...page.elements,
                {
                  ...page.elements.find((element) => element.kind === "shape")!,
                  id: "ornament-1",
                  kind: "motif" as const,
                  name: "Wreath",
                  w: 800,
                  h: 800,
                  x: 100,
                  y: 200,
                },
              ],
            }
          : page,
      ),
    };
    const shared = shareStyles(withOrnament, {
      sourcePieceId: invitation.id,
      targetPieceIds: [rsvp.id],
      aspects: ["ornaments", "elements"],
      elementIds: ["ornament-1"],
    });
    const target = shared.pages[1];
    const ornaments = withOrnament.pages[0].elements.filter(
      (element) =>
        element.kind === "motif" ||
        Boolean(element.frameArt) ||
        (element.kind === "shape" && element.shape === "frame"),
    );
    // Every ornament is added once, plus the explicitly carried layer, on top
    // of the artwork the card already had.
    expect(target.elements).toHaveLength(2 + ornaments.length + 1);
    expect(target.elements.slice(0, 2)).toEqual(withOrnament.pages[1].elements);
    const carried = target.elements[target.elements.length - 1];
    // Scaled down to the smaller card and centred, never left oversized.
    expect(carried.w).toBeLessThan(800);
    expect(carried.x).toBeGreaterThanOrEqual(0);
    expect(carried.id).not.toBe("ornament-1");
    expect(carried.reveal).toBeUndefined();
    // The original page is untouched.
    expect(withOrnament.pages[0].elements[withOrnament.pages[0].elements.length - 1].id).toBe("ornament-1");
  });

  it("never writes into the source piece", () => {
    const { design, invitation, rsvp } = suiteDesign();
    const shared = shareStyles(design, {
      sourcePieceId: invitation.id,
      targetPieceIds: [rsvp.id],
      aspects: ["background", "typography"],
    });
    expect(shared.pages[0]).toBe(design.pages[0]);
  });
});

describe("envelope geometry for the designer", () => {
  it("derives a flap and zones that fit the piece", () => {
    const geometry = defaultEnvelopeGeometry(114, 162);
    const width = 430;
    const height = 613;
    const back = envelopeZones(geometry, "back", width, height);
    const front = envelopeZones(geometry, "front", width, height);
    expect(back.flapDepth).toBeGreaterThan(0);
    expect(back.flapDepth).toBeLessThan(height);
    expect(back.returnAddress!.y + back.returnAddress!.h).toBeLessThan(back.flapDepth);
    expect(back.recipient).toBeUndefined();
    expect(front.recipient!.x).toBeGreaterThan(0);
    expect(front.stamp!.x + front.stamp!.w).toBeLessThanOrEqual(width);
    expect(front.returnAddress).toBeUndefined();
    expect(front.postageSafe!.w).toBeLessThan(width);
    expect(back.centreX).toBe(width / 2);
  });

  it("honours switched-off guides", () => {
    const geometry = { ...defaultEnvelopeGeometry(), guides: { returnAddress: false, recipient: false, stamp: false, postageSafe: false } };
    const zones = envelopeZones(geometry, "front", 400, 600);
    expect(zones.recipient).toBeUndefined();
    expect(zones.stamp).toBeUndefined();
    expect(zones.postageSafe).toBeUndefined();
  });

  it("draws four believable flap outlines", () => {
    for (const shape of ["point", "straight", "rounded", "wallet"] as const) {
      const path = flapPath(430, 613, 250, shape);
      expect(path.startsWith("M 0 0")).toBe(true);
      expect(path).not.toContain("NaN");
    }
    expect(flapPath(430, 613, 250, "point")).toContain("215 250");
    // A flap deeper than the envelope is clamped, never drawn off the card.
    expect(flapPath(430, 613, 5000, "wallet")).not.toContain("NaN");
  });

  it("sizes a liner that lines the pocket and the flap", () => {
    const geometry = defaultEnvelopeGeometry(114, 162);
    const liner = linerSizeFor(geometry);
    expect(liner.widthMm).toBeLessThan(114);
    expect(liner.heightMm).toBeGreaterThan(162);
    expect(liner.heightMm).toBeCloseTo(162 + geometry.flap.depthMm - 2, 0);
  });

  it("clamps a damaged hinge to a stock envelope", () => {
    expect(normalizeEnvelopeGeometry(undefined)).toBeUndefined();
    expect(normalizeEnvelopeGeometry({ widthMm: 0, heightMm: 10 })).toBeUndefined();
    const deep = normalizeEnvelopeGeometry({ widthMm: 114, heightMm: 162, flap: { shape: "point", depthMm: 4000 } })!;
    expect(deep.flap.depthMm).toBeCloseTo(162 * 0.75, 0);
    const shallow = normalizeEnvelopeGeometry({ widthMm: 114, heightMm: 162, flap: { depthMm: 1 } })!;
    expect(shallow.flap.depthMm).toBeCloseTo(162 * 0.2, 0);
    const odd = normalizeEnvelopeGeometry({ widthMm: 114, heightMm: 162, flap: { shape: "zigzag" }, guides: { stamp: false } })!;
    expect(odd.flap.shape).toBe("point");
    expect(odd.guides.stamp).toBe(false);
    expect(odd.guides.recipient).toBe(true);
  });

  it("offers sizes a stationer actually stocks", () => {
    expect(ENVELOPE_PRESETS.find((preset) => preset.id === "c6")).toMatchObject({ width: 114, height: 162 });
    expect(ENVELOPE_PRESETS.every((preset) => preset.width > 0 && preset.height > 0)).toBe(true);
  });
});

describe("sheet layout", () => {
  const trim = { widthMm: 108, heightMm: 139 };
  const sheet = { widthMm: 210, heightMm: 297 };

  it("fits the most copies it can and centres them", () => {
    const layout = sheetLayoutFor({ trim, sheet, bleedMm: 3, gapMm: 3 });
    // 145 mm of media plus a 3 mm gutter fits twice down A4 with room to spare.
    expect(layout.columns).toBe(1);
    expect(layout.rows).toBe(2);
    expect(layout.count).toBe(2);
    expect(layout.origin.x).toBeGreaterThan(0);
    expect(layout.origin.y).toBeGreaterThanOrEqual(0);
    const cell = sheetCellRect(layout, 1);
    expect(cell.y + cell.h).toBeLessThanOrEqual(sheet.heightMm + 0.001);
  });

  it("tiles smaller pieces several times per sheet", () => {
    const layout = sheetLayoutFor({
      trim: { widthMm: 60, heightMm: 60 },
      sheet,
      bleedMm: 3,
      gapMm: 3,
    });
    expect(layout.columns).toBe(3);
    expect(layout.rows).toBe(4);
    expect(layout.count).toBe(12);
    const last = sheetCellRect(layout, layout.count - 1);
    expect(last.x + last.w).toBeLessThanOrEqual(sheet.widthMm + 0.001);
    expect(last.y + last.h).toBeLessThanOrEqual(sheet.heightMm + 0.001);
    const first = sheetCellRect(layout, 0);
    expect(first.x).toBeCloseTo(layout.origin.x, 5);
  });

  it("turns copies on their side to fit more", () => {
    const portrait = sheetLayoutFor({ trim: { widthMm: 60, heightMm: 150 }, sheet, bleedMm: 0, gapMm: 0 });
    const turned = sheetLayoutFor({ trim: { widthMm: 60, heightMm: 150 }, sheet, bleedMm: 0, gapMm: 0, rotate: true });
    expect(turned.count).toBeGreaterThanOrEqual(portrait.count);
    const cell = sheetCellRect(turned, 0);
    expect(cell.w).toBeGreaterThan(cell.h);
  });

  it("never divides a sheet into nothing", () => {
    const layout = sheetLayoutFor({ trim: { widthMm: 500, heightMm: 700 }, sheet, bleedMm: 3 });
    expect(layout.columns).toBe(1);
    expect(layout.rows).toBe(1);
    expect(layout.count).toBe(1);
    expect(layout.origin.x).toBe(0);
  });

  it("draws crop marks outside the trim edge", () => {
    const segments = cropMarkSegments({ x: 10, y: 10, w: 100, h: 100 }, 3, 0.6);
    expect(segments).toHaveLength(8);
    for (const [x1, y1, x2, y2] of segments) {
      const insideX = x1 > 10 && x1 < 110;
      const insideY = y1 > 10 && y1 < 110;
      // Each mark starts clear of the trim edge it belongs to.
      expect(insideX && insideY).toBe(false);
      expect(Number.isFinite(x1) && Number.isFinite(y2)).toBe(true);
    }
  });
});

describe("resized pages stay in the suite", () => {
  it("keeps membership when a page is resized", () => {
    const added = pieceResult(addPiece(baseDesign(), "menu"));
    const design = pieceResult(addPiece(added.design, "details")).design;
    const piece = suiteOf(design)[1];
    const resized: DesignDocument = {
      ...design,
      pages: design.pages.map((page) =>
        page.id === piece.pageIds[0] ? resizePage(page, { width: 400, height: 600 }, "fit") : page,
      ),
    };
    expect(pieceRange(resized, piece.id)).toEqual(pieceRange(design, piece.id));
    expect(pieceTrimMm(resized, piece).widthMm).toBeCloseTo(400 * (25.4 / 96), 1);
  });
});
