/**
 * Route bookkeeping for the Publishing Studio.
 *
 * The two routes live in `main.tsx` alongside the other lazy workspace
 * routes, wrapped in the same `<StudioGate>` every protected route uses. This
 * module keeps the rule in one place: the id format the editor accepts before
 * it ever queries Convex, the hrefs the rest of the app builds, and where the
 * auth gate returns a signed-in designer on a deep link.
 */

export interface PublishingRouteEntry {
  path: string;
  /** Where the lazily imported page lives. */
  modulePath: string;
  /** Implementation detail: both routes are wrapped in `<StudioGate>`. */
  protected: true;
}

export const PUBLISHING_LIBRARY_PATH = "/publishing";
export const PUBLISHING_EDITOR_PATH = "/publishing/:publicationId";

/**
 * True on the library and any publication inside it. The application shell
 * uses this for the rail's active state; a bare prefix check would also light
 * up unrelated future paths such as `/publishing-tools`.
 */
export function isPublishingPath(pathname: string): boolean {
  return (
    pathname === PUBLISHING_LIBRARY_PATH ||
    /^\/publishing\/[a-zA-Z0-9]{16,64}\/?$/.test(pathname)
  );
}

export const PUBLISHING_ROUTES: readonly PublishingRouteEntry[] = [
  {
    path: PUBLISHING_LIBRARY_PATH,
    modulePath: "./pages/publishing/PublishingLibrary.tsx",
    protected: true,
  },
  {
    path: PUBLISHING_EDITOR_PATH,
    modulePath: "./pages/publishing/PublishingEditor.tsx",
    protected: true,
  },
];

/**
 * Convex ids are base32-ish strings of 16–64 characters. The editor checks
 * this before querying, so a malformed url shows "not found" instead of a
 * cryptic validator error from the backend.
 */
export function isValidPublicationId(value: string | undefined | null): boolean {
  return typeof value === "string" && /^[a-zA-Z0-9]{16,64}$/.test(value);
}

/** The href that opens one publication in the editor. */
export function editorHref(publicationId: string): string {
  return `${PUBLISHING_LIBRARY_PATH}/${publicationId}`.replace(/\/\//g, "/");
}
