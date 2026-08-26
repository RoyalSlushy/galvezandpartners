"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

/** Why the active slide last changed — lets a slide distinguish "the carousel
 * auto-advanced to me" / "an arrow or dot was clicked" from "the user swiped to
 * me", since some slides (e.g. the hero's video backdrops) only auto-play on a
 * swipe and stay paused-at-start otherwise. */
export type CarouselCause = "auto" | "swipe" | "manual";

export const CarouselContext = createContext<{ current: number; cause: CarouselCause }>({
  current: 0,
  cause: "manual",
});

/** Convenience hook for a slide to read whether it is the active one and why
 * the carousel landed on it. */
export function useCarouselSlide(index: number) {
  const { current, cause } = useContext(CarouselContext);
  return { isActive: current === index, cause };
}

/**
 * One-card-at-a-time carousel with crossfade + slide, wrap-around, prev/next
 * arrows, dots, keyboard arrows, and pointer/touch swipe (48px threshold with a
 * horizontal-vs-vertical decision). Ported from the original Enhancements.tsx
 * `initCarousel`, minus the Wix-DOM plumbing.
 *
 * Slides are stacked in one CSS grid cell so the track keeps the tallest slide's
 * height instead of collapsing.
 *
 * Ambient behaviour layered on top:
 *  - the arrows stay hidden until the cursor is over the carousel, then fade back
 *    out 2s after it leaves;
 *  - the cards auto-advance every 4s, pausing while hovered and resuming 8s after
 *    the cursor leaves;
 *  - a soft radial gradient follows the cursor behind the cards/handles.
 */
const AUTO_ADVANCE_MS = 4000; // auto-scroll to the next card this often
const RESUME_DELAY_MS = 8000; // resume auto-scroll this long after the cursor leaves
const HANDLE_FADE_MS = 2000; // fade the arrows out this long after the cursor leaves

