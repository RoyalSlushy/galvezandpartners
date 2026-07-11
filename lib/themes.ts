/**
 * Site color themes for the in-page CMS.
 *
 * Each theme is a set of "R G B" triplets that feed the CSS custom properties
 * (`--c-navy`, `--c-gold`, …) the Tailwind brand tokens resolve against (see
 * `tailwind.config.ts` and the `:root` defaults in `app/globals.css`). Because
 * the tokens are variables, switching a theme recolors the whole site without
 * touching component markup.
 *
 * Palettes draw on the Galvez & Partners brand board (Denim Blue, Dark Blue
 * Grey, Gold) plus two dusk-sky themes that add a `backdrop` — a fixed
 * background gradient (see `body::before` in globals.css) for a sunset glow.
 *
 * Keep this module free of any `@/lib/supabase` import: it is bundled into every
 * page (the layout renders the active theme server-side) and must stay tiny.
 */

export type ThemeId =
  | "midnight-gold"
  | "denim-blue"
  | "golden-hour"
  | "twilight-coral";

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
  /**
   * Optional fixed background gradient (any CSS `background` value) painted
   * behind the whole page for a sunset feel. Omit for a flat base color.
   */
  backdrop?: string;
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
    id: "golden-hour",
    label: "Golden Hour",
    description: "Clean deep-blue base under a coral-and-gold sunset sky.",
    vars: {
      navy: "18 27 45", // #121b2d clean deep blue (no muddiness)
      "navy-soft": "31 44 68", // #1f2c44 slate-blue panel
      gold: "245 178 68", // #f5b244 warm amber accent
      "gold-bright": "255 202 112", // #ffca70
      "gold-dark": "216 132 66", // #d88442
      cream: "255 231 200", // #ffe7c8
      "brown-deep": "224 122 74", // #e07a4a terracotta (secondary warm, not brown)
    },
    swatches: ["18 27 45", "245 178 68", "31 44 68", "255 231 200"],
    // Coral + amber glow rising off the horizon into clean deep blue.
    backdrop:
      "radial-gradient(150% 95% at 50% -12%, rgb(255 138 76 / 0.30), transparent 52%)," +
      "radial-gradient(120% 75% at 82% 4%, rgb(var(--c-gold) / 0.24), transparent 58%)," +
      "linear-gradient(180deg, rgb(var(--c-navy-soft)) 0%, rgb(var(--c-navy)) 62%)",
  },
  {
    id: "twilight-coral",
    label: "Twilight Coral",
    description: "Teal-lagoon base with a coral dusk glow over the water.",
    vars: {
      navy: "13 35 45", // #0d232d deep teal
      "navy-soft": "22 52 63", // #16343f teal panel
      gold: "255 125 95", // #ff7d5f sunset coral accent
      "gold-bright": "255 159 122", // #ff9f7a
      "gold-dark": "214 92 74", // #d65c4a
      cream: "255 223 205", // #ffdfcd
      "brown-deep": "240 170 92", // #f0aa5c warm gold-sand (secondary)
    },
    swatches: ["13 35 45", "255 125 95", "22 52 63", "255 223 205"],
    // Coral + sand glow over a deep-teal lagoon at dusk.
    backdrop:
      "radial-gradient(150% 95% at 50% -12%, rgb(255 125 95 / 0.32), transparent 54%)," +
      "radial-gradient(120% 80% at 18% 6%, rgb(255 190 120 / 0.20), transparent 60%)," +
      "linear-gradient(180deg, rgb(var(--c-navy-soft)) 0%, rgb(var(--c-navy)) 66%)",
  },
];

const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/** Resolve a stored theme id (or anything invalid) to a real theme. */
export function getTheme(id: string | null | undefined): Theme {
  return (id && THEME_BY_ID.get(id as ThemeId)) || THEME_BY_ID.get(DEFAULT_THEME_ID)!;
}

/** Serialize a theme's variables (and its backdrop) into a CSS declaration block. */
export function themeCssVars(theme: Theme): string {
  const decls = (Object.keys(theme.vars) as (keyof ThemeVars)[]).map(
    (name) => `--c-${name}:${theme.vars[name]}`,
  );
  decls.push(`--c-backdrop:${theme.backdrop ?? "none"}`);
  return decls.join(";");
}
