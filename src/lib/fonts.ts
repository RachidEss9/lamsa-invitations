/**
 * The LAMSA type library.
 *
 * Every family here is an open-source Google Fonts family (SIL Open Font
 * License or Apache 2.0). Files are fetched from Google's font CDN on demand:
 * only faces that are actually previewed or used by a design are downloaded.
 * Nothing font-related ships in the bundle except this manifest and the
 * loader, so the editor starts quickly and the published page only pays for
 * the faces it sets.
 */

export type FontScript = "arabic" | "latin" | "both";
export type FontCategory =
  | "serif"
  | "sans"
  | "display"
  | "calligraphy"
  | "handwritten";

export interface FontDef {
  id: string;
  /** Human label, used in the inspector trigger. */
  name: string;
  /** Google Fonts family name, used in the CSS request. */
  google: string;
  family: string;
  script: FontScript;
  categories: FontCategory[];
  weights: number[];
  italic?: boolean;
  note?: string;
}

const SERIF_FALLBACK = '"Noto Naskh Arabic", "Amiri", Georgia, serif';
const SANS_FALLBACK = '"Noto Sans Arabic", "IBM Plex Sans Arabic", system-ui, sans-serif';
const SCRIPT_FALLBACK = '"Noto Naskh Arabic", "Amiri", cursive';

function latin(
  id: string,
  name: string,
  categories: FontCategory[],
  options: { weights?: number[]; italic?: boolean; note?: string; fallback?: string } = {},
): FontDef {
  const fallback = options.fallback ?? (categories.includes("sans") ? SANS_FALLBACK : SERIF_FALLBACK);
  return {
    id,
    name,
    google: name,
    family: `"${name}", ${fallback}`,
    script: "latin",
    categories,
    weights: options.weights ?? [400, 700],
    italic: options.italic,
    note: options.note,
  };
}

function arabic(
  id: string,
  name: string,
  categories: FontCategory[],
  options: { weights?: number[]; italic?: boolean; note?: string } = {},
): FontDef {
  return {
    id,
    name,
    google: name,
    family: `"${name}", "Noto Naskh Arabic", "Amiri", ${categories.includes("sans") ? "sans-serif" : "serif"}`,
    script: "arabic",
    categories,
    weights: options.weights ?? [400, 700],
    italic: options.italic,
    note: options.note,
  };
}

