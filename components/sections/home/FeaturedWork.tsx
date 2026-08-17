"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import CtaGrid from "@/components/sections/home/CtaGrid";
import { GlyphNumber } from "@/components/ui/Glyph";
import type { Work } from "@/content/work";
import { focusPosition } from "@/lib/wix";
import { PLACEHOLDER_IMG, resolveImage } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { useMotionOff, useMotionStyle } from "@/components/motion/MotionProvider";

type FeaturedCopy = {
  eyebrow: string;
  heading: string;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
};

// Card width also capped by viewport height (cards are 4:5) so the pinned
// viewport always fits header + track + progress line on short laptops.
const CARD_W = "w-[74vw] max-w-[420px] shrink-0 sm:w-[min(38vw,44vh)] md:w-[min(30vw,44vh)]";
const END_CARD_W = "w-[74vw] max-w-[420px] shrink-0 sm:w-[min(34vw,40vh)] md:w-[min(26vw,40vh)]";

/**
 * "Featured work" — a scroll-pinned horizontal gallery of the shared
 * work.items portfolio (the same list that powers /our-works, so CMS edits
 * propagate). The section pins for one viewport while vertical scroll drives
 * the card track sideways; images get a subtle counter-parallax and a gold
 * progress line tracks the journey. A closing card carries the CTA to the
 * Our Works page. Keyboard focus inside the track auto-scrolls the page so
 * the focused card is actually in view.
 *
 * The site-wide motion setting picks the treatment: classic is the pinned
 * gallery described above, kinetic doubles the counter-parallax and leans each
 * card into the travel, minimal skips the pin for the plain snap row.
 *
 * Edit mode and motion off swap in that same native snap-scroll row (all edit
 * affordances live there), which is also the graceful no-pin fallback.
 */
