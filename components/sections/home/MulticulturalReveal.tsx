"use client";

import { useEffect, useRef, useState } from "react";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableLines from "@/components/admin/editable/EditableLines";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { PLACEHOLDER_IMG, resolveImage } from "@/lib/adminClient";
import { useMotionOff, useMotionStyle } from "@/components/motion/MotionProvider";

type Multicultural = {
  titleLines: string[];
  intro: string;
  image: string;
  cards: { title: string; body: string }[];
};

/** The gap between one intro word lighting and the next (ms). */
const INTRO_WORD_MS = 45;

/**
 * "the multi-cultural / Agency doing / big things" manifesto.
 *
 * The section is composed to a single screen: the copy takes what it needs and
 * the points of interest sit under it, so the whole thing lands inside one
 * mobile viewport instead of running on past it.
 *
 * On desktop the copy takes the left half of the body column — the payoff line
 * ("big things") is fit to that half, its left edge flush with the white lines
 * above it — and the right half holds a CMS visual framed 4:3
 * (home.multicultural.image). With none set the frame's space is held
 * open behind a quiet placeholder frame. On a phone the copy has the width to
 * itself and the visual stays out. The section is centred at the full width of
 * the screen up to a cap, wider than the site column, so the copy is not
 * pressed into half of the narrower column.
 *
 * The title is split into words that ink-fill one by one as the block travels
 * up the viewport (scroll-linked, runs both directions). The intro fills the
 * same way but on its own clock: once it comes into view its words light in
 * turn, whatever the scroll is doing, and stay lit. Under the kinetic motion
 * style each word also rises as the fill reaches it (see .wordfill-armed in
 * globals.css); under minimal the copy is simply lit.
 *
 * On desktop the section is a snap point: a scroll leaving the hero carries on
 * until the whole manifesto is on screen (see the snap effect below).
 *
 * What used to be three cards is now three points of interest: a dot and a
 * title each, with the body arriving only when one is asked for. The cards
 * were most of the section's height and were read in a glance and never
 * again; as points they cost nothing until wanted.
 *
 * Edit mode keeps the plain editable card list — the copy still has to be
 * editable, and a dot is a poor place to type.
 */
export default function MulticulturalReveal({
  multicultural: serverMulticultural,
}: {
  multicultural: Multicultural;
}) {
  const multicultural = useCmsValue("home.multicultural", serverMulticultural);
  const editMode = useEditMode();
  const reduced = useMotionOff();
  const motionOffRef = useRef(reduced);
  motionOffRef.current = reduced;
  const motion = useMotionStyle();
  const t = useT();
  const tv = useEditableT();
  const fillRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Desktop snap between the hero and this section. The stretch between them
  // (the skyline and the word marquee) is not a place to stop: a scroll that
  // comes to rest in it is carried on the way it was going — on down to this
  // section's top, or back up to the hero. Anywhere else the page scrolls
  // freely. Done by hand rather than with CSS scroll-snap: the hero is sticky
  // (a poor snap target), and a "proximity" snap only catches a scroll that
  // already ends within a short reach of the section, while "mandatory" would
  // hold the rest of the page to snap points too. Edit mode is left alone.
  useEffect(() => {
    if (editMode) return;
    const section = sectionRef.current;
    if (!section) return;
    const desktop = window.matchMedia("(min-width: 751px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hasScrollEnd = "onscrollend" in window;

    let rest = window.scrollY; // where the last scroll came to rest
    let gliding = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      const y = window.scrollY;
      if (gliding) {
        gliding = false;
        rest = y;
        return;
      }
      const top = Math.round(section.getBoundingClientRect().top + y);
      if (!desktop.matches || y <= 1 || y >= top - 1) {
        rest = y;
        return;
      }
      const target = y > rest ? top : 0;
      gliding = true;
      rest = target;
      window.scrollTo({ top: target, behavior: reduce.matches || motionOffRef.current ? "auto" : "smooth" });
    };
    const onScroll = () => {
      if (hasScrollEnd) return;
      clearTimeout(timer);
      timer = setTimeout(settle, 140);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    if (hasScrollEnd) window.addEventListener("scrollend", settle);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      if (hasScrollEnd) window.removeEventListener("scrollend", settle);
    };
  }, [editMode]);

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
  // the viewport, p=1 just before the section settles at the top of the screen. Words toggle a data-lit
  // attribute directly (no React re-render per frame).
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
      // of the screen (the desktop snap point), less a little: the fill
      // completes just before it gets there, never after.
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
      className="relative flex min-h-viewport w-full flex-col justify-center overflow-hidden bg-gradient-to-b from-blue-muted/60 via-navy to-navy pb-10 pt-24 sm:pb-16 sm:pt-32"
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
            stacks nothing beside the copy. */}
        <div className="sm:grid sm:grid-cols-2 sm:items-center sm:gap-x-12">
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
            {/* mt-7 clears the payoff line's descenders, which the tighter
                leading pulls up into whatever follows. */}
            {editMode ? (
              <EditableText
                path="home.multicultural.intro"
                value={multicultural.intro}
                as="p"
                multiline
                className="mt-7 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8"
              />
            ) : (
              <p
                ref={introRef}
                className="mt-7 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8"
              >
                {splitWords(tv(multicultural.intro))}
              </p>
            )}

            {editMode ? (
              <>
                <div className="mt-10 grid gap-6">
                  {multicultural.cards.map((c, i) => (
                    <SpotlightCard
                      key={i}
                      index={i}
                      count={multicultural.cards.length}
                      card={c}
                      editMode={editMode}
                      tv={tv}
                    />
                  ))}
                </div>
                <div className="mt-8">
                  <AddChip listPath="home.multicultural.cards" label="card" />
                </div>
              </>
            ) : (
              <PointsOfInterest cards={multicultural.cards} tv={tv} t={t} />
            )}
          </div>

          {/* The visual, desktop only: a 4:3 frame in the right half. Empty,
              it shows a quiet placeholder frame — in edit mode, the picker's
              placeholder to click to add one. */}
          <div className="relative hidden aspect-[4/3] w-full overflow-hidden sm:block">
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
    </section>
  );
}

