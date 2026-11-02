import type {
  DesignDocument,
  DesignPage,
  DesignSection,
} from "@/lib/design";

/**
 * Sections group pages into the chapters of a document: the cover, the story,
 * the details. They live inside the design itself, so every workspace reads
 * the same grouping and no new storage is needed.
 */

/** The document's sections, and an empty list when it has none yet. */
export function sectionsOf(
  design: Pick<DesignDocument, "sections">,
): DesignSection[] {
  return design.sections ?? [];
}

/**
 * Keeps sections that carry an id, dropping empty ones and duplicates, so a
 * hand-edited or older document can never produce two sections with the same
 * identity.
 */
export function normalizeSections(
  list: readonly DesignSection[] | undefined,
): DesignSection[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const normalized: DesignSection[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const title =
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : "Untitled section";
    normalized.push({ id, title, ...(raw.tone ? { tone: raw.tone } : {}) });
  }
  return normalized;
}

/** The next `section-N` id after the highest numbered one in the list. */
export function nextSectionId(sections: readonly DesignSection[]): string {
  let highest = 0;
  for (const section of sections) {
    const match = /^section-(\d+)$/.exec(section.id ?? "");
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `section-${highest + 1}`;
}

/**
 * The section a page belongs to. A page with no section of its own falls back
 * to the first one, so there is always somewhere to put new elements.
 */
export function sectionForPage(
  pages: readonly DesignPage[],
  pageId: string,
  sections: readonly DesignSection[],
): DesignSection | undefined {
  if (sections.length === 0) return undefined;
  const page = pages.find((candidate) => candidate.id === pageId);
  return sections.find((section) => section.id === page?.section) ?? sections[0];
}

/**
 * Gives a document at least one section and puts every page under one, so a
 * document saved before sections existed can be edited without a special case.
 * Returns the same document when nothing needed changing.
 */
export function ensureSections(design: DesignDocument): DesignDocument {
  const sections =
    design.sections && design.sections.length > 0
      ? design.sections
      : [{ id: "section-1", title: "Invitation" }];
  const known = new Set(sections.map((section) => section.id));
  const pages = design.pages.map((page) =>
    page.section && known.has(page.section)
      ? page
      : { ...page, section: sections[0].id },
  );
  const unchanged =
    design.sections?.length === sections.length &&
    design.pages.every((page, index) => page.section === pages[index].section);
  return unchanged ? design : { ...design, sections, pages };
}

/**
 * Puts one page under a section. An unknown id leaves the document untouched,
 * so a stale panel cannot orphan a page.
 */
export function assignPageToSection(
  design: DesignDocument,
  pageIndex: number,
  sectionId: string,
): DesignDocument {
  if (!design.sections?.some((section) => section.id === sectionId)) {
    return design;
  }
  const pages = design.pages.map((page, index) =>
    index === pageIndex ? { ...page, section: sectionId } : page,
  );
  return { ...design, pages };
}

/** Renames a section, or replaces its tone, wherever it is referenced. */
export function updateSection(
  design: DesignDocument,
  sectionId: string,
  patch: Partial<Pick<DesignSection, "title" | "tone">>,
): DesignDocument {
  if (!design.sections?.some((section) => section.id === sectionId)) {
    return design;
  }
  const sections = design.sections.map((section) =>
    section.id === sectionId ? { ...section, ...patch } : section,
  );
  return { ...design, sections };
}

/** Moves a section to a new position in the list, clamped to its bounds. */
export function reorderSections(
  design: DesignDocument,
  sectionId: string,
  toIndex: number,
): DesignDocument {
  const sections = [...(design.sections ?? [])];
  const from = sections.findIndex((section) => section.id === sectionId);
  if (from < 0) return design;
  const to = Math.max(0, Math.min(toIndex, sections.length - 1));
  if (from === to) return design;
  const [moved] = sections.splice(from, 1);
  sections.splice(to, 0, moved);
  return { ...design, sections };
}

/**
 * Appends a section and returns both the document and the new id, so the
 * caller can put a page under it in the same step.
 */
export function appendSection(
  design: DesignDocument,
  title: string,
): { design: DesignDocument; id: string } {
  const id = nextSectionId(design.sections ?? []);
  const section: DesignSection = {
    id,
    title: title.trim() || "Untitled section",
  };
  return {
    design: { ...design, sections: [...(design.sections ?? []), section] },
    id,
  };
}

/**
 * Removes a section. Its pages fall back to the section above them, or to the
 * first remaining one, so no page is ever left without a section.
 */
export function removeSection(
  design: DesignDocument,
  sectionId: string,
): DesignDocument {
  const sections = design.sections ?? [];
  const removedAt = sections.findIndex((section) => section.id === sectionId);
  if (removedAt < 0) return design;

  const remaining = sections.filter((section) => section.id !== sectionId);
  const fallback =
    removedAt > 0 ? sections[removedAt - 1].id : remaining[0]?.id;
  const pages = design.pages.map((page) => {
    if (page.section !== sectionId) return page;
    return fallback ? { ...page, section: fallback } : page;
  });

  return { ...design, sections: remaining, pages };
}