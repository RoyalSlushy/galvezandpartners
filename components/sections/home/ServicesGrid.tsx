"use client";

import { useEffect, useRef } from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { Service } from "@/content/home";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";
import { useMediaQuery } from "@/components/ui/useMediaQuery";
import { useInView } from "@/components/ui/useInView";

/**
 * "What We Can Do For YOU." — the services list, presented two ways.
 *
 * On tablet and up it is a sticky stacking deck: each card pins near the top
 * of the viewport and the next one slides over it while the covered card eases
 * back (scale + dim), so the services pile up like a hand of cards. Cards
 * taller than the viewport pin bottom-aligned instead so no copy is ever stuck
 * off-screen, and keyboard focus into a covered card scrolls it back into view.
 *
 * On phones the stack has no room to read, so the cards sweep into the column
 * instead — each one slides to center as it scrolls in, alternating from the
 * left and from the right.
 *
 * Edit mode and reduced motion render the same cards as a plain vertical list
 * (all CMS affordances intact).
 */
const TOP_BASE = 76; // px sticky offset of the first card
const TOP_STEP = 14; // px extra offset per card, so stacked edges peek out
const PHONE = "(max-width: 639px)"; // below Tailwind's `sm`

export default function ServicesGrid({
  services: serverServices,
  heading: serverHeading,
  eyebrow: serverEyebrow,
}: {
  services: Service[];
  heading: string;
  eyebrow: string;
}) {
  const services = useCmsValue("home.services", serverServices);
  const heading = useCmsValue("home.servicesHeading", serverHeading);
  const eyebrow = useCmsValue("home.worksEyebrow", serverEyebrow);
  const editMode = useEditMode();
  const reduced = usePrefersReducedMotion();
  const phone = useMediaQuery(PHONE);
  const t = useT();
  const tv = useEditableT();
  const deckRef = useRef<HTMLDivElement>(null);

  const animate = !editMode && !reduced;
  const stacked = animate && !phone;
  const sweep = animate && phone;

  // As card i+1 approaches card i's pinned position, ease card i back.
  useEffect(() => {
    if (!stacked) return;
    // The hook's first paint predates its matchMedia effect — bail sync too.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const deck = deckRef.current;
    if (!deck) return;

    const wrappers = Array.from(deck.children) as HTMLElement[];
    const tops: number[] = [];
    let raf = 0;
    let ticking = false;

    // Cards taller than the viewport pin with their bottom on-screen (top may
    // go negative) so every line stays reachable while the card is covered.
    const measure = () => {
      wrappers.forEach((wrapper, i) => {
        const card = wrapper.firstElementChild as HTMLElement | null;
        const h = card?.offsetHeight ?? 0;
        tops[i] = Math.min(TOP_BASE + i * TOP_STEP, window.innerHeight - h - 24);
        wrapper.style.top = `${tops[i]}px`;
      });
    };

    const update = () => {
      ticking = false;
      for (let i = 0; i < wrappers.length - 1; i++) {
        const card = wrappers[i].firstElementChild as HTMLElement | null;
        if (!card) continue;
        const h = card.offsetHeight;
        const nextTop = wrappers[i + 1].getBoundingClientRect().top;
        const p = Math.max(0, Math.min(1, (tops[i] + h - nextTop) / h));
        card.style.transform = `scale(${1 - p * 0.06}) translateY(${-p * 10}px)`;
        card.style.filter = `brightness(${1 - p * 0.35})`;
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(update);
      }
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    // Tabbing into a card that later cards have covered: scroll back until it
    // is uncovered so the focused control is visible (WCAG 2.4.11).
    const onFocusIn = (e: Event) => {
      const i = wrappers.findIndex((w) => w.contains(e.target as Node));
      if (i < 0 || i >= wrappers.length - 1) return;
      const card = wrappers[i].firstElementChild as HTMLElement | null;
      if (!card) return;
      const overlap = tops[i] + card.offsetHeight - wrappers[i + 1].getBoundingClientRect().top;
      if (overlap > 0) window.scrollBy(0, -overlap);
    };

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    deck.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      deck.removeEventListener("focusin", onFocusIn);
      // The static/edit-mode list reuses these nodes — clear styles React doesn't own.
      for (const wrapper of wrappers) {
        const card = wrapper.firstElementChild as HTMLElement | null;
        if (card) {
          card.style.transform = "";
          card.style.filter = "";
        }
      }
    };
  }, [stacked, services.length]);

  return (
    <section className="w-full bg-navy py-20 sm:py-28">
      <Container>
        <RevealOnScroll>
          <EditableText
            path="home.worksEyebrow"
            value={tv(eyebrow)}
            as="p"
            className="font-display text-f6 lowercase text-gold"
          />
          <EditableText
            path="home.servicesHeading"
            value={tv(heading)}
            as="h2"
            className="mt-2 font-heading text-f3 leading-none text-white"
          />
        </RevealOnScroll>

        <div
          ref={deckRef}
          className={`mt-14 flex flex-col gap-8 ${
            // Contains the off-canvas half of the sweep. Only ever set while
            // sweeping — an overflow container would kill the sticky stack.
            sweep ? "overflow-hidden" : ""
          }`}
        >
          {services.map((s, i) => (
            <DeckSlot
              key={i}
              index={i}
              stacked={stacked}
              sweep={sweep}
              top={TOP_BASE + i * TOP_STEP}
            >
              <article
                style={stacked ? { transformOrigin: "top center" } : undefined}
                className="relative overflow-hidden border border-white/10 bg-navy-soft p-8 sm:p-12"
              >
                {/* Faint sheen so stacked cards read as separate layers */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent"
                />
                {editMode && (
                  <ListControls
                    listPath="home.services"
                    index={i}
                    count={services.length}
                    label="service"
                    className="right-2 top-2"
                  />
                )}
                <div className="relative flex flex-col items-start">
                  <EditableText
                    path={`home.services.${i}.title`}
                    value={tv(s.title)}
                    as="h3"
                    className="font-heading text-f7 leading-tight text-gold"
                  />
                  <EditableText
                    path={`home.services.${i}.description`}
                    value={tv(s.description)}
                    as="p"
                    multiline
                    className="mt-4 max-w-3xl whitespace-pre-line font-body text-f9 text-white/75"
                  />
                  <Button href="/contact-us" variant="outline" className="mt-8 text-sm">
                    {t("View More")}
                  </Button>
                </div>
              </article>
            </DeckSlot>
          ))}
        </div>
        {editMode && (
          <div className="mt-8">
            <AddChip listPath="home.services" label="service" />
          </div>
        )}
      </Container>
    </section>
  );
}

/**
 * One slot in the deck. On phones it sweeps its card to center the first time
 * the slot scrolls in — odd cards from the left, even cards from the right —
 * and stays put afterwards, so scrolling back up doesn't replay it. On wider
 * screens it is the plain sticky slot the stacking effect measures and drives
 * (which reads `deck.children` and each slot's `firstElementChild`, so this
 * stays exactly one wrapper element deep in both modes).
 */
function DeckSlot({
  index,
  stacked,
  sweep,
  top,
  children,
}: {
  index: number;
  stacked: boolean;
  sweep: boolean;
  top: number;
  children: React.ReactNode;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const resting = inView || !sweep;

  return (
    <div
      ref={ref}
      className={
        sweep
          ? `transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform] ${
              resting
                ? "translate-x-0 opacity-100"
                : `opacity-0 ${index % 2 === 0 ? "-translate-x-[65%]" : "translate-x-[65%]"}`
            }`
          : stacked
            ? "sticky"
            : ""
      }
      style={stacked ? { top: `${top}px` } : undefined}
    >
      {children}
    </div>
  );
}
