/**
 * Build a Wix CDN image URL from a stored media id (assets are kept on the Wix
 * CDN for now). Requests a server-side crop at the given size.
 */
const HOST = "https://static.wixstatic.com/media";

export function wixImage(id: string, w = 600, h = 400): string {
  return `${HOST}/${id}/v1/fill/w_${w},h_${h},al_c,q_85,enc_auto/${id}`;
}