export const FONT_LIBRARY: FontDef[] = [
  /* ---------------------------------------------------------------- Arabic */
  arabic("amiri", "Amiri", ["serif"], {
    italic: true,
    note: "Naskh — the atelier's house Arabic",
  }),
  arabic("noto-naskh-arabic", "Noto Naskh Arabic", ["serif"], {
    note: "Traditional Naskh, very legible",
  }),
  arabic("noto-sans-arabic", "Noto Sans Arabic", ["sans"], {
    note: "Neutral, modern Arabic",
  }),
  arabic("noto-kufi-arabic", "Noto Kufi Arabic", ["sans", "display"], {
    note: "Geometric Kufi",
  }),
  arabic("tajawal", "Tajawal", ["sans"], { note: "Contemporary Arabic sans" }),
  arabic("cairo", "Cairo", ["sans"], { note: "Warm humanist Arabic" }),
  arabic("almarai", "Almarai", ["sans"], { note: "Clean, quiet Arabic" }),
  arabic("ibm-plex-sans-arabic", "IBM Plex Sans Arabic", ["sans"], {
    note: "Technical, precise Arabic",
  }),
  arabic("changa", "Changa", ["sans", "display"], { note: "Soft geometric Arabic" }),
  arabic("el-messiri", "El Messiri", ["sans", "display"], {
    note: "Editorial Arabic with personality",
  }),
  arabic("readex-pro", "Readex Pro", ["sans"], { note: "Highly readable Arabic" }),
  arabic("alexandria", "Alexandria", ["sans", "display"], {
    note: "Bold contemporary Arabic",
  }),
  arabic("mada", "Mada", ["sans"], { note: "Quiet, practical Arabic" }),
  arabic("scheherazade-new", "Scheherazade New", ["serif"], {
    note: "Classical Naskh for long passages",
  }),
  arabic("lateef", "Lateef", ["serif"], { note: "Naskh with generous rhythm" }),
  arabic("aref-ruqaa", "Aref Ruqaa", ["calligraphy", "display"], {
    note: "Ruqaa calligraphy",
  }),
  arabic("reem-kufi", "Reem Kufi", ["sans", "display"], {
    note: "Modern Kufi, monogram-ready",
  }),
  arabic("markazi-text", "Markazi Text", ["serif"], {
    note: "Fine Naskh for invitation details",
  }),
  arabic("gulzar", "Gulzar", ["serif", "calligraphy"], {
    weights: [400],
    note: "Nastaliq-inspired Urdu and Arabic",
  }),
  arabic("harmattan", "Harmattan", ["serif"], { note: "Spacious Arabic book face" }),
  arabic("kufam", "Kufam", ["sans", "display"], { note: "Display Kufi" }),
  arabic("marhey", "Marhey", ["display", "handwritten"], {
    note: "Playful Arabic display",
  }),
  arabic("noto-nastaliq-urdu", "Noto Nastaliq Urdu", ["calligraphy", "serif"], {
    weights: [400, 700],
    note: "Nastaliq — Urdu and Persian",
  }),
  arabic("baloo-bhaijaan-2", "Baloo Bhaijaan 2", ["display"], {
    note: "Soft, festive Arabic display",
  }),
  {
    ...latin("rubik", "Rubik", ["sans"], { note: "Latin + Arabic, rounded" }),
    script: "both",
    family:
      '"Rubik", "Noto Sans Arabic", "IBM Plex Sans Arabic", system-ui, sans-serif',
  },

  /* --------------------------------------------------------------- Latin */
  latin("cormorant-garamond", "Cormorant Garamond", ["serif"], {
    italic: true,
    note: "Romance",
  }),
  latin("playfair-display", "Playfair Display", ["serif", "display"], {
    italic: true,
    note: "Editorial didone",
  }),
  latin("libre-baskerville", "Libre Baskerville", ["serif"], {
    italic: true,
    note: "Book",
  }),
  latin("lora", "Lora", ["serif"], { italic: true, note: "Contemporary serif" }),
  latin("dm-serif-display", "DM Serif Display", ["serif", "display"], {
    italic: true,
    note: "High-contrast display",
  }),
  latin("bodoni-moda", "Bodoni Moda", ["serif", "display"], {
    italic: true,
    note: "Atelier didone",
  }),
  latin("cinzel", "Cinzel", ["serif", "display"], {
    weights: [400, 700],
    note: "Engraved capitals",
  }),
  latin("eb-garamond", "EB Garamond", ["serif"], {
    italic: true,
    note: "Renaissance book face",
  }),
  latin("italiana", "Italiana", ["display", "serif"], {
    weights: [400],
    note: "Modern couture",
  }),
  latin("marcellus", "Marcellus", ["serif", "display"], {
    weights: [400],
    note: "Heritage capitals",
  }),
  latin("instrument-serif", "Instrument Serif", ["serif", "display"], {
    weights: [400],
    italic: true,
    note: "Sharp editorial cut",
  }),
  latin("fraunces", "Fraunces", ["serif", "display"], {
    italic: true,
    note: "Soft-wonky display serif",
  }),
  latin("newsreader", "Newsreader", ["serif"], {
    italic: true,
    note: "Journal serif",
  }),
  latin("spectral", "Spectral", ["serif"], {
    italic: true,
    note: "Screen-first book serif",
  }),
  latin("crimson-pro", "Crimson Pro", ["serif"], {
    italic: true,
    note: "Literary serif",
  }),
  latin("cardo", "Cardo", ["serif"], { italic: true, note: "Scholarly old style" }),
  latin("gilda-display", "Gilda Display", ["serif", "display"], {
    weights: [400],
    note: "Jewellery-window serif",
  }),
  latin("forum", "Forum", ["serif", "display"], {
    weights: [400],
    note: "Roman inscription",
  }),
  latin("pt-serif", "PT Serif", ["serif"], { italic: true, note: "Reliable serif" }),
  latin("noto-serif", "Noto Serif", ["serif"], {
    italic: true,
    note: "Multi-script serif",
  }),

  latin("montserrat", "Montserrat", ["sans"], {
    italic: true,
    note: "Geometric sans",
  }),
  latin("inter", "Inter", ["sans"], { italic: true, note: "Interface sans" }),
  latin("manrope", "Manrope", ["sans"], { note: "Soft geometric sans" }),
  latin("poppins", "Poppins", ["sans"], { italic: true, note: "Rounded geometric" }),
  latin("dm-sans", "DM Sans", ["sans"], { italic: true, note: "Low-contrast sans" }),
  latin("plus-jakarta-sans", "Plus Jakarta Sans", ["sans"], {
    italic: true,
    note: "Contemporary grotesque",
  }),
  latin("outfit", "Outfit", ["sans", "display"], { note: "Neo-grotesque" }),
  latin("raleway", "Raleway", ["sans"], { italic: true, note: "Thin, elegant sans" }),
  latin("jost", "Jost", ["sans"], { italic: true, note: "Bauhaus sans" }),
  latin("sora", "Sora", ["sans"], { note: "Tech-forward sans" }),
  latin("space-grotesk", "Space Grotesk", ["sans", "display"], {
    note: "Quirky grotesque",
  }),
  latin("bricolage-grotesque", "Bricolage Grotesque", ["sans", "display"], {
    note: "Expressive grotesque",
  }),
  latin("syne", "Syne", ["sans", "display"], { note: "Art-space display" }),
  latin("josefin-sans", "Josefin Sans", ["sans", "display"], {
    italic: true,
    note: "Vintage geometric",
  }),
  latin("quicksand", "Quicksand", ["sans"], { note: "Soft rounded sans" }),
  latin("nunito", "Nunito", ["sans"], { italic: true, note: "Friendly sans" }),
  latin("karla", "Karla", ["sans"], { italic: true, note: "Grotesque with warmth" }),
  latin("work-sans", "Work Sans", ["sans"], { italic: true, note: "Neutral workhorse" }),
  latin("archivo", "Archivo", ["sans"], { italic: true, note: "Editorial sans" }),
  latin("archivo-black", "Archivo Black", ["display", "sans"], {
    weights: [400],
    note: "Heavy poster sans",
  }),
  latin("libre-franklin", "Libre Franklin", ["sans"], {
    italic: true,
    note: "American grotesque",
  }),
  latin("tenor-sans", "Tenor Sans", ["sans"], {
    weights: [400],
    note: "Small-caps-adjacent sans",
  }),
  latin("noto-sans", "Noto Sans", ["sans"], { italic: true, note: "Multi-script sans" }),
  latin("bebas-neue", "Bebas Neue", ["display", "sans"], {
    weights: [400],
    note: "Condensed poster caps",
  }),
  latin("anton", "Anton", ["display", "sans"], {
    weights: [400],
    note: "Compressed display",
  }),

  latin("great-vibes", "Great Vibes", ["calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Formal copperplate",
  }),
  latin("allura", "Allura", ["calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Light formal script",
  }),
  latin("dancing-script", "Dancing Script", ["handwritten", "calligraphy"], {
    fallback: SCRIPT_FALLBACK,
    note: "Lively informal script",
  }),
  latin("parisienne", "Parisienne", ["calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Parisian flourish",
  }),
  latin("tangerine", "Tangerine", ["calligraphy"], {
    fallback: SCRIPT_FALLBACK,
    note: "Slender calligraphic script",
  }),
  latin("sacramento", "Sacramento", ["handwritten", "calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Single-stroke signature",
  }),
  latin("alex-brush", "Alex Brush", ["calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Brush calligraphy",
  }),
  latin("pinyon-script", "Pinyon Script", ["calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Engraved invitation script",
  }),
  latin("la-belle-aurore", "La Belle Aurore", ["handwritten"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Loose ink handwriting",
  }),
  latin("petit-formal-script", "Petit Formal Script", ["calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Formal lettering",
  }),
  latin("herr-von-muellerhoff", "Herr Von Muellerhoff", ["calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Tall German script",
  }),
  latin("mea-culpa", "Mea Culpa", ["calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Expressive brush script",
  }),
  latin("ms-madi", "Ms Madi", ["calligraphy"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Modern signature",
  }),
  latin("yellowtail", "Yellowtail", ["handwritten", "display"], {
    weights: [400],
    fallback: SCRIPT_FALLBACK,
    note: "Retro brush script",
  }),
  latin("caveat", "Caveat", ["handwritten"], {
    fallback: SCRIPT_FALLBACK,
    note: "Casual handwriting",
  }),
  latin("kalam", "Kalam", ["handwritten"], {
    weights: [300, 400, 700],
    fallback: SCRIPT_FALLBACK,
    note: "Everyday ink",
  }),
  latin("shrikhand", "Shrikhand", ["display"], {
    weights: [400],
    note: "Festive display",
  }),
];

