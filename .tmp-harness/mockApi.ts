/** Test-only API surface: same shape as the generated Convex API. */
const fn = (name: string) => ({ __name: name });

export const api = {
  invitations: {
    getMine: fn("getMine"),
    saveDesign: fn("saveDesign"),
    publish: fn("publish"),
    unpublish: fn("unpublish"),
  },
  library: {
    listMine: fn("listMine"),
    create: fn("create"),
    update: fn("update"),
    duplicate: fn("duplicate"),
    remove: fn("remove"),
    generateUploadUrl: fn("generateUploadUrl"),
  },
  users: { currentUser: fn("currentUser") },
  pin: { status: fn("pinStatus") },
};
