"use client";

import { useEffect, useRef } from "react";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableLines from "@/components/admin/editable/EditableLines";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

type Multicultural = {
  titleLines: string[];
  intro: string;
  cards: { title: string; body: string }[];
};

/**
 * "the multi-cultural / Agency doing / big things" manifesto. The title and
 * intro are split into words that ink-fill one by one as the block travels up
 * the viewport (scroll-linked, runs both directions); the 3-card row gets a
 * cursor-tracked gold spotlight. Edit mode falls back to the plain editable
 * block so the CMS behaves exactly as before; reduced motion (and no-JS —
 * the dimming only arms once the effect runs) renders every word lit.
 */
export default function MulticulturalReveal({
  multicultural: serverMulticultural,
}: {
  multicultural: Multicultural;
}) {
  const multicultural = useCmsValue("home.multicultural", serverMulticultural);
  const editMode = useEditMode();
  const reduced = usePrefersReducedMotion();
  const t = useT();
  const tv = useEditableT();
  const fillRef = useRef<HTMLDivElement>(null);

  // Scroll-linked word fill: p=0 when the block's top enters at 90% of the
  // viewport, p=1 once its bottom clears ~45%. Words toggle a data-lit
  // attribute directly (no React re-render per frame).
  useEffect(() => {
    if (editMode || reduced) return;
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
  }, [editMode, reduced, multicultural.titleLines, multicultural.intro, t]);

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
    <section className="relative flex min-h-viewport w-full items-center overflow-hidden bg-gradient-to-b from-blue-muted/60 via-navy to-navy py-16 sm:py-24">
      {/* Soft gold glow anchoring the manifesto */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-10 h-[480px] w-[480px] bg-gold/[0.07] blur-3xl"
      />
      <Container className="relative">
        <div ref={fillRef} className="wordfill">
          {editMode ? (
            <EditableLines
              path="home.multicultural.titleLines"
              values={multicultural.titleLines}
              as="h2"
              className="font-display leading-[0.95] text-white"
              lineClassName={(_, i, all) =>
                `block text-f2 ${i === 0 ? "lowercase" : ""} ${
                  i === all.length - 1 ? "text-gold" : ""
                }`
              }
              editingClassName="text-f2"
              label="title lines"
            />
          ) : (
            <h2 className="font-display leading-[0.95] text-white">
              {multicultural.titleLines.map((line, i, all) =>
                i === all.length - 1 ? (
                  // Payoff line, set edge to edge across the column.
                  <FitLine key={i} className="block text-f2 text-gold" refit={tv(line)}>
                    {splitWords(tv(line))}
                  </FitLine>
                ) : (
                  <span key={i} className={`block text-f2 ${i === 0 ? "lowercase" : ""}`}>
                    {splitWords(tv(line))}
                  </span>
                ),
              )}
            </h2>
          )}
          {editMode ? (
            <EditableText
              path="home.multicultural.intro"
              value={multicultural.intro}
              as="p"
              multiline
              className="mt-6 max-w-2xl whitespace-pre-line font-body text-f8 text-white/80"
            />
          ) : (
            <p className="mt-6 max-w-2xl whitespace-pre-line font-body text-f8 text-white/80">
              {splitWords(tv(multicultural.intro))}
            </p>
          )}
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {multicultural.cards.map((c, i) => (
            <RevealOnScroll key={i} delay={0.09 * (i + 1)} className="h-full">
              <SpotlightCard index={i} count={multicultural.cards.length} card={c} editMode={editMode} tv={tv} />
            </RevealOnScroll>
          ))}
        </div>
        {editMode && (
          <div className="mt-8">
            <AddChip listPath="home.multicultural.cards" label="card" />
          </div>
        )}
      </Container>
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

/** Card with a gold spotlight that follows the cursor. */
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