export const FONT_CATEGORIES: { id: FontCategory; label: string }[] = [
  { id: "serif", label: "Serif" },
  { id: "sans", label: "Sans" },
  { id: "display", label: "Display" },
  { id: "calligraphy", label: "Calligraphy" },
  { id: "handwritten", label: "Handwritten" },
];

/**
 * Older invitations store one of the original fourteen font-pair ids. They
 * keep working by resolving to a library family of the same character.
 */
export const LEGACY_FONT_IDS: Record<string, string> = {
  romance: "cormorant-garamond",
  editorial: "playfair-display",
  modern: "italiana",
  heritage: "marcellus",
  script: "pinyon-script",
  arabic: "amiri",
  didone: "bodoni-moda",
  book: "libre-baskerville",
  display: "dm-serif-display",
  engraved: "cinzel",
  calligraphy: "great-vibes",
  handwritten: "sacramento",
  ruqaa: "aref-ruqaa",
  kufi: "reem-kufi",
};

const FONT_MAP = new Map(FONT_LIBRARY.map((font) => [font.id, font]));
const LEGACY_MAP = new Map(
  Object.entries(LEGACY_FONT_IDS)
    .map(([legacy, id]) => [legacy, FONT_MAP.get(id)] as const)
    .filter((entry): entry is [string, FontDef] => Boolean(entry[1])),
);

