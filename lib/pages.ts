import { promises as fs } from "fs";
import path from "path";

export type PageEntry = { slug: string[]; file: string; route: string };

/**
 * The 12 well-formed English pages of the captured mirror. (Two case-study
 * captures — arizona-alzheimer's-consortium and case-study-6 — were truncated
 * by the crawl and are intentionally excluded.)
 */
export const PAGES: PageEntry[] = [
  { slug: [], file: "index.html", route: "/" },
  { slug: ["our-works"], file: "our-works.html", route: "/our-works" },
  { slug: ["our-team"], file: "our-team.html", route: "/our-team" },
  { slug: ["our-partners"], file: "our-partners.html", route: "/our-partners" },
  { slug: ["our-partners-list"], file: "our-partners-list.html", route: "/our-partners-list" },
  { slug: ["contact-us"], file: "contact-us.html", route: "/contact-us" },
  { slug: ["case-study"], file: "case-study.html", route: "/case-study" },
  { slug: ["o"], file: "o.html", route: "/o" },
  { slug: ["case-study", "elg-accident-attorneys"], file: "case-study/elg-accident-attorneys.html", route: "/case-study/elg-accident-attorneys" },
  { slug: ["case-study", "helios-education-foundation"], file: "case-study/helios-education-foundation.html", route: "/case-study/helios-education-foundation" },
  { slug: ["case-study", "la-bombita"], file: "case-study/la-bombita.html", route: "/case-study/la-bombita" },
  { slug: ["case-study", "precision-aging-network"], file: "case-study/precision-aging-network.html", route: "/case-study/precision-aging-network" },
];

const FILE_TO_ROUTE: Record<string, string> = Object.fromEntries(
  PAGES.map((p) => [p.file, p.route])
);

// Source HTML lives at the repo root (where Next runs).
const CONTENT_DIR = process.cwd();

export type PageData = {
  html: string;
  title: string;
  description?: string;
  lang: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Rewrite a captured (crawl-relative) `*.html` link to its clean Next route,
 * resolving the path relative to the page's own directory. Links that don't map
 * to an in-scope English page (external, anchors, Spanish, truncated pages) are
 * left untouched.
 */
function rewriteHref(url: string, pageDir: string): string {
  if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(url)) return url;
  const splitIdx = url.search(/[#?]/);
  let pathPart = url;
  let suffix = "";
  if (splitIdx >= 0) {
    pathPart = url.slice(0, splitIdx);
    suffix = url.slice(splitIdx);
  }
  if (!pathPart.toLowerCase().endsWith(".html")) return url;
  const resolved = path.posix.normalize(path.posix.join(pageDir, pathPart));
  const route = FILE_TO_ROUTE[resolved];
  return route ? route + suffix : url;
}

function rewriteLinks(html: string, file: string): string {
  const dir = path.posix.dirname(file);
  const pageDir = dir === "." ? "" : dir;
  return html.replace(
    /(\shref=)(["'])([^"']*)\2/gi,
    (_m, pre: string, q: string, url: string) =>
      pre + q + rewriteHref(url, pageDir) + q
  );
}

export async function getPageData(slug: string[]): Promise<PageData | null> {
  const route = slug.length ? "/" + slug.join("/") : "/";
  const entry = PAGES.find((p) => p.route === route);
  if (!entry) return null;

  const raw = await fs.readFile(path.join(CONTENT_DIR, entry.file), "utf8");

  const headInner = raw.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const bodyInner = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? raw;

  const stripScripts = (s: string) => s.replace(/<script[\s\S]*?<\/script>/gi, "");
  const stripEnhance = (s: string) =>
    s.replace(/<!-- GP-ENHANCE:START[\s\S]*?GP-ENHANCE:END -->/g, "");

  // Keep the head's <style> blocks (all Wix CSS is inlined there) and its <link>
  // tags (hreflang/canonical/icons), dropping the Spanish alternate since the ES
  // pages aren't part of this English-only build. <meta>/<title> are handled by
  // Next's metadata API instead. Scripts (dead Wix runtime) are dropped.
  const styles = headInner.match(/<style\b[\s\S]*?<\/style>/gi) ?? [];
  const links = (headInner.match(/<link\b[^>]*>/gi) ?? []).filter(
    (t) => !/hreflang\s*=\s*["']?es/i.test(t)
  );
  const body = stripEnhance(stripScripts(bodyInner));

  let html = [...links, ...styles].join("\n") + "\n" + body;
  html = rewriteLinks(html, entry.file);

  const titleRaw = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const descRaw =
    raw.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    raw.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1];
  const lang = raw.match(/<html[^>]*\blang=["']([^"']*)["']/i)?.[1] ?? "en";

  return {
    html,
    title: titleRaw ? decodeEntities(titleRaw.trim()) : "Galvez & Partners",
    description: descRaw ? decodeEntities(descRaw.trim()) : undefined,
    lang,
  };
}
