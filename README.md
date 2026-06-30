# galvezandpartners.com — site mirror + Next.js app

A static mirror of **galvezandpartners.com** (Galvez & Partners / G&P Advertising,
a Phoenix, AZ advertising & marketing firm), captured by an automated crawl of
the live site — now also served through a **Next.js (App Router, TypeScript)**
application that preserves the original UI.

## Next.js app

The captured HTML is the source content; the Next.js app renders it per route so
the cloned UI is kept intact while gaining real routing and restored
interactivity.

```sh
npm install
npm run dev      # http://localhost:3000
# or: npm run build && npm run start
```

**How it works**

- Each route reads its captured `*.html` file at build time and renders it with
  `dangerouslySetInnerHTML`. All Wix CSS is inlined in the page's `<head>`
  `<style>` blocks, so the layout is reproduced exactly; images/fonts still load
  from the Wix CDNs by absolute URL.
- The dead Wix runtime `<script>`s are stripped. Interactivity is re-implemented
  in `components/Enhancements.tsx` (a client component): swipable card carousel,
  on-scroll section reveal, and the mobile hamburger menu + EN/ES language
  toggle. Styling overrides live in `app/enhance.css`.
- Internal `*.html` links in the captured markup are rewritten to clean Next
  routes (`index.html` → `/`, `our-works.html` → `/our-works`,
  `case-study/la-bombita.html` → `/case-study/la-bombita`, …).

**Project layout**

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Home route (`/`) |
| `app/[...slug]/page.tsx` | All other routes (statically generated) |
| `lib/pages.ts` | Page manifest + HTML parsing / link rewriting |
| `components/WixPage.tsx` | Renders a captured page's markup |
| `components/Enhancements.tsx` | Client-side carousel / menu / reveal / language toggle |
| `app/enhance.css` | Styling overrides for the above |

**Scope:** the app wires up the **11 well-formed English pages** (home, our-works,
our-team, our-partners, contact-us, case-study index, `o`, and 4 case studies).
Not included: the Spanish (`/es`) pages, the two truncated case-study captures
(`arizona-alzheimer's-consortium`, `case-study-6`), and `our-partners-list`
(its capture is Wix's 404 document). Captured internal links to any of these are
rewritten to the canonical live site so they stay reachable instead of 404ing;
the language toggle shows English as active with the Spanish option inert.

---

## Captured mirror

## What's captured

Every page listed in the site's `sitemap.xml` was crawled — both the English
site and its Spanish (`/es`) counterpart, including the dynamic case-study
pages. **28 pages total** (14 English + 14 Spanish).

| Page | URL | Local file |
|------|-----|------------|
| Home | `/` | `index.html` |
| Our Works | `/our-works` | `our-works.html` |
| Our Team | `/our-team` | `our-team.html` |
| Our Partners | `/our-partners` | `our-partners.html` |
| Our Partners (list) | `/our-partners-list` | `our-partners-list.html` |
| Contact Us | `/contact-us` | `contact-us.html` |
| Case Studies (index) | `/case-study` | `case-study.html` |
| "o" page | `/o` | `o.html` |
| Case study: Case Study 6 | `/case-study/case-study-6` | `case-study/case-study-6.html` |
| Case study: Arizona Alzheimer's Consortium | `/case-study/arizona-alzheimer's-consortium` | `case-study/arizona-alzheimer's-consortium.html` |
| Case study: La Bombita | `/case-study/la-bombita` | `case-study/la-bombita.html` |
| Case study: Helios Education Foundation | `/case-study/helios-education-foundation` | `case-study/helios-education-foundation.html` |
| Case study: Precision Aging Network | `/case-study/precision-aging-network` | `case-study/precision-aging-network.html` |
| Case study: ELG Accident Attorneys | `/case-study/elg-accident-attorneys` | `case-study/elg-accident-attorneys.html` |

The Spanish site mirrors the same set under `es/` (`es/index.html`,
`es/our-works.html`, `es/case-study/la-bombita.html`, …).

## How it was crawled

The live site is hosted on **Wix (Thunderbolt)**, which **server-renders** the
full text content of each page into the initial HTML — so headings, copy, and
links are all present in the captured files even before any JavaScript runs.

`tools/crawl.py` performs the crawl:

1. Reads the page list from the site's sitemaps (`sitemap.xml`,
   `es_es-sitemap.xml`, and the per-section sitemaps they reference).
2. Downloads each page's server-rendered HTML over `curl` (with retry/backoff).
3. **Rewrites internal navigation links** — the `<a href>` / `<link href>`
   entries that point at another captured page — to **relative local paths**, so
   you can click through the whole mirror offline. Apostrophe/ampersand
   encodings (`%27`, `&#x27;`, `&#39;`, `&amp;`) are normalised so every link
   variant resolves to the right local file.
4. Leaves **Wix CDN asset URLs absolute** — images (`static.wixstatic.com`),
   CSS/JS bundles (`static.parastorage.com`), fonts, and runtime data
   (`*.wixapps.net`). A Wix site's styling and imagery are served from these
   hosts and reconstructed client-side, so they can't be meaningfully bundled
   into a static folder; keeping them absolute means the pages render fully when
   you have network access, and degrade to (fully readable) unstyled content
   when you don't.

Links to paths that aren't part of this mirror (e.g. the Wix `/es/blank`
placeholder) are left absolute so they still resolve against the live site.

To re-run the crawl (e.g. to refresh the mirror):

```sh
python3 tools/crawl.py .
```

## Viewing locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

With network access the pages render with full Wix styling and images. Offline,
the text content and internal navigation still work; styling/images won't load
because they live on the Wix CDNs.

## Notes

- Network egress to the site + its Wix CDN hosts must be reachable for the crawl
  to run and for the mirror to render with assets. In a Claude Code web session
  this means the environment's network policy must allow `galvezandpartners.com`
  and the Wix hosts (`*.wixstatic.com`, `*.parastorage.com`, `*.wixapps.net`).
  This session's environment had egress open, so the crawl ran directly.
- `robots.txt` on the live site is `Allow: /` (only `*?lightbox=` is
  disallowed, which the crawl does not request).
