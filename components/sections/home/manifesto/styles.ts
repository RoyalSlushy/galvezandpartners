/**
 * The manifesto's styles — the ways the "multi-cultural / Agency doing / big
 * things" section can make its entrance. One is picked in the editor (the chip
 * on the section in edit mode) and stored in home.multicultural.style; the
 * section renders it, and the picker reads the names and blurbs from here.
 *
 * Go Big is the only style left; any other stored id (a retired style) falls
 * back to it.
 */
export const MANIFESTO_STYLES = [
  {
    id: "gobig",
    name: "Go Big",
    blurb: "“big things” grows as you scroll, until you fly through its letters into the visual.",
    cue: "Scroll-driven",
  },
] as const;

export type ManifestoStyleId = (typeof MANIFESTO_STYLES)[number]["id"];
export type ManifestoStyleMeta = (typeof MANIFESTO_STYLES)[number];

export const DEFAULT_MANIFESTO_STYLE: ManifestoStyleId = "gobig";

/** The stored value as a style that exists. */
export function resolveManifestoStyle(id: unknown): ManifestoStyleId {
  return MANIFESTO_STYLES.some((s) => s.id === id)
    ? (id as ManifestoStyleId)
    : DEFAULT_MANIFESTO_STYLE;
}

export function manifestoStyleMeta(id: ManifestoStyleId): ManifestoStyleMeta {
  return MANIFESTO_STYLES.find((s) => s.id === id) ?? MANIFESTO_STYLES[0];
}
