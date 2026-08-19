/**
 * Instagram's official per-post embed.
 *
 * A profile page cannot be framed (instagram.com refuses it, and there is no
 * public "embed my feed" endpoint), so the strip can only ever frame single
 * posts: `instagram.com/p|reel|tv/<shortcode>/embed`. That endpoint needs no
 * token — but it does need the post's own URL, which reaches us either from the
 * live feed (permalinks; see lib/instagram.ts) or from an admin pasting a post
 * link onto a card.
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/oembed
 */

// Accepts both instagram.com/p/<code>/ and instagram.com/<user>/p/<code>/, with
// or without www and any trailing query (?igsh=… is on every shared link).
const POST_URL =
  /^https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9._]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;

/**
 * The embeddable URL for a single Instagram post, or null when `href` is
 * anything else — a profile link (what every un-linked card defaults to), an
 * empty value, or another site entirely. Callers treat null as "not
 * embeddable" and fall back to opening the link normally.
 */
export function instagramEmbedUrl(href: string): string | null {
  const m = POST_URL.exec((href || "").trim());
  if (!m) return null;
  const kind = m[1].toLowerCase() === "reels" ? "reel" : m[1].toLowerCase();
  return `https://www.instagram.com/${kind}/${m[2]}/embed/captioned/`;
}
