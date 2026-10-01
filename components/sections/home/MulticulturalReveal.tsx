"use client";

import { useEffect, useRef } from "react";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableLines from "@/components/admin/editable/EditableLines";
import EditableImage from "@/components/admin/editable/EditableImage";
import { PLACEHOLDER_IMG, resolveImage } from "@/lib/adminClient";
import NextChevron from "@/components/ui/NextChevron";
import { useMotionOff, useMotionStyle } from "@/components/motion/MotionProvider";
import { useScrollStops } from "@/components/motion/useScrollStops";

type Multicultural = {
  titleLines: string[];
  intro: string;
  image: string;
};

/** The gap between one intro word lighting and the next (ms). */
const INTRO_WORD_MS = 45;

/** How much of the visual has to be on screen, once a scroll comes to rest,
 * for it to pop out (see .mc-visual). */
const POP_VISIBLE = 0.6;

/**
 * "the multi-cultural / Agency doing / big things" manifesto.
 *
 * The section is composed to a single screen: it is at least the height of the
 * visible viewport (.mc-screen, which follows a phone's collapsing address
 * bar), its contents centred in the space between the compact marquee pinned
 * over its top and a chevron at its foot that glides on to the next section.
 *
 * On desktop the copy takes the left half of the body column — the payoff line
 * ("big things") is fit to that half, its left edge flush with the white lines
 * above it, and the intro set close under it — and the right half holds a CMS
 * visual framed 4:3 (home.multicultural.image). With none set the frame's space
 * is held open behind a quiet placeholder frame. A phone gets the same section
 * with the visual stacked above the copy, at the column's full width, instead
 * of beside it. The section is centred at the full width of the screen up to a
 * cap, wider than the site column, so the copy is not pressed into half of the
 * narrower column.
 *
 * The title is split into words that ink-fill one by one as the block travels
 * up the viewport (scroll-linked, runs both directions). The intro fills the
 * same way but on its own clock: once it comes into view its words light in
 * turn, whatever the scroll is doing, and stay lit. Under the kinetic motion
 * style each word also rises as the fill reaches it (see .wordfill-armed in
 * globals.css); under minimal the copy is simply lit.
 *
 * The section is a snap point at every width, between the hero above it and
 * the featured work below it (see the useScrollStops call). Landing on it — or
 * scrolling on past it — the visual springs out of its frame.
 *
 * The three points of interest that used to close the section are gone; their
 * copy is still in home.multicultural.cards, unused.
 */
