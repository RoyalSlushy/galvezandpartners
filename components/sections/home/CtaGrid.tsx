"use client";

import { useEffect, useRef } from "react";

/**
 * The drifting grid backdrop for the home CTA. The drift is driven in JS (rather
 * than a CSS keyframe animation) so hovering can ramp the speed up without ever
 * resetting the pattern's position: the accumulated offset carries straight
 * through the speed change. The speed eases *in* while the CTA is hovered and
 * eases *out* when the cursor leaves.
 *
 * The tile visuals (image, size, 24px tiling, opacity, alpha mask) live in the
 * `.cta-grid` CSS; this component only animates `background-position`.
 */
const TILE = 24; // px — must match `.cta-grid` background-size
const BASE_SPEED = TILE / 4500; // px per ms → one tile every 4.5s
const HOVER_SPEED = BASE_SPEED * 2.5; // 150% faster while hovered
const RAMP_MS = 250; // time to ramp fully between base and hover speed

const easeInQuad = (u: number) => u * u;
const easeOutQuad = (u: number) => u * (2 - u);

export default function CtaGrid() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const card = el.parentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pos = 0; // accumulated drift within one tile [0, TILE)
    let factor = 0; // eased blend 0 (base) → 1 (hover)
    let from = 0; // tween start value
    let to = 0; // tween target (0 or 1)
    let tweenStart = 0;
    let tweenDur = 1;
    let ease = easeInQuad;
    let last: number | null = null;
    let raf = 0;

    // Event timeStamps and rAF timestamps share the same (time-origin) clock.
    const retarget = (target: number, e: Event, easeIn: boolean) => {
      from = factor;
      to = target;
      tweenStart = e.timeStamp || last || 0;
      tweenDur = Math.max(1, RAMP_MS * Math.abs(to - from));
      ease = easeIn ? easeInQuad : easeOutQuad;
    };
    const onEnter = (e: Event) => retarget(1, e, true);
    const onLeave = (e: Event) => retarget(0, e, false);

    card?.addEventListener("mouseenter", onEnter);
    card?.addEventListener("mouseleave", onLeave);

    const tick = (t: number) => {
      if (last == null) last = t;
      const dt = t - last;
      last = t;

      const u = Math.min(1, (t - tweenStart) / tweenDur);
      factor = from + (to - from) * ease(u);

      const speed = BASE_SPEED + (HOVER_SPEED - BASE_SPEED) * factor;
      pos = (pos + speed * dt) % TILE;
      // Up-right drift: shift the tile right (+x) and up (-y).
      el.style.backgroundPosition = `${pos}px ${-pos}px`;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      card?.removeEventListener("mouseenter", onEnter);
      card?.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <div ref={ref} aria-hidden className="cta-grid pointer-events-none absolute inset-0" />;
}