export function fontById(id: string | undefined | null): FontDef {
  if (!id) return FONT_MAP.get("cormorant-garamond")!;
  return FONT_MAP.get(id) ?? LEGACY_MAP.get(id) ?? FONT_MAP.get("cormorant-garamond")!;
}

export function fontFamilyFor(id: string | undefined | null): string {
  return fontById(id).family;
}

export function fontNameFor(id: string | undefined | null): string {
  return fontById(id).name;
}

export function isLegacyFontId(id: string | undefined | null): boolean {
  return Boolean(id && !FONT_MAP.has(id) && LEGACY_MAP.has(id));
}

export function supportsArabic(id: string | undefined | null): boolean {
  const script = fontById(id).script;
  return script === "arabic" || script === "both";
}

const ARABIC_SAMPLE = "أهلاً وسهلاً بكم في ليلة العمر";
const LATIN_SAMPLE = "Alexandra & Omar — at last";

export function fontSamples(font: FontDef, custom?: string): { latin: string; arabic: string } {
  const arabic = font.script === "arabic";
  const clean = custom?.trim().slice(0, 90);
  const hasArabic = Boolean(clean && /[\u0600-\u06FF]/.test(clean));
  return {
    latin: !arabic && clean && !hasArabic ? clean : LATIN_SAMPLE,
    arabic: hasArabic && clean ? clean : ARABIC_SAMPLE,
  };
}

