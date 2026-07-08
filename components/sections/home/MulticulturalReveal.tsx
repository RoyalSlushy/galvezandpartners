"use client";

import { useEffect, useRef } from "react";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
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
  }, [editMode, reduced, multicultural.titleLines, multicultural.intro]);

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
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-blue-muted/60 via-navy to-navy py-24 sm:py-32">
      {/* Soft gold glow anchoring the manifesto */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-10 h-[480px] w-[480px] rounded-full bg-gold/[0.07] blur-3xl"
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
              {multicultural.titleLines.map((line, i, all) => (
                <span
                  key={i}
                  className={`block text-f2 ${i === 0 ? "lowercase" : ""} ${
                    i === all.length - 1 ? "text-gold" : ""
                  }`}
                >
                  {splitWords(line)}
                </span>
              ))}
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
              {splitWords(multicultural.intro)}
            </p>
          )}
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {multicultural.cards.map((c, i) => (
            <RevealOnScroll key={i} delay={0.09 * (i + 1)} className="h-full">
              <SpotlightCard index={i} count={multicultural.cards.length} card={c} editMode={editMode} />
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

/** Card with a gold spotlight that follows the cursor and a ghost numeral. */
function SpotlightCard({
  index,
  count,
  card,
  editMode,
}: {
  index: number;
  count: number;
  card: { title: string; body: string };
  editMode: boolean;
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
      className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-navy-soft/60 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/40"
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
      {/* Ghost numeral */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 -top-6 font-display text-[7rem] leading-none text-white/[0.045] transition-colors duration-300 group-hover:text-gold/10"
      >
        0{index + 1}
      </span>
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
          value={card.title}
          as="h3"
          className="font-heading text-f7 lowercase text-gold"
        />
        <EditableText
          path={`home.multicultural.cards.${index}.body`}
          value={card.body}
          as="p"
          multiline
          className="mt-4 whitespace-pre-line font-body text-f9 text-white/75"
        />
      </div>
    </article>
  );
}
