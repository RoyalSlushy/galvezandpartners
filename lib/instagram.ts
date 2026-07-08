import type { InstagramPost } from "@/content/home";

/**
 * Optional **live** Instagram feed.
 *
 * Instagram's old Basic Display API (the "show my own feed" API) was shut down
 * on 4 Dec 2024. Its successor is the *Instagram API with Instagram Login*
 * (a.k.a. Instagram Graph API): create a Meta app, connect an Instagram
 * Business/Creator account, and mint a long-lived user access token. With that
 * token we can read the account's own recent media server-side and map it into
 * the same `InstagramPost` shape the on-page strip renders — so the site keeps
 * its bespoke UI instead of an iframe embed.
 *
 * This runs only on the server (the token is a non-`NEXT_PUBLIC_` env var, so
 * it is never shipped to the browser). When no token is configured — or on any
 * error — we return `null` and the homepage falls back to the CMS-curated
 * posts, so the section always shows something.
 *
 *   INSTAGRAM_ACCESS_TOKEN   long-lived token (required to go live)
 *   INSTAGRAM_USER_ID        defaults to "me" (the token's own account)
 *   INSTAGRAM_API_BASE       defaults to https://graph.instagram.com
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform
 */

type IgMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

type IgMedia = {
  id: string;
  caption?: string;
  media_type: IgMediaType;
  media_url?: string;
  thumbnail_url?: string; // present for VIDEO — the poster frame
  permalink: string;
};

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink";

export async function getInstagramFeed(limit = 12): Promise<InstagramPost[] | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;

  const base = process.env.INSTAGRAM_API_BASE || "https://graph.instagram.com";
  const userId = process.env.INSTAGRAM_USER_ID || "me";
  const url = `${base}/${userId}/media?fields=${FIELDS}&limit=${limit}&access_token=${encodeURIComponent(
    token,
  )}`;

  try {
    // Cache the feed for an hour even under dynamic rendering so we never hammer
    // the API (and stay well inside Instagram's rate limits).
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: IgMedia[] };

    const posts = (json.data ?? [])
      .map((m): InstagramPost | null => {
        // Videos/reels expose a still poster in thumbnail_url; images/albums
        // use media_url. Fall back across both so nothing renders blank.
        const src =
          (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ||
          m.thumbnail_url ||
          m.media_url;
        if (!src || !m.permalink) return null;
        return {
          img: src,
          href: m.permalink,
          caption: (m.caption ?? "").split("\n")[0].trim().slice(0, 140),
        };
      })
      .filter((p): p is InstagramPost => p !== null);

    return posts.length ? posts : null;
  } catch {
    return null;
  }
}
