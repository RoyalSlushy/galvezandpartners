"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import NextChevron from "@/components/ui/NextChevron";
import { useMinWidth } from "@/components/ui/useMinWidth";
import CtaGrid from "@/components/sections/home/CtaGrid";
import { GlyphNumber } from "@/components/ui/Glyph";
import type { Work } from "@/content/work";
import { focusPosition, wixImageFit } from "@/lib/wix";
import { PLACEHOLDER_IMG, isVideoUrl, resolveImage } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import { useMotionOff } from "@/components/motion/MotionProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { CaseVideo, VideoChip } from "@/components/sections/work/CaseVideo";

type FeaturedCopy = {
  eyebrow: string;
  heading: string;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
};

/** How long the row takes to glide from one case to the next (ms) — the same
 * duration and curve as the cards' width change (.fw-card in globals.css), so
 * the two move as one. A plain ease, no spring. */
const GLIDE_MS = 600;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** The card's thumbnail: a bare Wix id is fetched whole (fit, not cropped), so
 * the same file serves the 4:5 card and the 4:3 one it opens into; anything
 * else is used as it is. */
function thumbSrc(raw: string): string {
  if (!raw) return PLACEHOLDER_IMG;
  return /^(https?:|data:|\/)/.test(raw) || isVideoUrl(raw)
    ? resolveImage(raw)
    : wixImageFit(raw, 1000, 1000);
}

