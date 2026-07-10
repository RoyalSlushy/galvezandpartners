/**
 * Site color themes for the in-page CMS.
 *
 * Each theme is a set of "R G B" triplets that feed the CSS custom properties
 * (`--c-navy`, `--c-gold`, …) the Tailwind brand tokens resolve against (see
 * `tailwind.config.ts` and the `:root` defaults in `app/globals.css`). Because
 * the tokens are variables, switching a theme recolors the whole site without
 * touching component markup.
 *
 * The palettes are built from the Galvez & Partners brand board — Denim Blue,
 * Dark Blue Grey, Harvest Gold and Metallic Bronze.
 *
 * Keep this module free of any `@/lib/supabase` import: it is bundled into every
 * page (the layout renders the active theme server-side) and must stay tiny.
 */

export type ThemeId =
  | "midnight-gold"
  | "denim-blue"
  | "harvest-gold"
  | "metallic-bronze";

/** The CSS custom properties a theme controls, as space-separated RGB triplets. */
export type ThemeVars = {
  navy: string; // page background / primary dark
  "navy-soft": string; // panels, cards, drawer
  gold: string; // primary accent
  "gold-bright": string; // accent hover / emphasis
  "gold-dark": string; // muted accent
  cream: string; // light accent text
  "brown-deep": string; // deep accent
};

export type Theme = {
  id: ThemeId;
  label: string;
  description: string;
  vars: ThemeVars;
  /** Representative colors (background, accent, panel, highlight) for previews. */
  swatches: [string, string, string, string];
};

export const DEFAULT_THEME_ID: ThemeId = "midnight-gold";

export const THEMES: Theme[] = [
  {
    id: "midnight-gold",
    label: "Midnight Gold",
    description: "The signature look — deep navy with a warm gold accent.",
    vars: {
      navy: "20 25 36",
      "navy-soft": "35 42 61",
      gold: "230 179 103",
      "gold-bright": "224 169 79",
      "gold-dark": "173 134 77",
      cream: "243 216 176",
      "brown-deep": "115 90 51",
    },
    swatches: ["20 25 36", "230 179 103", "35 42 61", "243 216 176"],
  },
  {
    id: "denim-blue",
    label: "Denim Blue",
    description: "Dark blue-grey base with a bright denim-blue accent.",
    vars: {
      navy: "18 32 52",
      "navy-soft": "30 58 92",
      gold: "109 176 222",
      "gold-bright": "146 199 235",
      "gold-dark": "74 128 168",
      cream: "201 226 244",
      "brown-deep": "40 70 104",
    },
    swatches: ["18 32 52", "109 176 222", "30 58 92", "201 226 244"],
  },
  {
    id: "harvest-gold",
    label: "Harvest Gold",
    description: "Navy base with a brighter, sunlit harvest-gold accent.",
    vars: {
      navy: "20 25 36",
      "navy-soft": "35 42 61",
      gold: "232 185 104",
      "gold-bright": "243 205 138",
      "gold-dark": "176 132 62",
      cream: "245 226 190",
      "brown-deep": "120 92 48",
    },
    swatches: ["20 25 36", "232 185 104", "35 42 61", "245 226 190"],
  },
  {
    id: "metallic-bronze",
    label: "Metallic Bronze",
    description: "Rich bronze-brown base with gold and cream highlights.",
    vars: {
      navy: "32 26 14",
      "navy-soft": "74 58 26",
      gold: "232 185 104",
      "gold-bright": "244 208 140",
      "gold-dark": "176 132 62",
      cream: "243 224 189",
      "brown-deep": "74 58 26",
    },
    swatches: ["32 26 14", "232 185 104", "74 58 26", "243 224 189"],
  },
];

const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/** Resolve a stored theme id (or anything invalid) to a real theme. */
export function getTheme(id: string | null | undefined): Theme {
  return (id && THEME_BY_ID.get(id as ThemeId)) || THEME_BY_ID.get(DEFAULT_THEME_ID)!;
}

/** Serialize a theme's variables into a CSS declaration block body. */
export function themeCssVars(theme: Theme): string {
  return (Object.keys(theme.vars) as (keyof ThemeVars)[])
    .map((name) => `--c-${name}:${theme.vars[name]}`)
    .join(";");
}
