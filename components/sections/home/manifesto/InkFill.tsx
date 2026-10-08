"use client";

import { useEffect, useRef } from "react";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import { useMotionOff, useMotionStyle } from "@/components/motion/MotionProvider";
import {
  ManifestoColumns,
  ManifestoShell,
  ManifestoVisual,
  TitleLines,
  canAnimate,
  splitWords,
  type ManifestoProps,
} from "./shared";

/** The gap between one intro word lighting and the next (ms). */
const INTRO_WORD_MS = 45;

/** How much of the visual has to be on screen, once a scroll comes to rest,
 * for it to pop out (see .mc-visual). */
const POP_VISIBLE = 0.6;

/**
 * Ink Fill — the original manifesto style.
 *
 * The title is split into words that ink-fill one by one as the block travels
 * up the viewport (scroll-linked, runs both directions). The intro fills the
 * same way but on its own clock: once it comes into view its words light in
 * turn, whatever the scroll is doing, and stay lit. Under the kinetic motion
 * style each word also rises as the fill reaches it (see .wordfill-armed in
 * globals.css); under minimal the copy is simply lit.
 *
 * The section is a snap point at every width, between the hero above it and
 * the featured work below it. Landing on it — or scrolling on past it — the
 * visual springs out of its frame.
 */
export default function InkFill({ multicultural }: ManifestoProps) {
  const reduced = useMotionOff();
  const motion = useMotionStyle();
  const t = useT();
  const tv = useEditableT();
  const fillRef = useRef<HTMLHeadingElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  // The visual's pop. Armed (tucked in, see .mc-visual) only while this effect
  // is live, so without JS or with motion off it simply shows. It pops once a
  // scroll comes to rest with enough of it on screen — which is what landing on
  // the snap point is — and just as well the moment enough of it comes on
  // screen mid-scroll, so a scroll that carries on past the snap point (or
  // never rests on it) still sees it spring out. It tucks back in once the
  // section has left the screen entirely, so it pops again on the next visit.
  const popRef = useRef<() => void>(() => {});
  useEffect(() => {
    const el = visualRef.current;
    const section = sectionRef.current;
    popRef.current = () => {};
    if (!el || !section || !canAnimate(motion)) return;

    el.setAttribute("data-armed", "");
    const check = () => {
      const r = el.getBoundingClientRect();
      if (r.height <= 0) return;
      const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (shown / r.height >= POP_VISIBLE) el.setAttribute("data-pop", "");
    };
    popRef.current = check;
    const io = new IntersectionObserver((entries) => {
      if (entries.every((e) => !e.isIntersecting)) el.removeAttribute("data-pop");
    });
    io.observe(section);
    // Mid-scroll: crossing the same share of the visual on screen pops it. The
    // ratio is of the visual's own (tucked, so scaled) box, as check()'s is.
    const inView = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= POP_VISIBLE - 0.01)) {
          el.setAttribute("data-pop", "");
        }
      },
      { threshold: [POP_VISIBLE] },
    );
    inView.observe(el);
    check();
    return () => {
      io.disconnect();
      inView.disconnect();
      popRef.current = () => {};
      el.removeAttribute("data-armed");
      el.removeAttribute("data-pop");
    };
  }, [motion]);

  // The intro's fill, on a clock rather than the scroll: dimmed once armed,
  // then lit word by word from the moment the section comes into view, once.
  useEffect(() => {
    if (reduced || motion === "minimal" || !canAnimate(motion)) return;
    const root = introRef.current;
    if (!root) return;
    const words = Array.from(root.querySelectorAll<HTMLElement>("[data-word]"));
    if (words.length === 0) return;

    root.classList.add("wordfill-armed");
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        words.forEach((w, i) => {
          timers.push(setTimeout(() => w.setAttribute("data-lit", ""), i * INTRO_WORD_MS));
        });
      },
      // Keyed to the section coming on screen rather than the intro itself:
      // the snap carries the section up in a moment, and the intro has to be
      // lit by the time it lands, not start lighting once it has.
      { threshold: 0 },
    );
    io.observe(sectionRef.current ?? root);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
      root.classList.remove("wordfill-armed");
      words.forEach((w) => w.removeAttribute("data-lit"));
    };
    // `t`: re-split and re-run when the locale changes the words.
  }, [reduced, motion, multicultural.intro, t]);

  // Scroll-linked word fill for the title: p=0 when its top enters at 90% of
  // the viewport, p=1 just before the section settles at the top of the
  // screen. Words toggle a data-lit attribute directly (no React re-render per
  // frame).
  useEffect(() => {
    // "minimal" keeps the copy lit and lets the block's own arrival carry it —
    // the word-by-word fill is the section's signature move, not its baseline.
    if (reduced || motion === "minimal" || !canAnimate(motion)) return;
    const root = fillRef.current;
    if (!root) return;

    const words = Array.from(root.querySelectorAll<HTMLElement>("[data-word]"));
    if (words.length === 0) return;

    // Dim rule only applies while armed, so no-JS/pre-hydration text is legible.
    root.classList.add("wordfill-armed");

    let lit = -1;
    let raf = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight;
      // Where the title's top stands once the section has settled at the top
      // of the screen (the snap point), less a little: the fill completes just
      // before it gets there, never after.
      const sec = sectionRef.current?.getBoundingClientRect();
      const settled = (sec ? rect.top - sec.top : 0) + vh * 0.05;
      const span = Math.max(1, vh * 0.9 - settled);
      const p = Math.max(0, Math.min(1, (vh * 0.9 - rect.top) / span));
      const next = Math.round(p * words.length);
      if (next === lit) return;
      const [from, to] = next > lit ? [lit, next] : [next, lit];
      for (let i = Math.max(0, from); i < to; i++) {
        words[i].toggleAttribute("data-lit", i < next);
      }
      lit = next;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("wordfill-armed");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // `t` is included so the word list is re-measured when the locale (and thus
    // the translated word count) changes.
  }, [reduced, motion, multicultural.titleLines, t]);

  return (
    <ManifestoShell sectionRef={sectionRef} onRest={() => popRef.current()}>
      <ManifestoColumns
        copy={
          <>
            <TitleLines ref={fillRef} lines={multicultural.titleLines} t={tv} className="wordfill" />
            {/* Set close under the payoff line so the two read as one block:
                the line's own padding already clears the descenders its tight
                leading pulls down, so only a sliver is added here. */}
            <p
              ref={introRef}
              className="mt-1 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8"
            >
              {splitWords(tv(multicultural.intro))}
            </p>
          </>
        }
        visual={
          // It springs out when the section lands (.mc-visual).
          <ManifestoVisual
            ref={visualRef}
            image={multicultural.image}
            alt={t("Galvez & Partners")}
            className="mc-visual"
          />
        }
      />
    </ManifestoShell>
  );
}
