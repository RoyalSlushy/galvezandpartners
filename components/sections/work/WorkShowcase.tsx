"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import useFitText from "@/components/ui/useFitText";
import { GlyphNumber } from "@/components/ui/Glyph";
import type { Work } from "@/content/work";
import { wixImage } from "@/lib/wix";
import { PLACEHOLDER_IMG } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

// Card width doubly capped by viewport height (cards are 4:5) so heading +
// track + progress line always fit inside one viewport under the header.
const CARD_W = "w-[72vw] max-w-[420px] shrink-0 sm:w-[min(34vw,38vh)] md:w-[min(27vw,38vh)]";
const END_CARD_W = "w-[72vw] max-w-[420px] shrink-0 sm:w-[min(30vw,34vh)] md:w-[min(24vw,34vh)]";

/**
 * /our-works hero: everything fits in one viewport. The section pins while
 * vertical scroll drives the case cards sideways (same scroll-jack pattern as
 * the homepage FeaturedWork); a gold progress line tracks the journey. The site
 * header stays pinned at the top for the whole section and slides away only as
 * the gallery scrolls in (see the body[data-gp-pinned-header] rule). The heading
 * is centered and fit to a single line at any width, with the word "speaks"
 * accented in gold under a pulsing halo. A masonry-grid icon rail on the left
 * jumps to the #work-gallery section below the cases.
 *
 * Edit mode and reduced motion swap in a native snap-scroll row (all edit
 * affordances live there), which is also the graceful no-pin fallback.
 */
