/**
 * Build a Wix CDN image URL from a stored media id (assets are kept on the Wix
 * CDN for now). Requests a server-side crop at the given size.
 */
const HOST = "https://static.wixstatic.com/media";

/* ------------------------------------------------------------------ *
 * Focal point.
 *
 * A stored media value may carry an optional focal point as a suffix —
 * "<media>#focus=<x>,<y>", where x and y are 0–100 percentages marking the
 * point that should stay in frame when the image is cropped to fill a box
 * (object-cover), e.g. the very tall case-study hero on a phone. The suffix
 * rides along with the image string, so it survives list add/remove/reorder
 * with no schema change; every URL builder strips it before using the media id.
 * ------------------------------------------------------------------ */

const FOCUS_RE = /#focus=(\d{1,3}(?:\.\d+)?),(\d{1,3}(?:\.\d+)?)$/;
const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/** The media id/URL without any focal-point suffix. */
export function stripFocus(id: string): string {
  return id.replace(FOCUS_RE, "");
}

/** The stored focal point as {x, y} percentages, or null when none is set. */
export function readFocus(id: string): { x: number; y: number } | null {
  const m = id.match(FOCUS_RE);
  if (!m) return null;
  return { x: clampPct(parseFloat(m[1])), y: clampPct(parseFloat(m[2])) };
}

/** The focal point as a CSS `object-position` value, or undefined when none is
 * set (so the element keeps its default centring). */
export function focusPosition(id: string): string | undefined {
  const f = readFocus(id);
  return f ? `${f.x}% ${f.y}%` : undefined;
}

/** Attach (or replace) a focal point on a media value. Passing the centre
 * (50, 50) or null clears it, keeping the stored string tidy. */
export function withFocus(id: string, x: number | null, y: number | null): string {
  const base = stripFocus(id);
  if (x == null || y == null) return base;
  const cx = Math.round(clampPct(x));
  const cy = Math.round(clampPct(y));
  if (cx === 50 && cy === 50) return base;
  return `${base}#focus=${cx},${cy}`;
}

export function wixImage(id: string, w = 600, h = 400): string {
  const clean = stripFocus(id);
  return `${HOST}/${clean}/v1/fill/w_${w},h_${h},al_c,q_85,enc_auto/${clean}`;
}

/**
 * Like {@link wixImage} but scales the whole image to *fit* within w×h,
 * preserving its aspect ratio (no server-side crop). Pair with a CSS
 * `object-contain` box to show the entire image, letterboxed if needed.
 */
export function wixImageFit(id: string, w = 600, h = 400): string {
  const clean = stripFocus(id);
  return `${HOST}/${clean}/v1/fit/w_${w},h_${h},al_c,q_85,enc_auto/${clean}`;
}