export default function FeaturedWork({
  featured: serverFeatured,
  items: serverItems,
}: {
  featured: FeaturedCopy;
  items: Work[];
}) {
  const featured = useCmsValue("home.featuredWork", serverFeatured);
  const items = useCmsValue("work.items", serverItems);
  const editMode = useEditMode();
  const reduced = useMotionOff();
  const motion = useMotionStyle();
  const t = useT();
  // Only the section heading is translated; work titles are brand names.
  const tv = useEditableT();

  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Minimal keeps the native snap row (which is also the edit-mode and
  // motion-off fallback) — no scroll-jacking, just a gallery you push.
  const pinned = !editMode && !reduced && motion !== "minimal";
  // How hard the images counter-travel against the track, and whether the cards
  // themselves tilt into the movement.
  const parallax = motion === "kinetic" ? 78 : 34;
  const tiltPerRatio = motion === "kinetic" ? 5 : 0;

  useEffect(() => {
    if (!pinned) return;
    // The hook's first paint predates its matchMedia effect — bail sync too.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    const bar = barRef.current;
    if (!section || !sticky || !track || !bar) return;

    let scrollable = 0;
    let raf = 0;
    let ticking = false;

    const measure = () => {
      scrollable = Math.max(0, track.scrollWidth - window.innerWidth);
      // Total height = one pinned viewport + the horizontal distance to cover.
      section.style.height = `${sticky.offsetHeight + scrollable}px`;
    };

    const parallaxEls = Array.from(track.querySelectorAll<HTMLElement>("[data-parallax]"));

    const update = () => {
      ticking = false;
      if (scrollable <= 0) return;
      const rect = section.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / scrollable));
      const x = -p * scrollable;
      track.style.transform = `translate3d(${x}px,0,0)`;
      bar.style.transform = `scaleX(${p})`;

      // Counter-parallax: shift each image against the track's travel based on
      // how far its card sits from the viewport center.
      const center = window.innerWidth / 2;
      const cap = parallax * 1.3;
      for (const el of parallaxEls) {
        const r = el.getBoundingClientRect();
        const ratio = (r.left + r.width / 2 - center) / window.innerWidth;
        const shift = Math.max(-cap, Math.min(cap, ratio * parallax));
        el.style.transform = `translateX(${shift}px) scale(1.12)`;
        // Kinetic: each card leans by how far it sits from the middle, so the
        // row reads as one piece of card stock bending through the viewport.
        if (tiltPerRatio) {
          const card = el.closest<HTMLElement>("[data-card]");
          if (card) {
            const tilt = Math.max(-1, Math.min(1, ratio * 2)) * tiltPerRatio;
            card.style.transform = `perspective(1200px) rotateY(${(-tilt).toFixed(2)}deg)`;
          }
        }
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
      for (const el of parallaxEls) {
        el.style.transform = "scale(1.12)";
        const card = el.closest<HTMLElement>("[data-card]");
        if (card) card.style.transform = "";
      }
    };
  }, [pinned, parallax, tiltPerRatio, items.length]);

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <EditableText
          path="home.featuredWork.eyebrow"
          value={tv(featured.eyebrow)}
          as="p"
          className="font-display text-f6 lowercase text-gold"
        />
        <EditableText
          path="home.featuredWork.heading"
          value={tv(featured.heading)}
          as="h2"
          className="mt-2 font-heading text-f3 leading-none text-white"
        />
      </div>
      <EditableText
        path="home.featuredWork.blurb"
        value={tv(featured.blurb)}
        as="p"
        multiline
        className="max-w-md whitespace-pre-line pb-2 font-body text-base leading-relaxed text-white/60 sm:text-lg"
      />
    </div>
  );

  const cards = items.map((w, i) => {
    const inner = (
      <div data-card className="relative will-change-transform">
        {/* Giant outlined index overlapping the card */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-9 left-2 z-10 font-display text-[5.5rem] leading-none text-stroke-white opacity-60 sm:-top-12 sm:text-[7rem]"
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
        <div className="group relative overflow-hidden bg-navy-soft">
          <div data-parallax className="will-change-transform" style={{ transform: "scale(1.12)" }}>
            <EditableImage
              path={`work.items.${i}.img`}
              raw={w.img}
              src={w.img ? resolveImage(w.img, 700, 875) : PLACEHOLDER_IMG}
              style={{ objectPosition: focusPosition(w.img) }}
              alt={w.title}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <div
            className={`absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/15 to-transparent transition-opacity duration-500${
              editMode ? " pointer-events-none" : ""
            }`}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 sm:p-6">
            <EditableText
              path={`work.items.${i}.title`}
              value={w.title}
              as="h3"
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
                className="mb-1 flex h-10 w-10 shrink-0 translate-y-3 items-center justify-center bg-gold text-navy opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
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
    const offset = i % 2 === 1 ? "sm:mt-10" : "";
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

  const endCard = (
    <div className={`flex ${END_CARD_W} snap-start items-center`}>
      <div className="relative flex aspect-[4/5] w-full flex-col items-start justify-center overflow-hidden border border-gold/25 bg-gradient-to-br from-navy-soft to-navy p-8">
        <CtaGrid className="glyph-grid-fade-left" glyphClassName="bg-gold" fontClassName="text-gold" />
        <p className="relative font-display text-f5 lowercase leading-[0.95] text-white">
          {t("there's")}{" "}
          <span className="text-gold">{t("more")}</span>
        </p>
        <p className="relative mt-3 font-body text-base text-white/60">
          {t("Every story on one page.")}
        </p>
        <Button href={featured.ctaHref} variant="gold" className="relative mt-8">
          {editMode ? (
            <EditableText
              path="home.featuredWork.ctaLabel"
              value={featured.ctaLabel}
              link={{ path: "home.featuredWork.ctaHref", value: featured.ctaHref }}
            />
          ) : (
            t(featured.ctaLabel)
          )}
        </Button>
      </div>
    </div>
  );

  if (!pinned) {
    return (
      <section key="fw-static" className="w-full overflow-hidden bg-navy py-20 sm:py-28">
        <Container>
          <RevealOnScroll>{header}</RevealOnScroll>
        </Container>
        <div className="gallery-scroll mt-16 snap-x snap-mandatory overflow-x-auto pb-6 pt-12">
          <div className="gallery-pad flex w-max items-start gap-6 sm:gap-9">
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
    <section key="fw-pinned" ref={sectionRef} className="relative w-full bg-navy">
      <div
        ref={stickyRef}
        className="h-viewport sticky top-0 flex flex-col justify-center overflow-hidden py-6"
      >
        <Container>{header}</Container>
        <div
          ref={trackRef}
          className="gallery-pad mt-10 flex w-max items-start gap-6 pt-12 will-change-transform sm:gap-9"
        >
          {cards}
          {endCard}
        </div>
        <Container className="mt-10">
          <div className="h-px w-full bg-white/10">
            <div ref={barRef} className="h-full origin-left scale-x-0 bg-gold" />
          </div>
        </Container>
      </div>
    </section>
  );
}
