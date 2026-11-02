import { describe, expect, it } from "vitest";
import {
  READY_WORKSPACES,
  WORKSPACES,
  workspaceById,
  type WorkspaceId,
} from "./workspaces";

describe("the workspace registry", () => {
  it("lists the four workspaces in roadmap order", () => {
    expect(WORKSPACES.map((workspace) => workspace.id)).toEqual([
      "experiences",
      "print",
      "shape",
      "press",
    ]);
    expect(WORKSPACES.map((workspace) => workspace.phase)).toEqual([2, 3, 4, 5]);
  });

  it("gives every workspace a unique id", () => {
    const ids = new Set(WORKSPACES.map((workspace) => workspace.id));
    expect(ids.size).toBe(WORKSPACES.length);
  });

  it("never offers a workspace that has no destination", () => {
    for (const workspace of WORKSPACES) {
      if (workspace.ready) expect(workspace.route, workspace.id).toBeTruthy();
      else expect(workspace.route, workspace.id).toBeUndefined();
    }
  });

  it("only opens Digital Experiences today", () => {
    expect(READY_WORKSPACES.map((workspace) => workspace.id)).toEqual([
      "experiences",
    ]);
    expect(READY_WORKSPACES[0].route).toBe("/dashboard");
  });

  it("finds a workspace by id and rejects an unknown one", () => {
    expect(workspaceById("press").name).toBe("Press");
    expect(() => workspaceById("video" as WorkspaceId)).toThrow();
  });
});
