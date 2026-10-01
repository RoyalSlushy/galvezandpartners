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

    const rested = (y: number) => {
      rest = y;
      onRestRef.current?.();
    };
    const settle = () => {
      if (touching) return;
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
      const { stops, freeGap } = plan;
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
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    if (hasScrollEnd) window.addEventListener("scrollend", settle);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      if (hasScrollEnd) window.removeEventListener("scrollend", settle);
    };
  }, [enabled]);
}
