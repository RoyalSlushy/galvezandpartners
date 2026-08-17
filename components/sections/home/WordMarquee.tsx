"use client";

import { useEffect, useRef, useState } from "react";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableLines from "@/components/admin/editable/EditableLines";
import { GlyphMark, useGlyphMap } from "@/components/ui/Glyph";
import { useMotionOff, useMotionStyle } from "@/components/motion/MotionProvider";

/**
 * Velocity-reactive marquee band under the hero: a run of giant display-type
 * words (alternating gold fill / gold outline) separated by the house "G"/"P"
 * letterforms tipped 45° counter-clockwise, drifting left forever. Scrolling
 * pushes it — scroll down and it accelerates (with a slight italic skew),
 * scroll up and it flows backwards — then it eases back to its idle drift.
 * Hovering (or focusing into) the band eases it to a stop (WCAG 2.2.2).
 *
 * The run is duplicated just enough times to cover any viewport, and the
 * offset wraps modulo one run width, so the loop is seamless in both
 * directions. Edit mode swaps in a static, line-editable block; motion off
 * renders the words as a static wrapped row.
 *
 * The site-wide motion setting picks how the band behaves (see TUNING). The
 * band is already the loudest thing on the page, so kinetic deliberately reads
 * the same as classic here — it has nothing left to add that isn't noise.
 * Minimal drops to a plain constant drift that ignores scrolling entirely.
 */

/** Per-motion-style tuning of the band. */
const TUNING = {
  classic: { idle: 70, gain: 5, maxBoost: 2600, skewPer: 0.004, maxSkew: 9 },
  minimal: { idle: 45, gain: 0, maxBoost: 0, skewPer: 0, maxSkew: 0 },
} as const;

/**
 * Marquee separator: a house letterform ("G" or "P") tipped 45° counter-
 * clockwise, standing in for the old ✦. Uses the admin-uploaded glyph when one
 * exists for the character and falls back to the display font otherwise, so the
 * band never loses its separators on a site with no glyphs uploaded yet.
 */
function MarqueeGlyph({ char }: { char: string }) {
  const glyphs = useGlyphMap();
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center text-3xl leading-none [transform:rotate(-45deg)] sm:text-4xl"
    >
      {glyphs.has(char) ? (
        <GlyphMark char={char} tintClassName="bg-white/25" className="block h-[1em] w-[1em]" />
      ) : (
        <span className="font-display uppercase leading-none text-white/25">{char}</span>
      )}
    </span>
  );
}

export default function WordMarquee({ words: serverWords }: { words: string[] }) {
  const words = useCmsValue("home.marqueeWords", serverWords);
  const editMode = useEditMode();
  const reduced = useMotionOff();
  const motion = useMotionStyle();
  const t = useT();

  const trackRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);

  const animate = !editMode && !reduced;

  // Duplicate the run until it more than covers the widest viewport.
  useEffect(() => {
    if (!animate) return;
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const run = track.querySelector<HTMLElement>("[data-run]");
      const runW = run?.offsetWidth ?? 0;
      if (runW > 0) {
        setCopies(Math.max(2, Math.ceil(window.innerWidth / runW) + 1));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [animate, words, t]);

  useEffect(() => {
    if (!animate) return;
    // The hook's first paint predates its matchMedia effect — bail sync too.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const track = trackRef.current;
    if (!track) return;
    const band = track.parentElement;
    const tune = TUNING[motion === "minimal" ? "minimal" : "classic"];

    let offset = 0;
    let boost = 0; // eased scroll-velocity contribution, px/s (signed)
    let pause = 0; // eased 0 = running, 1 = paused (hover/focus)
    let pauseTarget = 0;
    let lastY = window.scrollY;
    let last: number | null = null;
    let raf = 0;

    const hold = () => (pauseTarget = 1);
    const release = () => (pauseTarget = 0);
    band?.addEventListener("mouseenter", hold);
    band?.addEventListener("mouseleave", release);
    band?.addEventListener("focusin", hold);
    band?.addEventListener("focusout", release);

    const tick = (t: number) => {
      if (last == null) last = t;
      const dt = Math.min(0.05, (t - last) / 1000); // clamp tab-switch jumps
      last = t;

      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;

      // Feed scroll movement in, then decay toward idle.
      if (dt > 0) {
        boost += dy * tune.gain;
        boost = Math.max(-tune.maxBoost, Math.min(tune.maxBoost, boost));
        boost *= Math.exp(-dt * 4);
        pause += (pauseTarget - pause) * Math.min(1, dt * 5);
      }

      const run = track.querySelector<HTMLElement>("[data-run]");
      const runW = run?.offsetWidth ?? 0;
      if (runW > 0) {
        const speedFactor = 1 - pause;
        offset -= (tune.idle + boost) * speedFactor * dt;
        offset = ((offset % runW) - runW) % runW; // keep in (-runW, 0]
        const skew =
          Math.max(-tune.maxSkew, Math.min(tune.maxSkew, -boost * tune.skewPer)) * speedFactor;
        track.style.transform = `translate3d(${offset}px,0,0) skewX(${skew}deg)`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // The edit-mode/motion-off branches reuse this DOM node — leave it clean.
      track.style.transform = "";
      band?.removeEventListener("mouseenter", hold);
      band?.removeEventListener("mouseleave", release);
      band?.removeEventListener("focusin", hold);
      band?.removeEventListener("focusout", release);
    };
  }, [animate, motion, copies, words, t]);

  const run = (ariaHidden: boolean, key: number, wrap = false) => (
    <div
      key={key}
      data-run={key === 0 ? "" : undefined}
      aria-hidden={ariaHidden || undefined}
      className={
        wrap
          ? "flex flex-wrap items-center justify-center gap-y-2"
          : "flex w-max shrink-0 items-center"
      }
    >
      {words.map((w, i) => (
        <span key={i} className="flex items-center">
          <span
            className={`px-6 font-display text-f4 lowercase leading-none sm:px-10 ${
              i % 2 === 0 ? "text-gold" : "text-stroke-gold"
            }`}
          >
            {t(w)}
          </span>
          <MarqueeGlyph char={i % 2 === 0 ? "G" : "P"} />
        </span>
      ))}
    </div>
  );

  return (
    <section
      aria-label={t("What we are")}
      className="w-full overflow-hidden border-y border-white/5 bg-gradient-to-b from-blue-muted/50 to-blue-muted/60 py-6 sm:py-8"
    >
      {editMode ? (
        <div key="edit" className="mx-auto max-w-site px-5 sm:px-8">
          <EditableLines
            path="home.marqueeWords"
            values={words}
            as="p"
            className="flex flex-wrap items-center gap-x-8 gap-y-2"
            lineClassName={(_, i) =>
              `font-display text-f6 lowercase leading-none ${
                i % 2 === 0 ? "text-gold" : "text-stroke-gold"
              }`
            }
            editingClassName="text-f6 text-white"
            label="marquee words"
          />
        </div>
      ) : reduced ? (
        <div key="static">{run(false, 0, true)}</div>
      ) : (
        <div key="track" ref={trackRef} className="flex w-max will-change-transform">
          {Array.from({ length: copies }, (_, c) => run(c > 0, c))}
        </div>
      )}
    </section>
  );
}
