import { describe, expect, it } from "vitest";

import { createDocument, createShape } from "./factory";
import { createSequentialIds } from "./ids";
import type { PublicationDocument } from "./model";
import {
  completeStructureStep,
  createEditorSession,
  editPage,
  historyLog,
  recordStructure,
  redo,
  redoTarget,
  sessionDocument,
  snapshotStructure,
  undoTarget,
  undo,
} from "./session";

/**
 * Phase 3E structural history.
 *
 * These tests model exactly what the hook does: snapshot the structure, run
 * the command, record one entry with the server document, and replay the
 * snapshot through the guarded restore mutation on undo.
 */

const ids = createSequentialIds(8000);

function fixture(): PublicationDocument {
  const document = createDocument({ title: "History", pageCount: 3, ids });
  const first = document.pages[0]!;
  const object = createShape({
    name: "Rule",
    layerId: first.layers[first.layers.length - 1]!.id,
    x: 40,
    y: 60,
    width: 120,
    height: 2,
    fill: "#710014",
    strokeWidth: 0,
  });
  return {
    ...document,
    pages: document.pages.map((page, index) =>
      index === 0 ? { ...page, objects: [object] } : page,
    ),
  };
}

function fromSnapshot(
  base: PublicationDocument,
  snapshot: ReturnType<typeof snapshotStructure>,
): PublicationDocument {
  return { ...base, ...snapshot };
}

function addPage(session: ReturnType<typeof createEditorSession>) {
  const before = snapshotStructure(sessionDocument(session));
  const current = sessionDocument(session);
  const source = current.pages[current.pages.length - 1]!;
  const next: PublicationDocument = {
    ...current,
    pages: [...current.pages, { ...source, id: "page_added", objects: [] }],
  };
  return {
    session: recordStructure(session, {
      label: "Add page",
      before,
      after: snapshotStructure(next),
      document: next,
    }),
    before,
  };
}

describe("structural history", () => {
  it("records one entry and restores the exact previous page list on undo", () => {
    const initial = fixture();
    const start = createEditorSession(initial);
    const { session, before } = addPage(start);

    expect(session.structureUndo).toHaveLength(1);
    expect(sessionDocument(session).pages).toHaveLength(4);
    expect(historyLog(session)[0]).toMatchObject({
      label: "Add page",
      kind: "structure",
      state: "done",
    });

    const target = undoTarget(session);
    expect(target?.kind).toBe("structure");
    if (target?.kind !== "structure") return;

    const restored = fromSnapshot(sessionDocument(session), target.entry.before);
    const undone = completeStructureStep(session, "undo", restored);
    expect(undone.structureUndo).toHaveLength(0);
    expect(sessionDocument(undone).pages.map((page) => page.id)).toEqual(
      before.pages.map((page) => page.id),
    );
    // Object ids survive the round trip.
    expect(sessionDocument(undone).pages[0]!.objects[0]!.id).toBe(
      initial.pages[0]!.objects[0]!.id,
    );
    expect(historyLog(undone)[0]!.state).toBe("undone");
  });

  it("redo replays the recorded after snapshot, not a new command", () => {
    const start = createEditorSession(fixture());
    const { session } = addPage(start);
    const target = undoTarget(session);
    if (target?.kind !== "structure") throw new Error("expected structure");

    const undone = completeStructureStep(
      session,
      "undo",
      fromSnapshot(sessionDocument(session), target.entry.before),
    );
    const redoEntry = redoTarget(undone);
    expect(redoEntry?.kind).toBe("structure");
    if (redoEntry?.kind !== "structure") throw new Error("expected structure");

    const redone = completeStructureStep(
      undone,
      "redo",
      fromSnapshot(sessionDocument(undone), redoEntry.entry.after),
    );
    expect(sessionDocument(redone).pages).toHaveLength(4);
    expect(sessionDocument(redone).pages[3]!.id).toBe("page_added");
    expect(historyLog(redone)[0]!.state).toBe("done");
  });

  it("orders content and structure edits by one sequence", () => {
    const start = createEditorSession(fixture());
    const { session } = addPage(start);
    const pageId = sessionDocument(session).pages[0]!.id;
    const edited = editPage(session, pageId, (page) => ({ ...page, name: "Cover" }));

    const first = undoTarget(edited);
    expect(first?.kind).toBe("content");
    const afterContentUndo = undo(edited);
    expect(sessionDocument(afterContentUndo).pages[0]!.name).not.toBe("Cover");

    const second = undoTarget(afterContentUndo);
    expect(second?.kind).toBe("structure");
  });

  it("keeps redo for the newest undone entry only", () => {
    const start = createEditorSession(fixture());
    const { session } = addPage(start);
    const pageId = sessionDocument(session).pages[0]!.id;
    const edited = editPage(session, pageId, (page) => ({ ...page, name: "Cover" }));
    const undoneContent = undo(edited);
    expect(redoTarget(undoneContent)?.kind).toBe("content");
    const reloaded = redo(undoneContent);
    expect(sessionDocument(reloaded).pages[0]!.name).toBe("Cover");
    // The structural entry remains available for its own undo.
    expect(reloaded.structureUndo).toHaveLength(1);
  });

  it("drops redo when a new command runs after undo", () => {
    const start = createEditorSession(fixture());
    const { session } = addPage(start);
    const pageId = sessionDocument(session).pages[0]!.id;
    const edited = editPage(session, pageId, (page) => ({ ...page, name: "A" }));
    const undone = undo(edited);
    const branched = editPage(undone, pageId, (page) => ({ ...page, name: "B" }));
    expect(branched.redoStack).toHaveLength(0);
    expect(redoTarget(branched)).toBeNull();
  });

  it("bounds the structural history instead of growing without limit", () => {
    let session = createEditorSession(fixture());
    for (let index = 0; index < 40; index += 1) {
      session = recordStructure(session, {
        label: `Step ${index}`,
        before: snapshotStructure(sessionDocument(session)),
        after: snapshotStructure(sessionDocument(session)),
        document: sessionDocument(session),
      });
    }
    expect(session.structureUndo.length).toBeLessThanOrEqual(30);
  });
});