/**
 * The three points of interest, and the copy one of them is holding.
 *
 * Ordinary buttons in a row: they tab, they announce what they open, and the
 * body text is in the DOM only while its point is open. Tapping the open one
 * again — or Escape, or a click outside — puts it away.
 */
function PointsOfInterest({
  cards,
  tv,
  t,
}: {
  cards: { title: string; body: string }[];
  tv: (s: string) => string;
  t: (s: string) => string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const points = cards.map((c, i) => (
    <button
      key={i}
      type="button"
      aria-expanded={open === i}
      onClick={() => setOpen((cur) => (cur === i ? null : i))}
      className="group relative flex items-center gap-2 text-left"
    >
      <span
        className={`relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition ${
          open === i
            ? "border-gold bg-gold"
            : "border-gold/70 bg-navy/70 group-hover:bg-gold/40 group-focus-visible:bg-gold/40"
        }`}
      >
        {/* The ring is what makes a 14px dot read as a control. */}
        <span
          aria-hidden
          className={`absolute inset-[-6px] rounded-full border border-gold/30 transition ${
            open === i ? "opacity-100" : "opacity-60 group-hover:opacity-100"
          }`}
        />
      </span>
      <span
        className={`font-heading text-[11px] uppercase tracking-[0.18em] transition ${
          open === i ? "text-gold" : "text-white/70 group-hover:text-white"
        }`}
      >
        {tv(c.title)}
      </span>
    </button>
  ));

  return (
    <div ref={wrapRef} className="relative mt-8">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">{points}</div>

      {open !== null && cards[open] && (
        <div
          role="dialog"
          aria-label={tv(cards[open].title)}
          className="mt-5 border border-gold/25 bg-navy-soft/95 p-5 shadow-2xl shadow-black/40 sm:max-w-md"
        >
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-heading text-f7 uppercase leading-tight text-gold">
              {tv(cards[open].title)}
            </h3>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label={t("Close")}
              className="-m-2 shrink-0 p-2 font-heading text-sm text-white/60 transition hover:text-gold"
            >
              ✕
            </button>
          </div>
          <p className="mt-3 whitespace-pre-line font-body text-f9 text-white/80">
            {tv(cards[open].body)}
          </p>
        </div>
      )}
    </div>
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

/**
 * The editable card, kept for edit mode. Visitors get the map pins instead, but
 * an admin still needs somewhere to type the copy that fills them — and a pin
 * projected onto a moving 3D scene is not that place.
 */
function SpotlightCard({
  index,
  count,
  card,
  editMode,
  tv,
}: {
  index: number;
  count: number;
  card: { title: string; body: string };
  editMode: boolean;
  tv: (s: string) => string;
}) {
  const ref = useRef<HTMLElement>(null);

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <article
      ref={ref}
      onMouseMove={onMouseMove}
      className="group relative h-full overflow-hidden border border-white/10 bg-navy-soft/60 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/40"
    >
      {/* Cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(230,179,103,0.13), transparent 70%)",
        }}
      />
      {editMode && (
        <ListControls
          listPath="home.multicultural.cards"
          index={index}
          count={count}
          label="card"
          className="right-2 top-2"
        />
      )}
      <div className="relative">
        <EditableText
          path={`home.multicultural.cards.${index}.title`}
          value={tv(card.title)}
          as="h3"
          className="font-heading text-f7 uppercase text-gold"
        />
        <EditableText
          path={`home.multicultural.cards.${index}.body`}
          value={tv(card.body)}
          as="p"
          multiline
          className="mt-4 whitespace-pre-line font-body text-f9 text-white/75"
        />
      </div>
    </article>
  );
}
