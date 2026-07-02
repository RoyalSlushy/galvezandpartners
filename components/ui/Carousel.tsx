"use client";

import {
  useCallback,
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
 */
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
      className={`relative select-none ${className}`}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
      style={{ touchAction: "pan-y" }}
    >
      <div className="grid">
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

      {/* Arrows */}
      <button
        type="button"
        aria-label="Previous"
        onClick={prev}
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 text-3xl text-white/70 transition hover:text-gold"
      >
        &#8249;
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={next}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-3xl text-white/70 transition hover:text-gold"
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
