"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGlyphMap } from "@/components/ui/Glyph";

/**
 * The drifting grid backdrop for the home CTA. Each 24px tile carries one letter
 * of "GALVEZ", and every successive row shifts the sequence one letter across so
 * the same letters line up on the diagonal. Letters render as uploaded glyphs
 * (masked navy boxes, like the rest of the letterform system) where a glyph has
 * been assigned, and fall back to the Sebastian Slab display font otherwise.
 *
 * The drift is driven in JS (rather than a CSS keyframe animation) so hovering
 * can ramp the speed up without ever resetting the pattern's position: the
 * accumulated offset carries straight through the speed change. The speed eases
 * *in* while the CTA is hovered and eases *out* when the cursor leaves. Because
 * the letter pattern only repeats every 6 tiles, the drift wraps over a full
 * PERIOD (not a single tile) so the wrap stays seamless.
 *
 * The panel-wide opacity + bottom fade live in the `.cta-grid` CSS; this
 * component renders the letter cells and animates the layer's `transform`.
 */
const TILE = 28; // px — one letter per tile (letter box 20px + 8px gutter) at scale 1
const GLYPH_H = 20; // px — masked-glyph / font letter height at scale 1
const GLYPH_W = 17.5; // px — masked-glyph box width at scale 1
const LETTERS = ["G", "A", "L", "V", "E", "Z"];
const OVERSCAN = LETTERS.length; // extra tiles per side so the drift never gaps
const RAMP_MS = 150; // time to ramp fully between base and hover speed

const easeInQuad = (u: number) => u * u;
const easeOutQuad = (u: number) => u * (2 - u);

/** Mask CSS that clips a colored box to the shape of `svg` (its own color fills
 * the box). `contain` letterboxes any aspect ratio. */
function maskStyle(svg: string): React.CSSProperties {
  return {
    WebkitMaskImage: `url("${svg}")`,
    maskImage: `url("${svg}")`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
}

export default function CtaGrid({
  className = "cta-grid",
  glyphClassName = "bg-navy",
  fontClassName = "text-navy",
  scale = 1,
}: {
  /** Wrapper class controlling panel-wide opacity + fade (defaults to the home
   * CTA's gold-panel treatment; the mobile drawer passes `drawer-glyph-grid`). */
  className?: string;
  /** Tailwind background class the masked glyph boxes are tinted with. */
  glyphClassName?: string;
  /** Tailwind text-color class for the font fallback letters. */
  fontClassName?: string;
  /** Uniform size multiplier for the tile/glyph grid (drift speed scales with
   * it too, so the period still takes the same time). Defaults to 1 (the home
   * CTA's original sizing); the drawer passes a larger value. */
  scale?: number;
} = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const glyphs = useGlyphMap();
  const [dims, setDims] = useState({ cols: 0, rows: 0 });

  const tile = TILE * scale;
  const glyphW = GLYPH_W * scale;
  const glyphH = GLYPH_H * scale;
  const period = tile * LETTERS.length;
  const baseSpeed = tile / 4500;
  const hoverSpeed = baseSpeed * 3;

  // Size the letter grid to cover the panel plus one period of overscan on
  // every side, so the up-right drift never exposes an uncovered edge.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const { width, height } = wrap.getBoundingClientRect();
      const cols = Math.ceil(width / tile) + OVERSCAN * 2;
      const rows = Math.ceil(height / tile) + OVERSCAN * 2;
      setDims((d) => (d.cols === cols && d.rows === rows ? d : { cols, rows }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [tile]);

  // Drift the whole letter layer diagonally, easing the speed up on hover.
  useEffect(() => {
    const layer = layerRef.current;
    const wrap = wrapRef.current;
    if (!layer || !wrap) return;
    const card = wrap.parentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pos = 0; // accumulated drift within one PERIOD [0, PERIOD)
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

      const speed = baseSpeed + (hoverSpeed - baseSpeed) * factor;
      pos = (pos + speed * dt) % period;
      // Up-right drift: shift the layer right (+x) and up (-y).
      layer.style.transform = `translate(${pos}px, ${-pos}px)`;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      card?.removeEventListener("mouseenter", onEnter);
      card?.removeEventListener("mouseleave", onLeave);
    };
  }, [period, baseSpeed, hoverSpeed]);

  const cells = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let r = 0; r < dims.rows; r++) {
      for (let c = 0; c < dims.cols; c++) {
        // Each row shifts the sequence one letter across (diagonal alignment).
        const ch = LETTERS[(r + c) % LETTERS.length];
        const svg = glyphs.get(ch);
        out.push(
          <span
            key={`${r}-${c}`}
            className="flex items-center justify-center"
            style={{ width: tile, height: tile }}
          >
            {svg ? (
              <span
                className={glyphClassName}
                style={{ width: glyphW, height: glyphH, ...maskStyle(svg) }}
              />
            ) : (
              <span
                className={`font-display font-bold leading-none ${fontClassName}`}
                style={{ fontSize: glyphH }}
              >
                {ch}
              </span>
            )}
          </span>,
        );
      }
    }
    return out;
  }, [dims, glyphs, glyphClassName, fontClassName, tile, glyphW, glyphH]);

  return (
    <div ref={wrapRef} aria-hidden className={`${className} pointer-events-none absolute inset-0`}>
      <div
        ref={layerRef}
        className="absolute grid"
        style={{
          top: -period,
          left: -period,
          gridTemplateColumns: `repeat(${dims.cols}, ${tile}px)`,
          gridAutoRows: `${tile}px`,
          willChange: "transform",
        }}
      >
        {cells}
      </div>
    </div>
  );
}
