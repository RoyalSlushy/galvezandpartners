"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Container from "@/components/ui/Container";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableLines from "@/components/admin/editable/EditableLines";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { POI_ANCHORS } from "@/components/sections/home/PhoenixScene";
import { useMotionOff, useMotionStyle } from "@/components/motion/MotionProvider";

/** three.js and the scene it builds are client-only and heavy; nothing about
 * them belongs in the server render or the shared bundle. */
const PhoenixScene = dynamic(() => import("@/components/sections/home/PhoenixScene"), {
  ssr: false,
});

type Multicultural = {
  titleLines: string[];
  intro: string;
  cards: { title: string; body: string }[];
};

/**
 * "the multi-cultural / Agency doing / big things" manifesto, over the Valley.
 *
 * The section is composed to a single screen: the copy takes what it needs and
 * the scene below it takes whatever is left, so the whole thing lands inside
 * one mobile viewport instead of running on past it.
 *
 * The title and intro are split into words that ink-fill one by one as the
 * block travels up the viewport (scroll-linked, runs both directions). Under
 * the kinetic motion style each word also rises as the fill reaches it (see
 * .wordfill-armed in globals.css); under minimal the copy is simply lit.
 *
 * What used to be three cards is now three points of interest standing on the
 * map (see PhoenixScene, which projects them onto their anchors every frame).
 * Tapping one pulls its copy up over the scene. The cards were most of the
 * section's height and were read in a glance and never again; as pins they
 * cost nothing until asked for, and they give the map something to say.
 *
 * Edit mode keeps the plain editable card list — the copy still has to be
 * editable, and a pin is a poor place to type. Motion off skips the scene
 * altogether and lays the pins out as a plain list, which is also what a
 * visitor without WebGL gets.
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

  // Scroll-linked word fill: p=0 when the block's top enters at 90% of the
  // viewport, p=1 once its bottom clears ~45%. Words toggle a data-lit
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
      const p = Math.max(0, Math.min(1, (vh * 0.9 - rect.top) / (vh * 0.45 + rect.height)));
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
  }, [editMode, reduced, motion, multicultural.titleLines, multicultural.intro, t]);

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
    <section className="relative flex min-h-viewport w-full flex-col justify-center overflow-hidden bg-gradient-to-b from-blue-muted/60 via-navy to-navy py-10 sm:py-16">
      {/* Soft gold glow anchoring the manifesto */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-10 h-[480px] w-[480px] bg-gold/[0.07] blur-3xl"
      />
      <Container className="relative flex min-h-0 w-full flex-1 flex-col">
        <div ref={fillRef} className="wordfill shrink-0">
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
                  // Payoff line, set edge to edge across the column.
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
                  <span key={i} className={`block text-f2 leading-[0.82] ${i === 0 ? "lowercase" : ""}`}>
                    {splitWords(tv(line))}
                  </span>
                ),
              )}
            </h2>
          )}
          {/* Clears the payoff line's descenders, which the tighter leading
              pulls up into whatever follows. */}
          {editMode ? (
            <EditableText
              path="home.multicultural.intro"
              value={multicultural.intro}
              as="p"
              multiline
              className="mt-7 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8"
            />
          ) : (
            <p className="mt-7 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8">
              {splitWords(tv(multicultural.intro))}
            </p>
          )}
        </div>

        {editMode ? (
          <>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
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
          <ValleyMap cards={multicultural.cards} scene={!reduced} tv={tv} t={t} />
        )}
      </Container>
    </section>
  );
}

/**
 * The Valley, with the three points of interest standing on it.
 *
 * Takes whatever height the copy above it left over (`flex-1 min-h-0`), which
 * is what keeps the section to one screen at every size. The pins are ordinary
 * buttons in the overlay — the scene only moves them to their anchors — so they
 * tab, they announce themselves, and they work identically when there is no
 * scene at all: without one (motion off, or no WebGL) they fall back to a row
 * laid out in CSS, and the section reads as a caption strip under the copy.
 */
function ValleyMap({
  cards,
  scene,
  tv,
  t,
}: {
  cards: { title: string; body: string }[];
  scene: boolean;
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

  const pins = cards.slice(0, POI_ANCHORS.length).map((c, i) => (
    <button
      key={i}
      type="button"
      data-poi={scene ? i : undefined}
      aria-expanded={open === i}
      aria-label={tv(c.title)}
      onClick={() => setOpen((cur) => (cur === i ? null : i))}
      className={`group pointer-events-auto flex items-center gap-2 ${
        scene
          ? // Placed by the scene: its left/top are written every frame, so the
            // pin is centred on its anchor rather than hanging off it.
            "absolute opacity-0 transition-opacity"
          : "relative"
      }`}
    >
      <span
        className={`relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition ${
          open === i
            ? "border-gold bg-gold"
            : "border-gold/70 bg-navy/70 group-hover:bg-gold/40 group-focus-visible:bg-gold/40"
        }`}
      >
        {/* The halo is what makes a 14px dot findable on a busy map. */}
        <span
          aria-hidden
          className={`absolute inset-[-6px] rounded-full border border-gold/30 transition ${
            open === i ? "opacity-100" : "opacity-60 group-hover:opacity-100"
          }`}
        />
      </span>
      {/* On a phone the panel is too small for three labels and a monogram to
          share; the dots carry it alone there and the title arrives with the
          copy. The button is labelled either way. */}
      <span
        className={`hidden whitespace-nowrap font-heading text-[11px] uppercase tracking-[0.18em] transition sm:inline ${
          open === i ? "text-gold" : "text-white/70 group-hover:text-white"
        } ${scene ? "" : "!inline"}`}
      >
        {tv(c.title)}
      </span>
    </button>
  ));

  return (
    <div ref={wrapRef} className="relative mt-6 flex min-h-0 flex-1 flex-col">
      {scene ? (
        <PhoenixScene className="min-h-[220px] flex-1">{pins}</PhoenixScene>
      ) : (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">{pins}</div>
      )}

      {open !== null && cards[open] && (
        <div
          role="dialog"
          aria-label={tv(cards[open].title)}
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 border border-gold/25 bg-navy-soft/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-sm sm:max-w-md"
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