export default function WorkShowcase({
  items: serverItems,
  heading: serverHeading,
}: {
  items: Work[];
  heading: string;
}) {
  const items = useCmsValue("work.items", serverItems);
  const heading = useCmsValue("work.heading", serverHeading);
  const editMode = useEditMode();
  const reduced = usePrefersReducedMotion();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode
  // (matches WorkGrid). Case-study titles are brand names and stay untranslated.
  const tv = (s: string) => (editMode ? s : t(s));

  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const pinned = !editMode && !reduced;

  useEffect(() => {
    if (!pinned) return;
    // The hook's first paint predates its matchMedia effect — bail sync too.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    const bar = barRef.current;
    if (!section || !sticky || !track || !bar) return;

    // Pin the site header at the top for the duration of this section (see the
    // body[data-gp-pinned-header] rule); it slides off as the gallery arrives.
    const header = document.querySelector<HTMLElement>("header");
    const root = document.documentElement;
    document.body.setAttribute("data-gp-pinned-header", "");

    let scrollable = 0;
    let headerH = 0;
    let raf = 0;
    let ticking = false;

    const measure = () => {
      scrollable = Math.max(0, track.scrollWidth - window.innerWidth);
      headerH = header ? header.offsetHeight : 0;
      // Total height = one pinned viewport + the horizontal distance to cover.
      section.style.height = `${sticky.offsetHeight + scrollable}px`;
    };

    const parallaxEls = Array.from(track.querySelectorAll<HTMLElement>("[data-parallax]"));

    const update = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      // Header release: pinned (top:0) while the section's bottom is more than a
      // header-height below the viewport top; over the final header-height of
      // travel it slides up to -headerH so it clears the frame exactly as the
      // gallery reaches the top. Runs regardless of horizontal scrollability.
      const shift = Math.max(0, Math.min(headerH, headerH - rect.bottom));
      root.style.setProperty("--gp-header-top", `${-shift}px`);

      if (scrollable <= 0) return;
      const p = Math.max(0, Math.min(1, -rect.top / scrollable));
      const x = -p * scrollable;
      track.style.transform = `translate3d(${x}px,0,0)`;
      bar.style.transform = `scaleX(${p})`;

      // Counter-parallax: shift each image against the track's travel based on
      // how far its card sits from the viewport center.
      const center = window.innerWidth / 2;
      for (const el of parallaxEls) {
        const r = el.getBoundingClientRect();
        const ratio = (r.left + r.width / 2 - center) / window.innerWidth;
        el.style.transform = `translateX(${Math.max(-44, Math.min(44, ratio * 34))}px) scale(1.12)`;
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(update);
      }
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    // Keyboard users tab into links the transform has carried off-screen:
    // undo the browser's clipped-container scroll and drive the page scroll
    // (which maps 1:1 to horizontal travel) until the card is centered.
    const onFocusIn = (e: Event) => {
      sticky.scrollLeft = 0;
      if (scrollable <= 0) return;
      const target = (e.target as HTMLElement).closest("a") ?? (e.target as HTMLElement);
      const r = target.getBoundingClientRect();
      const delta = r.left + r.width / 2 - window.innerWidth / 2;
      if (Math.abs(delta) > 4) window.scrollBy(0, delta);
    };

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    track.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      track.removeEventListener("focusin", onFocusIn);
      // The static branch may reuse these nodes — leave no stale styles behind.
      section.style.height = "";
      track.style.transform = "";
      bar.style.transform = "";
      for (const el of parallaxEls) el.style.transform = "scale(1.12)";
      // Release the header pin (and its scroll-driven offset).
      document.body.removeAttribute("data-gp-pinned-header");
      root.style.removeProperty("--gp-header-top");
    };
  }, [pinned, items.length]);

  const cards = items.map((w, i) => {
    const inner = (
      <div className="relative">
        {/* Outlined index overlapping the card */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-7 left-2 z-10 font-display text-[4.5rem] leading-none text-stroke-white opacity-60 sm:-top-9 sm:text-[5.5rem]"
        >
          <GlyphNumber value={String(i + 1).padStart(2, "0")} tintClassName="bg-white" />
        </span>
        {editMode && (
          <ListControls
            listPath="work.items"
            index={i}
            count={items.length}
            label="work item"
            className="right-2 top-2"
          />
        )}
        <div className="group relative overflow-hidden rounded-2xl bg-navy-soft">
          <div data-parallax className="will-change-transform" style={{ transform: "scale(1.12)" }}>
            <EditableImage
              path={`work.items.${i}.img`}
              raw={w.img}
              src={
                w.img
                  ? w.img.startsWith("http")
                    ? w.img
                    : wixImage(w.img, 700, 875)
                  : PLACEHOLDER_IMG
              }
              alt={w.title}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <div
            className={`absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/15 to-transparent transition-opacity duration-500${
              editMode ? " pointer-events-none" : ""
            }`}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
            <EditableText
              path={`work.items.${i}.title`}
              value={w.title}
              as="h2"
              className="font-heading text-f8 leading-tight text-white"
              link={{
                path: `work.items.${i}.slug`,
                value: w.slug ?? "",
                kind: "slug",
                createCaseStudy: true,
              }}
            />
            {w.slug && (
              <span
                aria-hidden
                className="mb-1 flex h-10 w-10 shrink-0 translate-y-3 items-center justify-center rounded-full bg-gold text-navy opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>
    );
    const offset = i % 2 === 1 ? "sm:mt-6" : "";
    return w.slug && !editMode ? (
      <Link
        key={i}
        href={`/case-study/${w.slug}`}
        aria-label={w.title}
        className={`${CARD_W} ${offset} snap-start`}
      >
        {inner}
      </Link>
    ) : (
      <div key={i} className={`${CARD_W} ${offset} snap-start`}>
        {inner}
      </div>
    );
  });

  // Closing card carries the hand-off to the gallery wall below.
  const endCard = (
    <a href="#work-gallery" className={`flex ${END_CARD_W} snap-start items-center`}>
      <div className="flex aspect-[4/5] w-full flex-col items-start justify-center rounded-2xl border border-gold/25 bg-gradient-to-br from-navy-soft to-navy p-7">
        <p className="font-display text-f5 lowercase leading-[0.95] text-gold">{tv("the gallery")}</p>
        <p className="mt-3 font-body text-base text-white/60">
          {tv("Every frame on one wall — sort it, filter it, tag it.")}
        </p>
        <span className="btn-outline mt-7">{tv("explore")}</span>
      </div>
    </a>
  );

  if (!pinned) {
    return (
      <section key="ws-static" className="relative w-full overflow-hidden bg-navy py-16 sm:py-20">
        <GalleryRail label={tv("gallery")} />
        <Container>
          <RevealOnScroll>
            <ShowcaseHeading heading={heading} display={tv(heading)} editMode={editMode} />
          </RevealOnScroll>
        </Container>
        <div className="gallery-scroll mt-10 snap-x snap-mandatory overflow-x-auto pb-6 pt-10">
          <div className="gallery-pad flex w-max items-start gap-6 sm:gap-8">
            {cards}
            {endCard}
          </div>
        </div>
        {editMode && (
          <Container className="mt-6">
            <AddChip listPath="work.items" label="work item" />
          </Container>
        )}
      </section>
    );
  }

  return (
    <section key="ws-pinned" ref={sectionRef} className="relative w-full bg-navy">
      {/* Pinned below the sticky site header (top = --header-h) and sized to the
          remaining viewport, so the header and this content together fill the
          screen with nothing cut off. The header slides away as the section
          ends (see the effect). */}
      <div
        ref={stickyRef}
        className="sticky top-[var(--header-h)] overflow-hidden"
        style={{ height: "calc(100svh - var(--header-h))" }}
      >
        <div className="flex h-full flex-col justify-center">
          <GalleryRail label={tv("gallery")} />
          <Container>
            <ShowcaseHeading heading={heading} display={tv(heading)} editMode={editMode} />
          </Container>
          <div
            ref={trackRef}
            className="gallery-pad mt-4 flex w-max items-start gap-6 pt-10 will-change-transform sm:gap-8"
          >
            {cards}
            {endCard}
          </div>
          <Container className="mt-6">
            <div className="h-px w-full bg-white/10">
              <div ref={barRef} className="h-full origin-left scale-x-0 bg-gold" />
            </div>
          </Container>
        </div>
      </div>
    </section>
  );
}

/**
 * Centered heading, binary-search-fitted to exactly one line at any viewport
 * width (it never wraps). The verb of the default heading is accented in gold
 * with a pulsing halo — matched on the "speak"/"habla" stem so it lands on the
 * right word in both the English source and its Spanish translation. Edit mode
 * falls back to the plain editable field (bound to the untranslated source).
 */
function ShowcaseHeading({
  heading,
  display,
  editMode,
}: {
  heading: string;
  display: string;
  editMode: boolean;
}) {
  const { ref } = useFitText<HTMLDivElement>({
    max: 150,
    min: 16,
    singleLine: true,
    deps: [display, editMode],
  });

  if (editMode) {
    return (
      <EditableText
        path="work.heading"
        value={heading}
        as="h1"
        className="text-center font-display text-f2 lowercase text-white"
      />
    );
  }

  let accented = false;
  const tokens = display.split(/(\s+)/).map((token, i) => {
    if (!accented && /speak|habla/i.test(token)) {
      accented = true;
      return (
        <span key={i} className="halo-word">
          <span aria-hidden className="halo-ring" />
          <span aria-hidden className="halo-ring halo-ring-late" />
          <span className="relative">{token}</span>
        </span>
      );
    }
    return token;
  });

  return (
    // The fitted size lives on this box; the h1 inherits it (preflight sets
    // headings to font-size: inherit). Vertical padding keeps the expanding
    // halo inside the clip box; text-f2 is only the pre-hydration fallback.
    <div ref={ref} className="overflow-hidden whitespace-nowrap py-[0.3em] text-center text-f2">
      <h1 className="font-display lowercase leading-none text-white">{tokens}</h1>
    </div>
  );
}

/**
 * Left-edge rail: a masonry-grid icon (plus a vertical label on desktop) that
 * jumps to the #work-gallery wall below the cases.
 */
function GalleryRail({ label }: { label: string }) {
  return (
    <a
      href="#work-gallery"
      aria-label="Jump to the gallery"
      className="group absolute left-2 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-3 sm:left-5"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-navy/75 text-gold shadow-lg backdrop-blur transition group-hover:border-gold group-hover:bg-gold group-hover:text-navy sm:h-12 sm:w-12">
        <MasonryIcon className="h-5 w-5" />
      </span>
      <span
        aria-hidden
        className="hidden font-heading text-[11px] uppercase tracking-[0.3em] text-white/50 transition group-hover:text-gold sm:block"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </span>
    </a>
  );
}

function MasonryIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="8" height="12" rx="1.5" />
      <rect x="13" y="3" width="8" height="7" rx="1.5" />
      <rect x="13" y="12" width="8" height="9" rx="1.5" />
      <rect x="3" y="17" width="8" height="4" rx="1.5" />
    </svg>
  );
}
