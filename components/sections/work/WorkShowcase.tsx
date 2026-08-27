"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import useFitText from "@/components/ui/useFitText";
import { useMinWidth } from "@/components/ui/useMinWidth";
import GutterRail from "@/components/ui/GutterRail";
import CtaGrid from "@/components/sections/home/CtaGrid";
import { GlyphNumber } from "@/components/ui/Glyph";
import type { Work } from "@/content/work";
import { focusPosition } from "@/lib/wix";
import { PLACEHOLDER_IMG, resolveImage } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { useRevealPhase } from "@/components/motion/useRevealPhase";

// Card width doubly capped by viewport height (cards are 4:5) so heading +
// track + progress line always fit inside one viewport.
// CARD_W/END_CARD_W are the edit-mode sizes (width-driven at every breakpoint);
// visitors get CARD_FIT/END_CARD_FIT, where the phone card instead derives its
// width from the row height (still 4:5) so header + heading + card + blurb all
// fit inside one viewport.
const CARD_W = "w-[72vw] max-w-[420px] shrink-0 sm:w-[min(34vw,38vh)] md:w-[min(27vw,38vh)]";
const END_CARD_W = "w-[72vw] max-w-[420px] shrink-0 sm:w-[min(30vw,34vh)] md:w-[min(24vw,34vh)]";
const CARD_FIT =
  "h-full w-auto shrink-0 sm:h-auto sm:w-[min(34vw,38vh)] sm:max-w-[420px] md:w-[min(27vw,38vh)]";
const END_CARD_FIT =
  "h-full w-auto shrink-0 sm:h-auto sm:w-[min(30vw,34vh)] sm:max-w-[420px] md:w-[min(24vw,34vh)]";

