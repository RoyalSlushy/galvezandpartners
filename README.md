# galvezandpartners.com — custom Next.js + Tailwind site

A custom, fully self-authored **Next.js (App Router, TypeScript) + Tailwind CSS**
rebuild of the Galvez & Partners / G&P Advertising site (a Phoenix, AZ advertising
& marketing firm).

The site began as a captured mirror of the original Wix build; it has since been
**detached from Wix** — every page is now hand-authored React components styled
with Tailwind, with no Wix runtime, no `dangerouslySetInnerHTML`, and no
`comp-XXXX` id coupling. Brand tokens (colors, fonts, fluid type) are formalized
in `tailwind.config.ts`.

```sh
npm install
npm run dev      # http://localhost:3000
# or: npm run build && npm run start
```

## How it works

- **Routing** — one route per page under `app/` (`/`, `/our-works`, `/our-team`,
  `/our-partners`, `/contact-us`, `/case-study`, `/o`, and
  `/case-study/[slug]` for the four case studies). All server-rendered on
  demand (`force-dynamic`) so CMS edits show up immediately.
- **In-page CMS** — there is no separate admin page. The gear icon in the
  footer opens a password unlock; once unlocked, a small icon drawer sits in
  the bottom-right corner. Toggling edit mode highlights every managed element
  on the live page: click text to edit it in place (Enter applies,
  Shift+Enter adds a line in multiline fields, Esc cancels), click an image to
  open a visual picker (drag-drop upload to Supabase Storage, gallery of images
  already on the site, or paste a URL), and use the hover chips on list items
  (team, services, nav, galleries…) to add/remove/reorder. All edits preview
  live and batch locally until the drawer's save icon writes them to Supabase
  (`site_content` via the `admin-content` edge function). Every image slot —
  including the homepage hero — also accepts **video** (MP4/WebM up to 40 MB):
  drop a clip into the picker and it renders as a muted, looping, autoplaying
  background (a still first frame for `prefers-reduced-motion` visitors).
- **Styling** — Tailwind CSS. Design tokens (navy/gold/cream palette, the
  Garet/Sebastien font scale as fluid `clamp()` sizes, 980px site width,
  750/1000px breakpoints) live in `tailwind.config.ts`; `@font-face` and base
  layers are in `app/globals.css`.
- **Interactivity** — plain React: `components/ui/Carousel.tsx` (swipe/arrows/
  dots/keyboard), `components/ui/RevealOnScroll.tsx` (+ `useInView`) for on-scroll
  enter animations, and `components/layout/MobileMenu.tsx` for the mobile nav.
- **Content** — typed defaults live in `content/`; Supabase `site_content`
  rows (one JSON blob per section) override them via `lib/cms.ts`.
- **Assets** — images and fonts are still served from the Wix CDN
  (`static.wixstatic.com`) by URL; `lib/wix.ts` builds image URLs. These can be
  self-hosted later without touching the components.

## Project layout

| Path | Purpose |
|------|---------|
| `app/` | Routes (one folder per page) + `layout.tsx` (Header/Footer shell) + `globals.css` |
| `components/layout/` | `Header`, `Footer`, `MobileMenu`, `NavLinks` |
| `components/ui/` | `Carousel`, `RevealOnScroll`/`useInView`, `Button`, `Container`, `SocialIcons` |
| `components/sections/` | Page section components (home, work, team, partners, contact) |
| `content/` | Typed content: `site`, `home`, `work`, `team`, `caseStudies` |
| `lib/wix.ts` | Wix CDN image URL helper |
| `tailwind.config.ts` | Brand design tokens |
| `public/logo.svg` | Wordmark logo |

## Instagram feed (optional live posts)

The homepage Instagram strip (`components/sections/home/InstagramFeed.tsx`)
renders through a custom UI — a drifting film-strip of tilted cards, not an
`<iframe>` embed. By default it shows a **CMS-curated** list of posts
(`home.instagram.posts` — image, link, caption, editable in the drawer), so it
works with zero setup.

To show the account's **real** latest posts, set an Instagram access token as an
environment variable and the same UI switches to the live feed automatically
(`lib/instagram.ts` fetches server-side and caches for an hour; the curated list
stays as the edit-mode source and the fallback):

```sh
INSTAGRAM_ACCESS_TOKEN=<long-lived-token>   # required to go live
INSTAGRAM_USER_ID=me                         # optional (defaults to the token's account)
INSTAGRAM_API_BASE=https://graph.instagram.com  # optional
```

Getting a token (Instagram's Basic Display API was retired on 4 Dec 2024, so a
**Business or Creator** account is required):

1. Create an app at <https://developers.facebook.com> and add the
   *Instagram* product (Instagram API with Instagram Login / Instagram Graph API).
2. Connect the `@galvezandpartners` Instagram Business/Creator account and
   authorize the `instagram_business_basic` scope.
3. Exchange the short-lived token for a long-lived one (valid ~60 days; refresh
   it before expiry via `graph.instagram.com/refresh_access_token`).

The token is server-only (no `NEXT_PUBLIC_` prefix), so it is never exposed to
the browser. Without it, the curated posts show and nothing breaks.

## Notes

- The Spanish (`/es`) site and the old captured `*.html` files have been removed;
  legacy `*.html` and `/es/*` URLs 301-redirect to their English routes
  (`next.config.mjs`).
- The contact form writes submissions to the Supabase `contact_submissions`
  table.
- Images and fonts require network access to the Wix CDN to render.