/* -------------------------------------------------------------------------- */
/* On-demand loader                                                           */
/* -------------------------------------------------------------------------- */

type FontStatus = "loading" | "ready" | "unavailable";
const statusCache = new Map<string, FontStatus>();
const loadPromises = new Map<string, Promise<boolean>>();
const links = new Map<string, HTMLLinkElement>();

function nearestWeight(font: FontDef, weight: number): number {
  return font.weights.reduce((best, candidate) =>
    Math.abs(candidate - weight) < Math.abs(best - weight) ? candidate : best,
  );
}

function fontCssUrl(font: FontDef, weight: number, italic: boolean): string {
  const family = font.google.replace(/ /g, "+");
  const axis = italic && font.italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
  return `https://fonts.googleapis.com/css2?family=${family}:${axis}&display=swap`;
}

export function fontStatus(fontId: string, weight = 400, italic = false): FontStatus | undefined {
  return statusCache.get(`${fontById(fontId).id}:${weight}:${italic ? 1 : 0}`);
}

/**
 * Fetches one face from Google Fonts and verifies it actually loaded with the
 * FontFaceSet API. Returns false when the face is blocked, offline, or missing
 * so callers can show an honest fallback state instead of pretending.
 */
export function ensureFont(fontId: string, weight = 400, italic = false): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  const font = fontById(fontId);
  const requested = nearestWeight(font, weight);
  const useItalic = Boolean(italic && font.italic);
  const key = `${font.id}:${requested}:${useItalic ? 1 : 0}`;
  const existing = loadPromises.get(key);
  if (existing) return existing;

  statusCache.set(key, "loading");
  const href = fontCssUrl(font, requested, useItalic);

  const promise = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      statusCache.set(key, value ? "ready" : "unavailable");
      resolve(value);
    };

    let link = links.get(href);
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.lamsaFont = font.id;
      document.head.appendChild(link);
      links.set(href, link);
    }

    const verify = () => {
      if (typeof document.fonts === "undefined") {
        finish(true);
        return;
      }
      const spec = `${useItalic ? "italic " : ""}${requested} 20px "${font.name}"`;
      document.fonts
        .load(spec, "Aaأبج")
        .then((faces) => finish(faces.length > 0 || document.fonts.check(spec)))
        .catch(() => finish(false));
    };

    if (link.sheet) {
      // The stylesheet was already fetched in this session.
      void verify();
    } else {
      link.addEventListener("load", verify, { once: true });
      link.addEventListener("error", () => finish(false), { once: true });
    }

    // Never leave a card spinning if the network hangs.
    window.setTimeout(() => {
      if (!settled) finish(document.fonts?.check(`${requested} 20px "${font.name}"`) ?? false);
    }, 8000);
  });

  loadPromises.set(key, promise);
  return promise;
}

/** Prefetches every face used by a page, weight by weight. */
export function ensureDesignFonts(fonts: { id?: string; weight?: number; italic?: boolean }[]) {
  const seen = new Set<string>();
  for (const font of fonts) {
    if (!font.id) continue;
    const key = `${font.id}:${font.weight ?? 400}:${font.italic ? 1 : 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    void ensureFont(font.id, font.weight ?? 400, Boolean(font.italic));
  }
}

export function resetFontCacheForTests() {
  statusCache.clear();
  loadPromises.clear();
  links.forEach((link) => link.remove());
  links.clear();
}
