import type { CSSProperties } from "react";
import { resolveImage } from "@/lib/adminClient";

/** Trailing name suffixes that shouldn't count as the last name. */
const NAME_SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;

/** First letter of a member's last name, upper-cased. Skips a trailing suffix
 * (e.g. "Cesar Salas Jr" -> "S", "Hector Galvez" -> "G"). */
export function lastNameInitial(name: string): string {
  return lastName(name.trim().split(/\s+/).filter(Boolean)).charAt(0).toUpperCase();
}

/** The last of `parts` that isn't a suffix. */
function lastName(parts: string[]): string {
  const kept = parts.slice();
  while (kept.length > 1 && NAME_SUFFIX.test(kept[kept.length - 1])) {
    kept.pop();
  }
  return kept[kept.length - 1] ?? "";
}

/** A member's name cut down to a first name and a last initial ("Antonio
 * Casian" -> "Antonio C."), for places where the full name would crowd out what
 * is around it. Skips a trailing suffix the same way lastNameInitial does, and
 * hands back a one-word name untouched. */
export function shortName(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  // One word is its own last name; leave it whole rather than reduce it to an
  // initial. Same when everything after the first word is a suffix.
  if (parts.length < 2) return trimmed;
  const last = lastName(parts);
  if (!last || last === parts[0]) return trimmed;
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

/** Display URL for a member photo, at the size the tiles and cards want.
 * Delegates to the shared resolver, so a data URI or an app-served path works
 * here exactly as it does in every other media field — this used to handle only
 * full URLs and bare CDN ids, and quietly mangled anything else. */
export const memberPhotoSrc = (photo: string) => resolveImage(photo, 400, 480);

/** Which way the profile card's pieces are swept off. Going to the next member
 * sends them left; going back sends them the other way, so the motion reads as
 * retracing your steps rather than always advancing. */
export type SweepDir = -1 | 1;

/**
 * One piece's angles and its stagger. Arriving, every piece flows outward from
 * the same point; leaving, they are swept toward one side, and the piece the
 * arm reaches first goes first — the right-hand card for a leftward sweep, the
 * left-hand one when it travels the other way.
 *
 * Shared by the cards and by the stickers scattered down the margins, so both
 * arrive and leave as one set (see .gp-emerge / .gp-sweep in globals.css).
 */
export function piece(
  rot: string,
  spin: string,
  inDelayMs: number,
  /** Stagger when swept left, and its mirror when swept right. */
  outDelays: { left: number; right: number },
  exiting: boolean,
  dir: SweepDir,
): CSSProperties {
  const goingLeft = dir < 0;
  return {
    ["--rot" as string]: rot,
    ["--spin" as string]: spin,
    ...(exiting
      ? {
          ["--sweep-x" as string]: goingLeft ? "-130vw" : "130vw",
          ["--sweep-rot" as string]: goingLeft ? "-16deg" : "16deg",
        }
      : null),
    animationDelay: `${exiting ? (goingLeft ? outDelays.left : outDelays.right) : inDelayMs}ms`,
  };
}
