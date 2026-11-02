/**
 * The four workspaces the platform is built around.
 *
 * Navigation renders this list, so a workspace appears in the interface from
 * the moment it is described here. `phase` records the roadmap phase that
 * delivers the workspace, and `ready` keeps a planned tool honestly marked
 * instead of offering a button that leads nowhere.
 */
export type WorkspaceId = "experiences" | "print" | "shape" | "press";

export interface Workspace {
  id: WorkspaceId;
  name: string;
  /** The shorter label the rail uses when space is tight. */
  shortName: string;
  tagline: string;
  /** The roadmap phase that delivers the workspace. */
  phase: number;
  /** Where the workspace lives, once it is built. */
  route?: string;
  ready: boolean;
}

export const WORKSPACES: Workspace[] = [
  {
    id: "experiences",
    name: "Digital Experiences",
    shortName: "Experiences",
    tagline: "Invitations and interactive stories your guests open on a phone.",
    phase: 2,
    route: "/dashboard",
    ready: true,
  },
  {
    id: "print",
    name: "Print Lab",
    shortName: "Print Lab",
    tagline: "Press-ready cards, menus and tags with bleed, marks and sheets.",
    phase: 3,
    ready: false,
  },
  {
    id: "shape",
    name: "Shape Maker",
    shortName: "Shapes",
    tagline: "Vector cut and fold lines measured in millimetres.",
    phase: 4,
    ready: false,
  },
  {
    id: "press",
    name: "Press",
    shortName: "Press",
    tagline: "Newspapers and magazines laid out page by page.",
    phase: 5,
    ready: false,
  },
];

export function workspaceById(id: WorkspaceId): Workspace {
  const workspace = WORKSPACES.find((item) => item.id === id);
  if (!workspace) throw new Error(`Unknown workspace: ${id}`);
  return workspace;
}

/** The workspaces that are built and can be opened today. */
export const READY_WORKSPACES = WORKSPACES.filter(
  (workspace) => workspace.ready && workspace.route,
);