export default function MulticulturalReveal({
  multicultural: serverMulticultural,
}: {
  multicultural: Multicultural;
}) {
  const multicultural = useCmsValue("home.multicultural", serverMulticultural);
  const editMode = useEditMode();
  const reduced = useMotionOff();
  const motion = useMotionStyle();
  const t = useT();
  const tv = useEditableT();
  const fillRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  // The visual's pop. Armed (tucked in, see .mc-visual) only while this effect
  // is live, so without JS, in edit mode or with motion off it simply shows.
  // It pops once a scroll comes to rest with enough of it on screen — which is
  // what landing on the snap point is — and just as well the moment enough of
  // it comes on screen mid-scroll, so a scroll that carries on past the snap
  // point (or never rests on it) still sees it spring out. It tucks back in
  // once the section has left the screen entirely, so it pops again on the
  // next visit.
  const popRef = useRef<() => void>(() => {});
  useEffect(() => {
    const el = visualRef.current;
    const section = sectionRef.current;
    popRef.current = () => {};
    if (!el || !section || editMode || reduced) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
  }, [editMode, reduced]);

  // Snap stops, at every width: the hero (the top of the page), this section's
  // top, and the top of the section after it (featured work). A scroll that
  // comes to rest between two neighbouring stops is carried on the way it was
  // going, to the next stop down or back to the one above (see
  // useScrollStops). Past the last stop the page scrolls freely. Where this
  // section is taller than the screen (a short phone) the stretch in which its
  // foot is still coming up is left free as well, so all of it can be read.
  // Landing anywhere gives the visual its chance to pop. Edit mode is left
  // alone.
  useScrollStops(
    () => {
      const section = sectionRef.current;
      if (!section) return null;
      const y = window.scrollY;
      const rect = section.getBoundingClientRect();
      const top = Math.round(rect.top + y);
      const next = Math.round(rect.bottom + y);
      // Where the section's foot meets the screen's; past `top` only when the
      // section is taller than the screen.
      const foot = next - window.innerHeight;
      return foot > top + 1
        ? { stops: [0, top, foot, next], freeGap: 1 }
        : { stops: [0, top, next] };
    },
    { enabled: !editMode, onRest: () => popRef.current() },
  );

  // The intro's fill, on a clock rather than the scroll: dimmed once armed,
  // then lit word by word from the moment the section comes into view, once.
  useEffect(() => {
    if (editMode || reduced || motion === "minimal") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
  }, [editMode, reduced, motion, multicultural.intro, t]);

  // Scroll-linked word fill for the title: p=0 when its top enters at 90% of
  // the viewport, p=1 just before the section settles at the top of the
  // screen. Words toggle a data-lit attribute directly (no React re-render per
  // frame).
  useEffect(() => {
    // "minimal" keeps the copy lit and lets the block's own arrival carry it —
    // the word-by-word fill is the section's signature move, not its baseline.
    if (editMode || reduced || motion === "minimal") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
  }, [editMode, reduced, motion, multicultural.titleLines, t]);

  // Split into fillable word spans, preserving admin-authored newlines
  // (multiline fields render with whitespace-pre-line).
  const splitWords = (text: string) =>
    text.split(/(\s+)/).map((token, i) =>
      token.trim() === "" ? (
        token
      ) : (
        <span key={i} data-word>
          {token}
        </span>
      ),
    );

  return (
    <section
      ref={sectionRef}
      className="mc-screen relative flex w-full flex-col justify-center overflow-hidden bg-gradient-to-b from-blue-muted/60 via-navy to-navy pb-32 pt-14 sm:pb-24 sm:pt-24"
    >
      {/* Soft gold glow anchoring the manifesto */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-10 h-[480px] w-[480px] bg-gold/[0.07] blur-3xl"
      />
      {/* Full width, centred, up to a cap — wider than the site column, so the
          copy has room to breathe beside the visual. */}
      <div className="relative mx-auto w-full max-w-[1680px] px-6 sm:px-12 lg:px-16">
        {/* Copy in the left half, the visual in the right (sm+); a phone
            stacks the visual above the copy. */}
        <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:items-center sm:gap-x-12 sm:gap-y-0">
          <div className="min-w-0">
            <div ref={fillRef} className="wordfill">
              {editMode ? (
                <EditableLines
                  path="home.multicultural.titleLines"
                  values={multicultural.titleLines}
                  as="h2"
                  className="font-display text-white"
                  lineClassName={(_, i, all) =>
                    `block text-f2 leading-[0.82] ${i === 0 ? "lowercase" : ""} ${
                      i === all.length - 1 ? "text-gold" : ""
                    }`
                  }
                  editingClassName="text-f2"
                  label="title lines"
                />
              ) : (
                <h2 className="font-display text-white">
                  {multicultural.titleLines.map((line, i, all) =>
                    i === all.length - 1 ? (
                      // Payoff line, set edge to edge across its column — the
                      // left half on desktop, flush with the lines above.
                      <FitLine
                        key={i}
                        // pb clears the descenders the tight leading pulls up out
                        // of the line box; in em, so it scales with the fit.
                        className="block text-f2 leading-[0.82] pb-[0.14em] text-gold"
                        refit={tv(line)}
                      >
                        {splitWords(tv(line))}
                      </FitLine>
                    ) : (
                      <span
                        key={i}
                        className={`block text-f2 leading-[0.82] ${i === 0 ? "lowercase" : ""}`}
                      >
                        {splitWords(tv(line))}
                      </span>
                    ),
                  )}
                </h2>
              )}
            </div>
            {/* Set close under the payoff line so the two read as one block:
                the line's own padding already clears the descenders its tight
                leading pulls down, so only a sliver is added here. */}
            {editMode ? (
              <EditableText
                path="home.multicultural.intro"
                value={multicultural.intro}
                as="p"
                multiline
                className="mt-1 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8"
              />
            ) : (
              <p
                ref={introRef}
                className="mt-1 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8"
              >
                {splitWords(tv(multicultural.intro))}
              </p>
            )}
          </div>

          {/* The visual: a 4:3 frame in the right half, or above the copy,
              the column's full width, on a phone (order-first). It springs out
              when the section lands (.mc-visual). Empty, it shows a quiet
              placeholder frame — in edit mode, the picker's placeholder to
              click to add one. */}
          <div
            ref={visualRef}
            className="mc-visual relative order-first aspect-[4/3] w-full overflow-hidden sm:order-none"
          >
            {!multicultural.image && !editMode ? (
              <div
                aria-hidden
                className="flex h-full w-full items-center justify-center border border-dashed border-white/15 bg-white/[0.03]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.25}
                  className="h-12 w-12 text-white/20"
                >
                  <rect x="3" y="4.5" width="18" height="15" rx="1" />
                  <circle cx="8.5" cy="9.5" r="1.75" />
                  <path d="m3.5 17.5 5-5 3.5 3.5 3-3 5.5 5.5" />
                </svg>
              </div>
            ) : (
              <EditableImage
                path="home.multicultural.image"
                raw={multicultural.image}
                src={
                  multicultural.image
                    ? resolveImage(multicultural.image, 1200, 900)
                    : PLACEHOLDER_IMG
                }
                alt={t("Galvez & Partners")}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* A way on: a chevron at the foot of the screen, bobbing gently (still
          with motion off), that glides on to the next section. Above the
          floating menu bar on a phone. */}
      {!editMode && (
        <NextChevron sectionRef={sectionRef} className="bottom-[4.5rem] sm:bottom-4" />
      )}
    </section>
  );
}

/**
 * One title line scaled up until it spans its column exactly, edge to edge.
 * The class-driven size is only a starting point: the natural width of the
 * (nowrap) text is measured at that size and the font-size is scaled by the
 * ratio to the available width, so the fit survives a resize, a locale swap
 * (Spanish sets a different word), and the web fonts landing after first paint.
 * Edit mode keeps the plain editable block, so this never runs while typing.
 */
function FitLine({
  className,
  refit,
  children,
}: {
  className?: string;
  /** Line text — re-measures when the copy or locale changes. */
  refit: string;
  children: React.ReactNode;
}) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const box = outer.current;
    const text = inner.current;
    if (!box || !text) return;

    let raf = 0;
    let lastWidth = -1;

    const fit = () => {
      // Drop back to the class-driven size so the measurement is of the text
      // itself and not of the previous fit.
      box.style.fontSize = "";
      const avail = box.clientWidth;
      const natural = text.getBoundingClientRect().width;
      if (avail <= 0 || natural <= 0) return;
      lastWidth = avail;
      const base = parseFloat(getComputedStyle(box).fontSize);
      box.style.fontSize = `${Math.floor(((base * avail) / natural) * 100) / 100}px`;
    };
    const schedule = (force = false) => {
      // Resizing fires again on our own font-size change (the line box grows);
      // only a real column-width change is worth re-fitting.
      if (!force && outer.current?.clientWidth === lastWidth) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    schedule(true);
    const ro = new ResizeObserver(() => schedule());
    ro.observe(box);
    // Fitting against a fallback font leaves the line short (or overflowing)
    // once the real display face arrives.
    document.fonts?.ready.then(() => schedule(true)).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      box.style.fontSize = "";
    };
  }, [refit]);

  return (
    <span ref={outer} className={className}>
      <span ref={inner} className="inline-block whitespace-nowrap">
        {children}
      </span>
    </span>
  );
}
