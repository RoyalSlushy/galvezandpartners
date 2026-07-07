"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

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
}: {
  slides: ReactNode[];
  className?: string;
  ariaLabel?: string;
}) {
  const n = slides.length;
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);

  // Hover-driven ambient state.
  const [hovering, setHovering] = useState(false); // spotlight follows the cursor while true
  const [handlesVisible, setHandlesVisible] = useState(false); // arrow opacity
  const [paused, setPaused] = useState(false); // auto-scroll paused
  const [reducedMotion, setReducedMotion] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const handleTimer = useRef<ReturnType<typeof setTimeout>>();
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();

  const go = useCallback(
    (target: number, d?: number) => {
      const t = ((target % n) + n) % n;
      setDir(d ?? (target > current ? 1 : -1));
      setCurrent(t);
    },
    [current, n]
  );
  const next = useCallback(() => go(current + 1, 1), [go, current]);
  const prev = useCallback(() => go(current - 1, -1), [go, current]);

  // Auto-advance is decoupled from `current` so the interval can stay stable.
  const advance = useCallback(() => {
    setDir(1);
    setCurrent((c) => (c + 1) % n);
  }, [n]);

  // Track the reduced-motion preference so we can skip the auto-scroll.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
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
    // Position the ambient spotlight relative to the carousel container (the
    // positioned parent the gradient layer fills).
    const root = rootRef.current;
    const card = root?.parentElement;
    if (root && card) {
      const rect = card.getBoundingClientRect();
      root.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
      root.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
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
      if (dx < 0) next();
      else prev();
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
      {/* Ambient spotlight — fills the carousel container and tracks the cursor,
          sitting behind the cards, handles and dots. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
        style={{
          opacity: hovering ? 1 : 0,
          background:
            "radial-gradient(circle 520px at var(--spot-x, 50%) var(--spot-y, 50%), rgba(224,169,79,0.16) 0%, rgba(224,169,79,0.08) 42%, transparent 82%)",
        }}
      />

      <div className="relative z-[1] grid">
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
                transform: `translateX(${isActive ? 0 : offset}px)`,
                pointerEvents: isActive ? "auto" : "none",
                zIndex: isActive ? 2 : 0,
              }}
            >
              {slide}
            </div>
          );
        })}
      </div>

      {/* Arrows — hidden until hovered, fading out 2s after the cursor leaves. */}
      <button
        type="button"
        aria-label="Previous"
        onClick={prev}
        style={{ opacity: handlesVisible ? 1 : 0, pointerEvents: handlesVisible ? "auto" : "none" }}
        className="absolute left-1 top-1/2 z-10 flex h-20 w-12 -translate-y-1/2 items-center justify-center text-4xl text-white/70 transition duration-500 hover:text-sky-400"
      >
        &#8249;
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={next}
        style={{ opacity: handlesVisible ? 1 : 0, pointerEvents: handlesVisible ? "auto" : "none" }}
        className="absolute right-1 top-1/2 z-10 flex h-20 w-12 -translate-y-1/2 items-center justify-center text-4xl text-white/70 transition duration-500 hover:text-sky-400"
      >
        &#8250;
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-6 z-10 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show slide ${i + 1}`}
            aria-current={i === current}
            onClick={() => go(i)}
            className={`h-2 w-2 rounded-full transition ${
              i === current ? "scale-125 bg-gold-bright" : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