/**
 * /our-works hero: the cases as a horizontal strip you push sideways — swipe on
 * touch, drag with the mouse, or scroll horizontally with a trackpad — snapping
 * card to card. Vertical scroll is left alone: the page runs straight past the
 * cases into the gallery wall below, with no pinning and no scroll-jacking.
 * A gold progress line under the row tracks how far along the strip you are and
 * hands off to the gallery band below (see WorkGallery); a masonry-grid icon
 * rail on the left jumps to that #work-gallery section directly.
 *
 * The heading is centered and fit to a single line at any width, with the word
 * "speaks" accented in gold under a pulsing halo.
 *
 * Phones get the whole section in one viewport (heading, card row, shared
 * blurb); sm+ lays the row out width-driven with each case's blurb under its
 * own card. Edit mode keeps every affordance in that same row.
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
  const phase = useRevealPhase();
  // Case-study titles are brand names and stay untranslated.
  const tv = useEditableT();

  const descTexts = [
    ...items.map((w) => tv(w.description ?? "")),
    tv("Every frame on one wall — sort it, filter it, tag it."),
  ];
  const descTextsRef = useRef<string[]>(descTexts);
  descTextsRef.current = descTexts;

  // The phone treatment (one-viewport column + shared blurb) only applies below
  // the `sm` breakpoint; sm+ keeps per-card blurbs in a width-driven row.
  const wideEnough = useMinWidth(751);
  // Nothing here changes the server markup, but the phone blurb only starts
  // tracking once the width query has actually been evaluated on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Mouse users can grab the row and drag it sideways (touch already scrolls
  // natively). Scroll snap is parked during the drag so the row follows the
  // cursor instead of fighting the detents, and a real drag swallows the
  // release click so the card under the cursor doesn't open.
  const scrollRowRef = useRef<HTMLDivElement>(null);
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
  }, [mounted, editMode]);

  // Progress line: how far the strip has travelled, so the horizontal journey
  // still reads at a glance — and still hands the gold line down to the
  // gallery band below (see WorkGallery).
  const barRef = useRef<HTMLDivElement>(null);
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

  // Phone: the cards carry no blurb — a single shared blurb under the row swaps
  // to whichever card sits on the snap anchor, fading between texts.
  const mobileDescRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!mounted || editMode || wideEnough) return;
    const scroller = scrollRowRef.current;
    const desc = mobileDescRef.current;
    const track = (scroller?.firstElementChild as HTMLElement | null) ?? null;
    if (!scroller || !desc || !track) return;
    let last = 0;
    let raf = 0;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const pick = () => {
      raf = 0;
      const kids = Array.from(track.children) as HTMLElement[];
      if (!kids.length) return;
      // Snap anchor = the scroller's left edge inset by the row's gutter
      // (.gallery-scroll mirrors the same inset as scroll-padding-left).
      const anchor =
        scroller.getBoundingClientRect().left +
        (parseFloat(getComputedStyle(track).paddingLeft) || 0);
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < kids.length; i++) {
        const d = Math.abs(kids[i].getBoundingClientRect().left - anchor);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best === last) return;
      last = best;
      desc.style.opacity = "0";
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => {
        desc.textContent = descTextsRef.current[last] ?? "";
        desc.style.opacity = "1";
      }, 160);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      desc.style.opacity = "";
    };
  }, [mounted, editMode, wideEnough]);

  const cards = items.map((w, i) => {
    const inner = (
      <div className={editMode ? "relative" : "relative h-full sm:h-auto"}>
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
        <div
          className={`group relative overflow-hidden bg-navy-soft${
            editMode ? "" : " aspect-[4/5] h-full max-w-[85vw] sm:h-auto sm:max-w-none"
          }`}
        >
          <div
            data-parallax
            className={`will-change-transform${editMode ? "" : " h-full"}`}
            style={{ transform: "scale(1.12)" }}
          >
            <EditableImage
              path={`work.items.${i}.img`}
              raw={w.img}
              src={w.img ? resolveImage(w.img, 700, 875) : PLACEHOLDER_IMG}
              // The CMS focal point keeps the important part of the frame in
              // view under the crop (defaults to centre when unset).
              style={{ objectPosition: focusPosition(w.img) }}
              alt={w.title}
              className={editMode ? "aspect-[4/5] w-full object-cover" : "h-full w-full object-cover"}
            />
          </div>
          <div
            className={`absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/15 to-transparent transition-opacity duration-500${
              editMode ? " pointer-events-none" : ""
            }`}
          />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="flex items-end justify-between gap-3">
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
        {/* Description sits under the card (out of the image). Phones move it
            out of the row entirely — into the shared blurb under the track —
            so it hides here (edit mode keeps it in place so each case stays
            editable). */}
        <EditableText
          path={`work.items.${i}.description`}
          value={w.description}
          as="p"
          multiline
          className={`mt-3 line-clamp-2 whitespace-pre-line font-body text-sm text-white/70${
            editMode ? "" : " hidden sm:block"
          }`}
        />
      </div>
    );
    const rootW = editMode ? CARD_W : CARD_FIT;
    const offset = i % 2 === 1 ? "sm:mt-6" : "";
    return w.slug && !editMode ? (
      <Link
        key={i}
        href={`/case-study/${w.slug}`}
        aria-label={w.title}
        className={`${rootW} ${offset} snap-start`}
      >
        {inner}
      </Link>
    ) : (
      <div key={i} className={`${rootW} ${offset} snap-start`}>
        {inner}
      </div>
    );
  });

  // Closing card carries the hand-off to the gallery wall below.
  const endCard = (
    <a
      href="#work-gallery"
      className={`flex ${editMode ? END_CARD_W : END_CARD_FIT} snap-start items-center`}
    >
      <div
        className={`relative flex aspect-[4/5] flex-col items-start justify-center overflow-hidden border border-gold/25 bg-gradient-to-br from-navy-soft to-navy p-5 sm:p-7 ${
          editMode ? "w-full" : "h-full max-w-[85vw] sm:h-auto sm:w-full sm:max-w-none"
        }`}
      >
        <CtaGrid
          className="glyph-grid-fade-left"
          glyphClassName="bg-gold"
          fontClassName="text-gold"
          scale={1.25}
        />
        <p className="relative font-display text-f5 lowercase leading-[0.95] text-gold">{tv("the gallery")}</p>
        <p className="relative mt-2 font-body text-base text-white/60 sm:mt-3">
          {tv("Every frame on one wall — sort it, filter it, tag it.")}
        </p>
        <span className="btn-outline relative mt-5 sm:mt-7">{tv("explore")}</span>
      </div>
    </a>
  );

  // Visitors' phones get a one-viewport layout: the section fills the screen
  // under the site header as a column — heading, then the card row (which
  // flexes and sizes the 4:5 cards from its height), then the progress line and
  // the shared blurb — so header + heading + case + description all fit with no
  // vertical scroll. sm+ (and edit mode) keeps the width-driven row.
  return (
    <section
      data-gp-hero={phase ?? undefined}
      id="work-cases"
      className={`relative w-full overflow-hidden bg-navy ${
        editMode
          ? "py-16 sm:py-20"
          : "flex h-[calc(100svh-var(--header-h))] flex-col pb-4 pt-3 sm:block sm:h-auto sm:py-20"
      }`}
    >
      <GalleryRail label={tv("gallery")} />
      <Container>
        <div data-hero-rise>
          <ShowcaseHeading heading={heading} display={tv(heading)} editMode={editMode} />
        </div>
      </Container>
      <div
        ref={scrollRowRef}
        className={`gallery-scroll cursor-grab snap-x snap-mandatory overflow-x-auto active:cursor-grabbing ${
          editMode ? "mt-10 pb-6 pt-10" : "mt-2 min-h-0 flex-1 pb-2 pt-8 sm:mt-10 sm:flex-none sm:pb-6 sm:pt-10"
        }`}
      >
        <div
          className={`gallery-pad flex w-max items-start gap-6 sm:gap-8 ${
            editMode ? "" : "h-full sm:h-auto"
          }`}
        >
          {cards}
          {endCard}
        </div>
      </div>
      {!editMode && (
        <>
          {/* Progress line for the journey across the cases. It runs full width
              as the last of them lands, where the gallery section below picks it
              up and opens it into its own band (see WorkGallery). */}
          <Container className="mt-2 sm:mt-6">
            <div className="h-px w-full bg-white/10">
              <div ref={barRef} className="h-full origin-left scale-x-[0.03] bg-gold" />
            </div>
          </Container>
          {/* Left-aligned to the site gutter (matching the cards/heading) but its
              right edge stops short of the floating nav icon at the bottom-right
              (a w-12 / 3rem circle inset right-4 / 1rem — see MobileMenu), so the
              blurb never runs underneath it. Width ≈ 100vw − that icon column. */}
          <div className="mt-3 pl-5 pr-[4.75rem] sm:hidden">
            <p
              ref={mobileDescRef}
              className="line-clamp-3 h-[4.3rem] font-body text-sm leading-relaxed text-white/70 transition-opacity duration-300"
            >
              {descTexts[0]}
            </p>
          </div>
        </>
      )}
      {editMode && (
        <Container className="mt-6">
          <AddChip listPath="work.items" label="work item" />
        </Container>
      )}
    </section>
  );
}

