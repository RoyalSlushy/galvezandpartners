/**
 * Idle animations for the Go Big manifesto: what the composed title does while
 * it sits on screen before the dive starts. Picked in the editor (the style
 * chip's popover) and stored in home.multicultural.idle. Most of them draw on
 * the work gallery's images and play inside the static (white) title lines.
 */
export const MANIFESTO_IDLES = [
  {
    id: "none",
    name: "Off",
    blurb: "The title holds still until the visitor scrolls.",
  },
  {
    id: "letters",
    name: "Through the letters",
    blurb: "The white line turns into a window onto gallery photos, panning slowly and changing every few seconds.",
  },
  {
    id: "flash",
    name: "Word flash",
    blurb: "One word at a time briefly fills with a gallery photo, then returns to white.",
  },
  {
    id: "drift",
    name: "Gallery drift",
    blurb: "Faint gallery polaroids float around the headline, fading in and out with a new photo each time.",
  },
  {
    id: "sheen",
    name: "Gold sheen",
    blurb: "A band of gold sweeps across the white line every few seconds.",
  },
] as const;

export type ManifestoIdleId = (typeof MANIFESTO_IDLES)[number]["id"];

export const DEFAULT_MANIFESTO_IDLE: ManifestoIdleId = "none";

/** The stored value as an idle animation that exists. */
export function resolveManifestoIdle(id: unknown): ManifestoIdleId {
  return MANIFESTO_IDLES.some((s) => s.id === id) ? (id as ManifestoIdleId) : DEFAULT_MANIFESTO_IDLE;
}