/**
 * "Featured work" — a horizontal gallery of the shared work.items portfolio
 * (the same list that powers /our-works, so CMS edits propagate). The row is
 * one you push sideways: swipe on touch, drag with the mouse, scroll
 * horizontally with a trackpad, or step with the arrows under it, snapping case
 * to case. Vertical scroll is left alone — the page runs straight past the
 * section. The row hugs the body column's left edge (see .fw-scroll) and runs
 * on to the screen's right edge. A closing card carries the CTA to the Our
 * Works page.
 *
 * Each card carries its case's initial as a big outlined glyph over its
 * corner (the uploaded letterform where there is one, the display face
 * otherwise), in place of an index number.
 *
 * On desktop the snapped case opens out from 4:5 to 4:3 at the same height,
 * the others staying 4:5. The snapping there is done here rather than by CSS:
 * the snap targets move as the cards change width, so once a scroll or drag
 * comes to rest the row glides the chosen case onto the body's edge on a plain
 * ease (no spring), in step with the widths. Phones and tablets keep CSS
 * snapping and every card at 4:5.
 *
 * Cases show their thumbnail (work.items.*.img). A case with a video
 * (work.items.*.video) plays it — muted, once through — after it has been the
 * snapped one for a second, fading it in over the thumbnail; the rest stay
 * thumbnails until they are snapped in turn (see CaseVideo). When the video
 * ends the row moves on to the next case, from the last back to the first.
 * Nothing plays off screen, in edit mode, or with motion off.
 *
 * Under the row, to the left, arrows step case to case beside a gold progress
 * line tracking how far along the cases you are.
 *
 * The section fills the visible screen (.mc-screen, as the manifesto above it
 * does), with the heading and the row stacked close as one block, centred in
 * it. It is the manifesto's second snap stop (see MulticulturalReveal). A
 * chevron at its foot glides on to the next section — shown only where the
 * block leaves room for it under the row, so it never lands on a card.
 *
 * Edit mode shares the same row (every card 4:5, CSS snapping); all edit
 * affordances live there, including a chip on each card for its video.
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
  const motionOff = useMotionOff();
  const t = useT();
  // Only the section heading is translated; work titles are brand names.
  const tv = useEditableT();
  const count = items.length;

  // Desktop opens the snapped case to 4:3 and snaps by hand (see above).
  const desktop = useMinWidth(1001);
  const handSnap = desktop && !editMode;

  const scrollRowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLDivElement>(null);
  const [chevronFits, setChevronFits] = useState(false);

  // The snapped case. Kept in a ref as well for the scroll handlers.
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const choose = (i: number) => {
    activeRef.current = i;
    setActive(i);
  };
  // Steps the row to case i — set by the snapping effect below, which knows
  // whether this is the desktop glide or a plain smooth scroll.
  const goRef = useRef<(i: number) => void>(() => {});

  // Whether the section is on screen: videos only play while it is.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver((entries) => setInView(entries.some((e) => e.isIntersecting)));
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // Whether the chevron has room under the block: its top has to clear the
  // block's foot. Re-measured whenever the section or the block changes size.
  useEffect(() => {
    if (editMode) return;
    const section = sectionRef.current;
    const block = blockRef.current;
    const chevron = chevronRef.current;
    if (!section || !block || !chevron) return;
    const measure = () => {
      const gap =
        chevron.getBoundingClientRect().top - block.getBoundingClientRect().bottom;
      setChevronFits(gap >= 8);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    ro.observe(block);
    measure();
    return () => ro.disconnect();
  }, [editMode, items.length]);

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

  // Snapping, and which case is the snapped one.
  useEffect(() => {
    const scroller = scrollRowRef.current;
    const track = trackRef.current;
    if (!scroller || !track || count === 0) return;
    const reduce =
      motionOff || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const card = (i: number) => track.children[i] as HTMLElement | undefined;
    // The scroll position that puts case i on the row's left edge (the track
    // starts at the scroller's own left edge, and is the cards' offsetParent).
    const leftOf = (i: number) =>
      Math.min(card(i)?.offsetLeft ?? 0, scroller.scrollWidth - scroller.clientWidth);
    const nearest = (x: number) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < count; i++) {
        const d = Math.abs(leftOf(i) - x);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };
    if (activeRef.current > count - 1) choose(count - 1);

    // Phones, tablets and edit mode: CSS snaps the row; the snapped case is
    // whichever sits nearest the row's left edge.
    if (!handSnap) {
      let raf = 0;
      const pick = () => {
        raf = 0;
        const i = nearest(scroller.scrollLeft);
        if (i !== activeRef.current) choose(i);
      };
      const onScroll = () => {
        if (!raf) raf = requestAnimationFrame(pick);
      };
      goRef.current = (i) => {
        const to = Math.max(0, Math.min(count - 1, i));
        scroller.scrollTo({ left: leftOf(to), behavior: reduce ? "auto" : "smooth" });
      };
      pick();
      scroller.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        if (raf) cancelAnimationFrame(raf);
        scroller.removeEventListener("scroll", onScroll);
        goRef.current = () => {};
      };
    }

    // Desktop: once a scroll or drag comes to rest, glide the chosen case onto
    // the left edge — a plain ease-in-out over GLIDE_MS, the same as the width
    // change. It heads straight for where the case will stand once the widths
    // have settled (every case before it back at 4:5), rather than chasing its
    // moving position, so it never runs past the mark and back.
    const settledLeftOf = (i: number) => {
      const frame = card(i)?.querySelector<HTMLElement>(".fw-frame");
      // The frame's height is fixed off the 4:5 width (see .fw-frame).
      const w = (frame?.getBoundingClientRect().height ?? 0) / 1.25;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return w > 0 ? i * (w + gap) : leftOf(i);
    };
    let gliding = false;
    let down = false;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rest = scroller.scrollLeft; // where the last glide left the row

    const glide = (i: number) => {
      const to = Math.max(0, Math.min(count - 1, i));
      if (to !== activeRef.current) choose(to);
      cancelAnimationFrame(raf);
      gliding = true;
      const from = scroller.scrollLeft;
      const target = Math.min(settledLeftOf(to), scroller.scrollWidth - scroller.clientWidth);
      const start = performance.now();
      const step = (now: number) => {
        const p = reduce ? 1 : Math.min(1, (now - start) / GLIDE_MS);
        if (p < 1) scroller.scrollLeft = from + (target - from) * easeInOut(p);
        // At the end, and for a few frames' grace past it, the case is held on
        // its actual mark: the width change starts a frame after the glide
        // (once React has committed), so it finishes a touch later.
        else scroller.scrollLeft = leftOf(to);
        if (now - start < GLIDE_MS + 120) {
          raf = requestAnimationFrame(step);
        } else {
          gliding = false;
          rest = scroller.scrollLeft;
        }
      };
      raf = requestAnimationFrame(step);
    };
    goRef.current = glide;

    const settle = () => {
      if (down || gliding) return;
      const x = scroller.scrollLeft;
      const delta = x - rest;
      if (Math.abs(delta) < 2) return;
      let i = nearest(x);
      // A short push still moves on a case, rather than falling back.
      if (i === activeRef.current && Math.abs(delta) > 24) i += Math.sign(delta);
      glide(i);
    };
    const later = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(settle, ms);
    };
    const onScroll = () => {
      if (!gliding) later(150);
    };
    const onDown = () => {
      down = true;
      cancelAnimationFrame(raf);
      gliding = false;
      clearTimeout(timer);
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      later(60);
    };
    // Keep the snapped case on its mark through a resize.
    const ro = new ResizeObserver(() => {
      if (gliding || down) return;
      scroller.scrollLeft = leftOf(activeRef.current);
      rest = scroller.scrollLeft;
    });

    scroller.scrollLeft = leftOf(activeRef.current);
    rest = scroller.scrollLeft;
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    ro.observe(scroller);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      ro.disconnect();
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      goRef.current = () => {};
    };
  }, [handSnap, count, motionOff]);

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
    const initial = (w.title.trim()[0] ?? "").toUpperCase();
    const isActive = i === active;
    const inner = (
      <div className="relative">
        {/* The case's initial, a giant outlined glyph overlapping the card */}
        {initial && (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-9 left-2 z-10 font-display text-[5.5rem] leading-none text-stroke-white opacity-60 sm:-top-12 sm:text-[7rem]"
          >
            <GlyphNumber value={initial} tintClassName="bg-white" />
          </span>
        )}
        {editMode && (
          <>
            <ListControls
              listPath="work.items"
              index={i}
              count={items.length}
              label="work item"
              className="right-2 top-2"
            />
            <VideoChip index={i} video={w.video ?? ""} />
          </>
        )}
        <div className="fw-frame group relative w-full overflow-hidden bg-navy-soft">
          <EditableImage
            path={`work.items.${i}.img`}
            raw={w.img}
            src={thumbSrc(w.img)}
            style={{ objectPosition: focusPosition(w.img) }}
            alt={w.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <CaseVideo
            video={w.video}
            playing={isActive && inView && !editMode && !motionOff}
            // Played through: on to the next case, from the last back to the
            // first.
            onEnded={() => goRef.current((i + 1) % count)}
          />
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
    const cls = `fw-card ${offset} snap-start`;
    return w.slug && !editMode ? (
      <Link
        key={i}
        href={`/case-study/${w.slug}`}
        aria-label={w.title}
        data-active={isActive || undefined}
        className={cls}
      >
        {inner}
      </Link>
    ) : (
      <div key={i} data-active={isActive || undefined} className={cls}>
        {inner}
      </div>
    );
  });

  const endCard = (
    <div className="fw-end flex snap-start items-center">
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
    // One screen, the block centred in it: reaching the section puts the whole
    // of it — header, cards, progress line — on view, with nothing of the row
    // left below the fold. A minimum (not a fixed height) so a short or narrow
    // screen grows the section rather than clipping it. On a phone the bottom
    // padding is the larger by the floating menu bar's height, so the block
    // centres in the part of the screen that is not under the bar. Edit mode
    // grows freely instead.
    <section
      ref={sectionRef}
      className={`relative w-full overflow-hidden bg-navy ${
        editMode ? "py-20 sm:py-28" : "mc-screen flex flex-col justify-center pb-24 pt-8 sm:py-12"
      }`}
    >
      <div ref={blockRef}>
        <Container>
          <RevealOnScroll>{header}</RevealOnScroll>
        </Container>
        {/* Close under the header, so the two read as one block; the top
            padding is the room the giant glyphs stand up into. */}
        <div
          ref={scrollRowRef}
          data-accordion={editMode ? undefined : ""}
          className={`fw-scroll gallery-scroll cursor-grab snap-x snap-mandatory overflow-x-auto pt-12 active:cursor-grabbing ${
            editMode ? "mt-16 pb-6" : "mt-2 pb-4 sm:mt-3"
          }`}
        >
          <div ref={trackRef} className="fw-track relative flex w-max items-start">
            {cards}
            {endCard}
          </div>
        </div>
        {/* Under the row, to the left: the arrows, then the progress line. */}
        <Container className="mt-6">
          <div className="flex items-center gap-5">
            {!editMode && count > 1 && (
              <div className="flex shrink-0 gap-2">
                <StepButton
                  dir={-1}
                  label={t("Previous case")}
                  disabled={active <= 0}
                  onClick={() => goRef.current(activeRef.current - 1)}
                />
                <StepButton
                  dir={1}
                  label={t("Next case")}
                  disabled={active >= count - 1}
                  onClick={() => goRef.current(activeRef.current + 1)}
                />
              </div>
            )}
            <div className="h-px min-w-0 flex-1 bg-white/10">
              <div ref={barRef} className="h-full origin-left scale-x-[0.03] bg-gold" />
            </div>
          </div>
        </Container>
        {editMode && (
          <Container className="mt-6">
            <AddChip listPath="work.items" label="work item" />
          </Container>
        )}
      </div>

      {/* A way on, when there is room for it under the row (see above). Kept
          in the layout either way so it can be measured. */}
      {!editMode && (
        <NextChevron
          ref={chevronRef}
          sectionRef={sectionRef}
          className={`bottom-[4.5rem] sm:bottom-4 ${chevronFits ? "" : "invisible"}`}
        />
      )}
    </section>
  );
}

/** One of the arrows under the row. */
function StepButton({
  dir,
  label,
  disabled,
  onClick,
}: {
  dir: -1 | 1;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center border border-white/15 text-white/70 transition-colors duration-300 hover:border-gold/60 hover:text-gold focus-visible:border-gold/60 focus-visible:text-gold disabled:pointer-events-none disabled:opacity-30"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-5 w-5"
      >
        <path d={dir < 0 ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
      </svg>
    </button>
  );
}
