"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { useMinWidth } from "@/components/ui/useMinWidth";
import { GlyphNumber } from "@/components/ui/Glyph";
import type { Work } from "@/content/work";
import { focusPosition, wixImageFit } from "@/lib/wix";
import { PLACEHOLDER_IMG, isVideoUrl, resolveImage } from "@/lib/adminClient";
import { useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import { useMotionOff } from "@/components/motion/MotionProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls from "@/components/admin/editable/ListControls";
import { CaseVideo, VideoChip } from "@/components/sections/work/CaseVideo";

/** How long the row takes to glide from one case to the next (ms) — the same
 * duration and curve as the cards' width change (.fw-card in globals.css), so
 * the two move as one. A plain ease, no spring. */
const GLIDE_MS = 600;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Room above the cards for the giant glyphs standing up into it (pt-12). */
const GLYPH_ROOM = 48;
/** How far every other card is stepped down at sm+ (sm:mt-10). */
const STAGGER = 40;
/** The description slot under each card when `describe` is on: mt-3 plus two
 * text-sm lines. */
const DESC_SLOT = 52;

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
 * The cases as a row you push sideways — the homepage's featured work and the
 * Our Works page share it, so the two behave as one. Swipe on touch, drag with
 * the mouse, scroll sideways with a trackpad, or step with the arrows under it,
 * snapping case to case. Vertical scroll is left alone. The row hugs the body
 * column's left edge (see .fw-scroll) and runs on to the screen's right edge,
 * with the caller's closing card (`endCard`, a .fw-end box) after the cases.
 *
 * Each card carries its case's initial as a big outlined glyph over its corner
 * (the uploaded letterform where there is one, the display face otherwise).
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
 * `fit` sizes the cards to the room the row is given instead of to the screen:
 * the caller lays the carousel out as a flex child, and the cards take
 * whatever height is left to them (capped by the usual widths), so the whole
 * of it — glyphs, cards, description, arrows — lands inside that room.
 * `describe` adds the snapped case's description under it; the others' slots
 * stay empty, so only the case that is playing is described. Edit mode shows
 * every description, so each can be edited, and every card at 4:5.
 *
 * `stagger` steps every other card down at sm+ (the homepage's rhythm). Turned
 * off, the cards stand level — and under `fit` the height the step took goes
 * to the cards instead, so each case is that much larger.
 */
export default function CaseCarousel({
  items,
  endCard,
  fit = false,
  describe = false,
  stagger = true,
  rowClassName = "",
  controlsClassName = "mt-6",
  className = "",
}: {
  items: Work[];
  /** The card after the cases, sized by .fw-end. */
  endCard: ReactNode;
  fit?: boolean;
  describe?: boolean;
  /** Step every other card down at sm+ (on by default). */
  stagger?: boolean;
  /** Spacing around the scrolling row. */
  rowClassName?: string;
  /** Spacing around the arrows and progress line. */
  controlsClassName?: string;
  className?: string;
}) {
  const editMode = useEditMode();
  const motionOff = useMotionOff();
  const t = useT();
  const count = items.length;
  const fitting = fit && !editMode;

  // Desktop opens the snapped case to 4:3 and snaps by hand (see above).
  const desktop = useMinWidth(1001);
  const handSnap = desktop && !editMode;

  const scrollRowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

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

  // Whether the row is on screen: videos only play while it is.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const row = scrollRowRef.current;
    if (!row) return;
    const io = new IntersectionObserver((entries) => setInView(entries.some((e) => e.isIntersecting)));
    io.observe(row);
    return () => io.disconnect();
  }, []);

  // `fit`: the card width that lets a card — its glyph room, the stagger, the
  // description slot — stand inside the row's height, re-measured whenever
  // the row changes size. The usual widths still cap it (see .fw-track).
  const [fitW, setFitW] = useState<number | null>(null);
  useEffect(() => {
    const row = scrollRowRef.current;
    if (!fitting || !row) {
      setFitW(null);
      return;
    }
    const measure = () => {
      const cs = getComputedStyle(row);
      const inner = row.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const step = stagger && window.matchMedia("(min-width: 751px)").matches ? STAGGER : 0;
      const frame = inner - step - (describe ? DESC_SLOT : 0);
      setFitW(frame > 0 ? Math.floor(frame / 1.25) : null);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    measure();
    return () => ro.disconnect();
  }, [fitting, describe, stagger]);

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
    ro.observe(track);
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
  }, [count, editMode]);

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
              count={count}
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
        {/* The description, in a slot of its own under the card: shown for the
            snapped case only (the one playing), every slot kept so the cards
            stay level. Edit mode shows them all, to be edited. `w-0
            min-w-full` keeps the copy from setting the card's width. */}
        {describe && (
          <EditableText
            path={`work.items.${i}.description`}
            value={w.description}
            as="p"
            multiline
            className={`mt-3 line-clamp-2 whitespace-pre-line font-body text-sm leading-[1.25rem] text-white/70${
              editMode
                ? ""
                : ` h-[2.5rem] w-0 min-w-full overflow-hidden transition-opacity duration-500 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`
            }`}
          />
        )}
      </div>
    );
    const offset = stagger && i % 2 === 1 ? "sm:mt-10" : "";
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

  return (
    <div className={`${fitting ? "flex min-h-0 flex-1 flex-col" : ""} ${className}`}>
      {/* The top padding is the room the giant glyphs stand up into. */}
      <div
        ref={scrollRowRef}
        data-accordion={editMode ? undefined : ""}
        className={`fw-scroll gallery-scroll cursor-grab snap-x snap-mandatory overflow-x-auto pt-12 active:cursor-grabbing ${
          fitting ? "min-h-0 flex-1" : ""
        } ${rowClassName}`}
      >
        <div
          ref={trackRef}
          className="fw-track relative flex w-max items-start"
          style={
            fitting && fitW
              ? ({
                  "--fw-w": `min(var(--fw-cap-w), ${fitW}px)`,
                  "--fw-end": "var(--fw-w)",
                } as React.CSSProperties)
              : undefined
          }
        >
          {cards}
          {endCard}
        </div>
      </div>
      {/* Under the row, to the left: the arrows, then the progress line. */}
      <Container className={controlsClassName}>
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
    </div>
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
