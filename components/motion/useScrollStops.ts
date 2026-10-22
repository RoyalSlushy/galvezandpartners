"use client";

import { useEffect, useRef } from "react";
import { useMotionOff } from "./MotionProvider";

/** Where the stops are, read afresh each time a scroll comes to rest. */
export type ScrollStops = {
  /** Page scroll positions (window.scrollY) to stop at, ascending. */
  stops: number[];
  /** A gap between two stops that is left free — gap i runs from stops[i] to
   * stops[i + 1] — for a stretch to be read at its own pace rather than
   * flipped past. */
  freeGap?: number;
  /** A gap that snaps with a timed glide instead of the browser's smooth
   * scroll: `ms` is how long crossing the whole gap takes (a scroll that rests
   * partway through takes the matching share of it). The glide is gentle —
   * any wheel, touch or key from the visitor hands the scroll straight back. */
  glideGap?: { gap: number; ms: number };
};

/**
 * Hand-made scroll snapping between a few stops down the page.
 *
 * A scroll that comes to rest between two neighbouring stops is carried on the
 * way it was going — on to the next stop down, or back to the one above — so
 * one push of a wheel, a flick or a swipe moves a whole screen. Past the last
 * stop (and inside a free gap) the page scrolls freely.
 *
 * Done by hand rather than with CSS scroll-snap: a "proximity" snap only
 * catches a scroll that already ends within a short reach of a stop — and
 * pulls a short one back where it came from, so a mouse wheel moved a notch at
 * a time can never leave the first stop — while "mandatory" would hold the
 * rest of the page to snap points too, and a sticky section makes a poor snap
 * target besides.
 *
 * A finger still on the glass is not a scroll that has come to rest, even if
 * it has stopped moving, so the glide never pulls the page out from under it.
 * With motion off (the site setting or the OS) the move is a jump instead of a
 * glide. `onRest` is called whenever the page settles, glided or not.
 */
export function useScrollStops(
  getStops: () => ScrollStops | null,
  { enabled = true, onRest }: { enabled?: boolean; onRest?: () => void } = {},
) {
  const motionOff = useMotionOff();
  const motionOffRef = useRef(motionOff);
  motionOffRef.current = motionOff;
  const getStopsRef = useRef(getStops);
  getStopsRef.current = getStops;
  const onRestRef = useRef(onRest);
  onRestRef.current = onRest;

  useEffect(() => {
    if (!enabled) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hasScrollEnd = "onscrollend" in window;

    let rest = window.scrollY; // where the last scroll came to rest
    let gliding = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let touching = false;
    let lastScrollAt = 0;
    // A timed glide in flight (see glideGap): its own scroll events are not
    // the visitor's, so they never settle anything.
    let glideRaf = 0;
    const stopGlide = () => {
      if (!glideRaf) return;
      cancelAnimationFrame(glideRaf);
      glideRaf = 0;
      gliding = false;
      rest = window.scrollY;
    };
    const timedGlide = (from: number, to: number, ms: number) => {
      const start = performance.now();
      const step = (now: number) => {
        const u = Math.min(1, (now - start) / ms);
        // Ease in and out, so the glide eases off the stop and onto the next.
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        window.scrollTo({ top: from + (to - from) * e, behavior: "instant" });
        if (u < 1) {
          glideRaf = requestAnimationFrame(step);
        } else {
          glideRaf = 0;
          gliding = false;
          rested(to);
        }
      };
      glideRaf = requestAnimationFrame(step);
    };

    const rested = (y: number) => {
      rest = y;
      onRestRef.current?.();
    };
    const settle = () => {
      if (touching || glideRaf) return;
      // Something else is driving the scroll (the editor's preview).
      if (document.documentElement.hasAttribute("data-gp-autoscroll")) return;
      const y = window.scrollY;
      if (gliding) {
        gliding = false;
        rested(y);
        return;
      }
      const plan = getStopsRef.current();
      if (!plan) {
        rested(y);
        return;
      }
      const { stops, freeGap, glideGap } = plan;
      let i = -1;
      for (let k = 0; k < stops.length - 1; k++) {
        if (y > stops[k] + 1 && y < stops[k + 1] - 1) i = k;
      }
      // At a stop, past the last one, or in a free gap.
      if (i < 0 || i === freeGap) {
        rested(y);
        return;
      }
      const target = y > rest ? stops[i + 1] : stops[i];
      gliding = true;
      rest = target;
      if (glideGap && i === glideGap.gap && !reduce.matches && !motionOffRef.current) {
        const span = Math.max(1, stops[i + 1] - stops[i]);
        const ms = Math.max(300, glideGap.ms * (Math.abs(target - y) / span));
        timedGlide(y, target, ms);
        return;
      }
      window.scrollTo({
        top: target,
        behavior: reduce.matches || motionOffRef.current ? "auto" : "smooth",
      });
    };
    const onScroll = () => {
      lastScrollAt = performance.now();
      if (hasScrollEnd) return;
      clearTimeout(timer);
      timer = setTimeout(settle, 140);
    };
    const onTouchStart = () => {
      stopGlide();
      touching = true;
      clearTimeout(timer);
    };
    // Lifting the finger: if the page is still moving (a flick), the scroll's
    // own end settles it; if it was lifted from a standstill, settle now.
    const onTouchEnd = () => {
      touching = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (performance.now() - lastScrollAt > 120) settle();
      }, 160);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", stopGlide, { passive: true });
    window.addEventListener("keydown", stopGlide);
    window.addEventListener("pointerdown", stopGlide);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    if (hasScrollEnd) window.addEventListener("scrollend", settle);
    return () => {
      clearTimeout(timer);
      stopGlide();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", stopGlide);
      window.removeEventListener("keydown", stopGlide);
      window.removeEventListener("pointerdown", stopGlide);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      if (hasScrollEnd) window.removeEventListener("scrollend", settle);
    };
  }, [enabled]);
}
