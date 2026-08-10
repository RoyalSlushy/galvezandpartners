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
