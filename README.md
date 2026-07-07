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
  (`site_content` via the `admin-content` edge function).
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

## Notes

- The Spanish (`/es`) site and the old captured `*.html` files have been removed;
  legacy `*.html` and `/es/*` URLs 301-redirect to their English routes
  (`next.config.mjs`).
- The contact form writes submissions to the Supabase `contact_submissions`
  table.
- Images and fonts require network access to the Wix CDN to render.
