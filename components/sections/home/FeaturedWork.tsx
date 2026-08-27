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

type FeaturedCopy = {
  eyebrow: string;
  heading: string;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
};

// Card width also capped by viewport height (cards are 4:5) so the section's
// header, row, and progress line together stay inside one screen — the whole of
// the cases is on view once you reach them, on short laptops included.
const CARD_W = "w-[74vw] max-w-[420px] shrink-0 sm:w-[min(38vw,40vh)] md:w-[min(30vw,40vh)]";
const END_CARD_W = "w-[74vw] max-w-[420px] shrink-0 sm:w-[min(34vw,36vh)] md:w-[min(26vw,36vh)]";

/**
 * "Featured work" — a horizontal gallery of the shared work.items portfolio
 * (the same list that powers /our-works, so CMS edits propagate). The row is
 * one you push sideways: swipe on touch, drag with the mouse, or scroll
 * horizontally with a trackpad, snapping card to card. Vertical scroll is left
 * alone — the page runs straight past the section — and a gold progress line
 * under the row tracks how far along the cases you are. A closing card carries
 * the CTA to the Our Works page.
 *
 * Edit mode shares the same row; all edit affordances live there.
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
  const t = useT();
  // Only the section heading is translated; work titles are brand names.
  const tv = useEditableT();

  const scrollRowRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Mouse users can grab the row and drag it sideways (touch already scrolls
  // natively). Scroll snap is parked during the drag so the row follows the
  // cursor instead of fighting the detents, and a real drag swallows the
  // release click so the card under the cursor doesn't open.
  useEffect(() => {
    const scroller = scrollRowRef.current;
    if (!scroller) return;
    let down = false;
    let dragged = false;
    let lastX = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      dragged = false;
      lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      if (!dragged && Math.abs(dx) < 4) return;
      if (!dragged) scroller.style.scrollSnapType = "none";
      dragged = true;
      lastX = e.clientX;
      scroller.scrollLeft -= dx;
    };
    const onUp = () => {
      down = false;
      if (dragged) scroller.style.scrollSnapType = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
      // The page transition starts its outgoing push on any link press, so tell
      // it this one is going nowhere (see PageReveal).
      window.dispatchEvent(new Event("gp:nav-cancel"));
    };
    const onDragStart = (e: Event) => e.preventDefault();
    scroller.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    scroller.addEventListener("click", onClick, true);
    scroller.addEventListener("dragstart", onDragStart);
    return () => {
      scroller.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      scroller.removeEventListener("click", onClick, true);
      scroller.removeEventListener("dragstart", onDragStart);
      scroller.style.scrollSnapType = "";
    };
  }, [editMode]);

  // Progress line: how far the row has travelled, so the horizontal journey
  // still reads at a glance.
  useEffect(() => {
    const scroller = scrollRowRef.current;
    const bar = barRef.current;
    if (!scroller || !bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = scroller.scrollWidth - scroller.clientWidth;
      const p = max > 0 ? scroller.scrollLeft / max : 1;
      // A sliver stays lit at rest so the line reads as a track to travel
      // rather than an empty rule.
      bar.style.transform = `scaleX(${Math.max(0.03, Math.min(1, p))})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      bar.style.transform = "";
    };
  }, [items.length, editMode]);

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
      <div className="relative">
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

  return (
    // One screen, content centred in it: reaching the section puts the whole of
    // it — header, cards, progress line — on view, with nothing of the row left
    // below the fold. min-h (not h) so a short or narrow screen grows the
    // section rather than clipping it. Edit mode grows freely instead.
    <section
      className={`w-full overflow-hidden bg-navy ${
        editMode ? "py-20 sm:py-28" : "min-h-viewport flex flex-col justify-center py-10"
      }`}
    >
      <Container>
        <RevealOnScroll>{header}</RevealOnScroll>
      </Container>
      <div
        ref={scrollRowRef}
        className={`gallery-scroll cursor-grab snap-x snap-mandatory overflow-x-auto pt-12 active:cursor-grabbing ${
          editMode ? "mt-16 pb-6" : "mt-10 pb-4"
        }`}
      >
        <div className="gallery-pad flex w-max items-start gap-6 sm:gap-9">
          {cards}
          {endCard}
        </div>
      </div>
      <Container className="mt-6">
        <div className="h-px w-full bg-white/10">
          <div ref={barRef} className="h-full origin-left scale-x-[0.03] bg-gold" />
        </div>
      </Container>
      {editMode && (
        <Container className="mt-6">
          <AddChip listPath="work.items" label="work item" />
        </Container>
      )}
    </section>
  );
}
