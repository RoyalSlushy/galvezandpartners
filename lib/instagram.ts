import type { InstagramPost } from "@/content/home";

/**
 * Optional **live** Instagram feed for the homepage strip. Instagram's old
 * Basic Display API (the "show my own feed" API) was shut down on 4 Dec 2024
 * and a personal account can no longer be read by any official API, so a
 * Business/Creator account plus authentication is required. We support two
 * ways to get that, picked up from env vars at request time:
 *
 *   1. BEHOLD_FEED_URL   — a Behold.so JSON feed URL (https://feeds.behold.so/…).
 *                          Behold handles the Instagram auth + token refresh and
 *                          serves a simple JSON array of posts. Easiest to run.
 *   2. INSTAGRAM_ACCESS_TOKEN — a long-lived token for the Instagram Graph API
 *                          (Instagram API with Instagram Login), used directly.
 *                          Optional: INSTAGRAM_USER_ID (default "me"),
 *                          INSTAGRAM_API_BASE (default graph.instagram.com).
 *
 * Either source is mapped into the same `InstagramPost` shape the strip renders,
 * cached for an hour. With neither configured — or on any error — this returns
 * `null` and the homepage falls back to the CMS-curated posts, so the section
 * always shows something. These run only on the server (no `NEXT_PUBLIC_`
 * prefix), so nothing sensitive reaches the browser.
 *
 * Docs: https://behold.so/docs/json-feeds/ · https://developers.facebook.com/docs/instagram-platform
 */

const REVALIDATE = 3600; // seconds — cache the feed for an hour

function firstLine(text: string, max = 140): string {
  return (text || "").split("\n")[0].trim().slice(0, max);
}

/* ---------------- Behold.so JSON feed ---------------- */

type BeholdSize = { mediaUrl?: string };
type BeholdPost = {
  mediaType?: string;
  mediaUrl?: string;
  permalink?: string;
  caption?: string;
  prunedCaption?: string;
  sizes?: {
    small?: BeholdSize;
    medium?: BeholdSize;
    large?: BeholdSize;
    full?: BeholdSize;
  };
};

async function fromBehold(url: string): Promise<InstagramPost[] | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return null;
    const json = (await res.json()) as BeholdPost[] | { posts?: BeholdPost[] };
    const list: BeholdPost[] = Array.isArray(json) ? json : json?.posts ?? [];

    const posts = list
      .map((p): InstagramPost | null => {
        // Prefer an optimized still (webp) — works as the poster for videos too —
        // and only fall back to the raw media URL.
        const img =
          p.sizes?.medium?.mediaUrl ||
          p.sizes?.large?.mediaUrl ||
          p.sizes?.small?.mediaUrl ||
          p.sizes?.full?.mediaUrl ||
          p.mediaUrl;
        if (!img || !p.permalink) return null;
        return { img, href: p.permalink, caption: firstLine(p.prunedCaption || p.caption || "") };
      })
      .filter((p): p is InstagramPost => p !== null);

    return posts.length ? posts : null;
  } catch {
    return null;
  }
}

/* ---------------- Instagram Graph API (direct token) ---------------- */

type IgMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
type IgMedia = {
  id: string;
  caption?: string;
  media_type: IgMediaType;
  media_url?: string;
  thumbnail_url?: string; // present for VIDEO — the poster frame
  permalink: string;
};

const GRAPH_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink";

async function fromGraphApi(token: string, limit: number): Promise<InstagramPost[] | null> {
  const base = process.env.INSTAGRAM_API_BASE || "https://graph.instagram.com";
  const userId = process.env.INSTAGRAM_USER_ID || "me";
  const url = `${base}/${userId}/media?fields=${GRAPH_FIELDS}&limit=${limit}&access_token=${encodeURIComponent(
    token,
  )}`;
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: IgMedia[] };

    const posts = (json.data ?? [])
      .map((m): InstagramPost | null => {
        const src =
          (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ||
          m.thumbnail_url ||
          m.media_url;
        if (!src || !m.permalink) return null;
        return { img: src, href: m.permalink, caption: firstLine(m.caption ?? "") };
      })
      .filter((p): p is InstagramPost => p !== null);

    return posts.length ? posts : null;
  } catch {
    return null;
  }
}

/* ---------------- public entry ---------------- */

export async function getInstagramFeed(limit = 12): Promise<InstagramPost[] | null> {
  const feedUrl = process.env.BEHOLD_FEED_URL || process.env.INSTAGRAM_FEED_URL;
  if (feedUrl) {
    const posts = await fromBehold(feedUrl);
    if (posts) return posts.slice(0, limit);
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (token) return fromGraphApi(token, limit);

  return null;
}
