/**
 * Build a Wix CDN image URL from a stored media id (assets are kept on the Wix
 * CDN for now). Requests a server-side crop at the given size.
 */
const HOST = "https://static.wixstatic.com/media";

export function wixImage(id: string, w = 600, h = 400): string {
  return `${HOST}/${id}/v1/fill/w_${w},h_${h},al_c,q_85,enc_auto/${id}`;
}

/**
 * Like {@link wixImage} but scales the whole image to *fit* within w×h,
 * preserving its aspect ratio (no server-side crop). Pair with a CSS
 * `object-contain` box to show the entire image, letterboxed if needed.
 */
export function wixImageFit(id: string, w = 600, h = 400): string {
  return `${HOST}/${id}/v1/fit/w_${w},h_${h},al_c,q_85,enc_auto/${id}`;
}
