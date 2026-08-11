import type { CSSProperties } from "react";
import { resolveImage } from "@/lib/adminClient";

/** Trailing name suffixes that shouldn't count as the last name. */
const NAME_SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;

/** First letter of a member's last name, upper-cased. Skips a trailing suffix
 * (e.g. "Cesar Salas Jr" -> "S", "Hector Galvez" -> "G"). */
export function lastNameInitial(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && NAME_SUFFIX.test(parts[parts.length - 1])) {
    parts.pop();
  }
  const last = parts[parts.length - 1] ?? "";
  return last.charAt(0).toUpperCase();
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