/**
 * The showcase heading, in two responsive treatments (both skip wrapping and
 * binary-search-fit their type to the container width):
 *
 * - sm+: one centered line. The verb of the default heading is accented in
 *   gold with a pulsing halo — matched on the "speak"/"habla" stem so it lands
 *   on the right word in both the English source and its Spanish translation.
 * - Phones: three stepped lines split around that accent word — "our work"
 *   ranged left, "speaks" centered at 1.5× the size (keeping its halo), "for
 *   itself" ranged right — set on tightened leading. Headings without an
 *   accent word keep the single-line treatment everywhere.
 *
 * Edit mode falls back to the plain editable field (bound to the untranslated
 * source).
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
  // Separate fit for the phone treatment: singleLine only constrains width, so
  // with each line kept nowrap it sizes the block until the widest of the three
  // lines spans the container.
  const { ref: mobileRef } = useFitText<HTMLDivElement>({
    max: 110,
    min: 14,
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

  const halo = (word: string) => (
    <span className="halo-word">
      <span aria-hidden className="halo-ring" />
      <span aria-hidden className="halo-ring halo-ring-late" />
      <span className="relative">{word}</span>
    </span>
  );

  const words = display.split(/\s+/).filter(Boolean);
  const accentIdx = words.findIndex((w) => /speak|habla/i.test(w));

  let accented = false;
  const tokens = display.split(/(\s+)/).map((token, i) => {
    if (!accented && /speak|habla/i.test(token)) {
      accented = true;
      return <span key={i}>{halo(token)}</span>;
    }
    return token;
  });

  const singleLine = (
    // The fitted size lives on this box; the h1 inherits it (preflight sets
    // headings to font-size: inherit). overflow-visible lets the "speaks" glow
    // spill past the text box; the fit still measures scrollWidth (the absolute
    // halo rings are out of flow). text-f2 is only the pre-hydration fallback.
    <div
      ref={ref}
      className={`whitespace-nowrap py-[0.3em] text-center text-f2${
        accentIdx < 0 ? "" : " hidden sm:block"
      }`}
    >
      <h1 className="font-display lowercase leading-none text-white">{tokens}</h1>
    </div>
  );

  if (accentIdx < 0) return singleLine;

  const pre = words.slice(0, accentIdx).join(" ");
  const accent = words[accentIdx];
  const post = words.slice(accentIdx + 1).join(" ");

  return (
    <>
      <div ref={mobileRef} className="whitespace-nowrap py-[0.3em] text-f2 sm:hidden">
        <h1 className="font-display lowercase leading-[0.85] text-white">
          {pre && <span className="block text-left">{pre}</span>}
          <span className="block text-center text-[1.5em]">{halo(accent)}</span>
          {post && <span className="block text-right">{post}</span>}
        </h1>
      </div>
      {singleLine}
    </>
  );
}

/** The cases' rail down to the gallery wall (the wall carries the mirror of it
 * back up — see WorkGallery). */
function GalleryRail({ label }: { label: string }) {
  return (
    <GutterRail
      href="#work-gallery"
      title="Jump to the gallery"
      label={label}
      icon={<MasonryIcon className="h-5 w-5" />}
      className="absolute top-1/2 -translate-y-1/2"
    />
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
