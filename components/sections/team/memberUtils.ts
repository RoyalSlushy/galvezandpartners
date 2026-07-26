import { wixImage } from "@/lib/wix";
import { PLACEHOLDER_IMG } from "@/lib/adminClient";

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

/** Display URL for a member photo: a bare Wix id is resized on the CDN, a full
 * URL is used as-is, and an empty value falls back to the placeholder. */
export function memberPhotoSrc(photo: string): string {
  if (!photo) return PLACEHOLDER_IMG;
  return photo.startsWith("http") ? photo : wixImage(photo, 400, 480);
}
