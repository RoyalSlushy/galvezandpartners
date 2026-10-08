/**
 * The manifesto's styles — the ways the "multi-cultural / Agency doing / big
 * things" section can make its entrance. One is picked in the editor (the chip
 * on the section in edit mode) and stored in home.multicultural.style; the
 * section renders it, and the picker reads the names and blurbs from here.
 *
 * "ink" is the original and the default, so a site that has never picked one
 * looks exactly as it always did. An id that is no longer listed (a style that
 * was retired) falls back to it too.
 */
export const MANIFESTO_STYLES = [
  {
    id: "ink",
    name: "Ink Fill",
    blurb: "The words ink in one by one as you scroll, and the visual springs out of its frame.",
    cue: "Scroll-linked",
  },
  {
    id: "curtain",
    name: "Curtain Call",
    blurb: "A gold bar sweeps across each line and leaves it behind; the visual is unveiled the same way.",
    cue: "Plays on arrival",
  },
  {
    id: "stardust",
    name: "Stardust",
    blurb: "A drift of gold dust swirls together into the headline. Run the cursor through it and it scatters.",
    cue: "On arrival · interactive",
  },
  {
    id: "gobig",
    name: "Go Big",
    blurb: "“big things” grows as you scroll, until you fly through its letters into the visual.",
    cue: "Scroll-driven",
  },
  {
    id: "departures",
    name: "Departures",
    blurb: "A split-flap board clatters through the other language, holds, then flips over to this one.",
    cue: "Plays on arrival",
  },
  {
    id: "gravity",
    name: "Gravity",
    blurb: "The letters drop in and bounce to rest, and the payoff lands with a thud. Nudge them after.",
    cue: "On arrival · interactive",
  },
] as const;

export type ManifestoStyleId = (typeof MANIFESTO_STYLES)[number]["id"];
export type ManifestoStyleMeta = (typeof MANIFESTO_STYLES)[number];

export const DEFAULT_MANIFESTO_STYLE: ManifestoStyleId = "ink";

/** The stored value as a style that exists. */
export function resolveManifestoStyle(id: unknown): ManifestoStyleId {
  return MANIFESTO_STYLES.some((s) => s.id === id)
    ? (id as ManifestoStyleId)
    : DEFAULT_MANIFESTO_STYLE;
}

export function manifestoStyleMeta(id: ManifestoStyleId): ManifestoStyleMeta {
  return MANIFESTO_STYLES.find((s) => s.id === id) ?? MANIFESTO_STYLES[0];
}
