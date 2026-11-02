/**
 * Where a project lives.
 *
 * Every workspace opens the project it edits through one path builder, so the
 * dashboard, the editor and the studio cannot drift apart, and a future
 * workspace only has to claim its own prefix here.
 */
export function projectPath(id: string): string {
  return `/studio/${id}`;
}

/** The link a guest opens; it never exposes the studio route. */
export function invitationPath(slug: string): string {
  return `/i/${slug}`;
}