export default function Carousel({
  slides,
  className = "",
  ariaLabel = "Card carousel",
  chrome = true,
}: {
  slides: ReactNode[];
  className?: string;
  ariaLabel?: string;
  /** Whether to draw the prev/next handles and the dot indicators. With them
   * off the carousel is bare cards — it still auto-advances, swipes and takes
   * keyboard arrows, so no way of moving through it is lost. */
  chrome?: boolean;
}) {
  const n = slides.length;
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);
  const [cause, setCause] = useState<CarouselCause>("manual");

  // Hover-driven ambient state.
  const [hovering, setHovering] = useState(false); // spotlight follows the cursor while true
  const [handlesVisible, setHandlesVisible] = useState(false); // arrow opacity
  const [paused, setPaused] = useState(false); // auto-scroll paused
  const [reducedMotion, setReducedMotion] = useState(false);
  const [noHover, setNoHover] = useState(false); // touch-only device: arrows always shown

  const rootRef = useRef<HTMLDivElement>(null);
  const handleTimer = useRef<ReturnType<typeof setTimeout>>();
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Spotlight follows the cursor loosely: the pointer sets a target and a rAF
  // loop eases the rendered position toward it.
  const spotTarget = useRef<{ x: number; y: number } | null>(null);
  const spotCurrent = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef<number>();

  const go = useCallback(
    (target: number, d?: number, c: CarouselCause = "manual") => {
      const t = ((target % n) + n) % n;
      setDir(d ?? (target > current ? 1 : -1));
      setCurrent(t);
      setCause(c);
    },
    [current, n]
  );
  const next = useCallback((c?: CarouselCause) => go(current + 1, 1, c), [go, current]);
  const prev = useCallback((c?: CarouselCause) => go(current - 1, -1, c), [go, current]);

  // Auto-advance is decoupled from `current` so the interval can stay stable.
  const advance = useCallback(() => {
    setDir(1);
    setCurrent((c) => (c + 1) % n);
    setCause("auto");
  }, [n]);

  // Track the reduced-motion preference so we can skip the auto-scroll.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // On devices without hover (phones/tablets) the fade-in-on-hover arrows would
  // never appear, so keep them permanently visible there.
  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    setNoHover(mq.matches);
    const onChange = () => setNoHover(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Auto-scroll loop — restarts whenever it is (un)paused.
  useEffect(() => {
    if (paused || reducedMotion || n <= 1) return;
    const id = setInterval(advance, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [paused, reducedMotion, advance, n]);

  // Clear pending timers on unmount.
  useEffect(
    () => () => {
      clearTimeout(handleTimer.current);
      clearTimeout(resumeTimer.current);
    },
    []
  );

  // Ease the spotlight toward the cursor while hovered (loose follow).
  useEffect(() => {
    if (!hovering) return;
    const tick = () => {
      const root = rootRef.current;
      const t = spotTarget.current;
      const c = spotCurrent.current;
      if (root && t && c) {
        c.x += (t.x - c.x) * 0.12;
        c.y += (t.y - c.y) * 0.12;
        root.style.setProperty("--spot-x", `${c.x}px`);
        root.style.setProperty("--spot-y", `${c.y}px`);
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [hovering]);

  const onEnter = () => {
    clearTimeout(handleTimer.current);
    clearTimeout(resumeTimer.current);
    setHovering(true);
    setHandlesVisible(true);
    setPaused(true);
  };
  const onLeave = () => {
    setHovering(false);
    handleTimer.current = setTimeout(() => setHandlesVisible(false), HANDLE_FADE_MS);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_DELAY_MS);
  };

  // --- swipe / drag ---
  const start = useRef<{ x: number; y: number } | null>(null);
  const decided = useRef(false);
  const horiz = useRef(false);

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    start.current = { x: e.clientX, y: e.clientY };
    decided.current = false;
    horiz.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    // Aim the ambient spotlight at the cursor (relative to the carousel
    // container the gradient layer fills); the rAF loop eases toward it.
    const root = rootRef.current;
    const card = root?.parentElement;
    if (root && card) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotTarget.current = { x, y };
      if (!spotCurrent.current) {
        spotCurrent.current = { x, y };
        root.style.setProperty("--spot-x", `${x}px`);
        root.style.setProperty("--spot-y", `${y}px`);
      }
    }

    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (!decided.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      decided.current = true;
      horiz.current = Math.abs(dx) > Math.abs(dy);
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    if (horiz.current && Math.abs(dx) > 48) {
      if (dx < 0) next("swipe");
      else prev("swipe");
    }
    start.current = null;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  return (
    <div
      ref={rootRef}
      data-x-swipe
      className={`select-none ${className}`}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{ touchAction: "pan-y" }}
    >
      <CarouselContext.Provider value={{ current, cause }}>
        {/* Ambient spotlight — fills the carousel container and tracks the cursor,
            sitting behind the cards, handles and dots. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
          style={{
            opacity: hovering ? 1 : 0,
            background:
              "radial-gradient(circle 520px at var(--spot-x, 50%) var(--spot-y, 50%), rgba(186,230,253,0.1) 0%, rgba(186,230,253,0.045) 42%, transparent 82%)",
          }}
        />

        <div className="relative z-[1] grid min-h-0 flex-1 grid-rows-1">
          {slides.map((slide, i) => {
            const isActive = i === current;
            const offset = isActive ? 0 : i < current ? -dir * 24 : dir * 24;
            return (
              <div
                key={i}
                aria-hidden={!isActive}
                className="col-start-1 row-start-1 transition-[opacity,transform] duration-[450ms] ease-out"
                style={{
                  opacity: isActive ? 1 : 0,
                  // The resting slide is left without a transform or a z-index
                  // (both would make it a stacking context, trapping any blend
                  // inside a slide short of the surface the carousel sits on —
                  // see the hero's service previews). The slides it covers are
                  // fully transparent, so paint order between them is moot.
                  transform: isActive ? undefined : `translateX(${offset}px)`,
                  pointerEvents: isActive ? "auto" : "none",
                  zIndex: isActive ? undefined : 0,
                }}
              >
                {slide}
              </div>
            );
          })}
        </div>

        {/* Arrows — hidden until hovered, fading out 2s after the cursor leaves.
            Always shown on touch-only devices. */}
        {chrome && (
        <>
        <button
          type="button"
          aria-label="Previous"
          onClick={() => prev()}
          style={{
            opacity: handlesVisible || noHover ? 1 : 0,
            pointerEvents: handlesVisible || noHover ? "auto" : "none",
          }}
          className="absolute inset-y-0 left-1 z-10 flex w-12 items-center justify-center text-4xl text-white/70 transition duration-500 hover:text-sky-400"
        >
          &#8249;
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => next()}
          style={{
            opacity: handlesVisible || noHover ? 1 : 0,
            pointerEvents: handlesVisible || noHover ? "auto" : "none",
          }}
          className="absolute inset-y-0 right-1 z-10 flex w-12 items-center justify-center text-4xl text-white/70 transition duration-500 hover:text-sky-400"
        >
          &#8250;
        </button>

        {/* Dots — first dot's left edge flush with the slide heading (matching the
            slide's px-8 / sm:px-12 padding). */}
        <div className="absolute bottom-3 left-8 z-10 flex gap-2 sm:left-12">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === current}
              onClick={() => go(i)}
              className={`h-2 w-2 transition ${
                i === current ? "scale-125 bg-gold-bright" : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
        </>
        )}
      </CarouselContext.Provider>
    </div>
  );
}
