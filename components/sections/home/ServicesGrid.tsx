"use client";

import { useEffect, useRef, useState } from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { Service } from "@/content/home";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { resolveImage } from "@/lib/adminClient";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
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

  // Index of the card sitting most centrally in the viewport — the only one
  // whose backdrop clip is allowed to run (see CardBackdrop). null when the
  // deck is off-screen entirely.
  const [centered, setCentered] = useState<number | null>(null);
  const hasMedia = services.some((s) => s.media);

  useEffect(() => {
    if (!animate || !hasMedia) return;
    const deck = deckRef.current;
    if (!deck) return;

    let raf = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      const mid = window.innerHeight / 2;
      let best: number | null = null;
      // Ranked on two keys: cards crossing the middle of the viewport beat
      // cards that don't (a card taller than the screen has its own center
      // off-screen, and the sticky stack overlaps cards, so "nearest center"
      // alone picks the wrong one), then nearest to the middle.
      let bestCrosses = false;
      let bestDist = Infinity;

      Array.from(deck.children).forEach((el, i) => {
        if (!services[i]?.media) return;
        const r = el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= window.innerHeight) return;
        const crosses = r.top <= mid && r.bottom >= mid;
        const dist = crosses
          ? Math.abs((r.top + r.bottom) / 2 - mid)
          : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (best === null || (crosses && !bestCrosses) || (crosses === bestCrosses && dist < bestDist)) {
          best = i;
          bestCrosses = crosses;
          bestDist = dist;
        }
      });
      setCentered((prev) => (prev === best ? prev : best));
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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [animate, hasMedia, services]);

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
                {/* Same decorative backdrop the service's hero carousel slide
                    carries (one CMS field, `home.services.N.media`), so a clip
                    set once shows up in both places. */}
                {s.media ? (
                  <CardBackdrop index={i} media={s.media} active={centered === i} />
                ) : null}
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
                <div className="relative z-[1] flex flex-col items-start">
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
                </div>
              </article>
            </DeckSlot>
          ))}
        </div>
        {/* One CTA for the whole deck, in place of the per-card buttons. Sits
            outside the deck so the sticky stack never covers it. */}
        <RevealOnScroll className="mt-14 flex justify-center">
          <Button href="/our-works" variant="outline" className="text-sm">
            {t("View More")}
          </Button>
        </RevealOnScroll>
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
 * The service's decorative backdrop, treated exactly as the hero carousel
 * treats it: tilted 15° counter-clockwise at 10% opacity, with the media
 * collapsed to a single gold-family hue (grayscale → invert → sepia) so its
 * white background turns black and the screen blend drops it out, leaving only
 * the artwork glowing. The blend is kept local by `isolate` and composited
 * against a stand-in painted in the card's own color, which gives the same
 * result as blending onto the card itself. The tilted layer bleeds past the
 * card; the card's overflow-hidden masks it.
 *
 * Only the card sitting most centrally in the viewport plays, and only with
 * motion allowed — so at most one clip runs at a time and cards waiting
 * elsewhere in the deck aren't decoding video. Playback is never cut off
 * mid-pass: once the card loses the center the clip simply stops looping and
 * runs to its end, then rests on the first frame.
 */
function CardBackdrop({ index, media, active }: { index: number; media: string; active: boolean }) {
  const reduced = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Rewind once a pass finishes. Only reached after the card loses the center,
  // since an active clip loops instead of ending.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => {
      v.pause();
      v.currentTime = 0;
    };
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, [media]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && !reduced) {
      v.loop = true;
      v.play().catch(() => {});
      return;
    }
    // Stop looping but let the current pass finish — `ended` above rests it
    // back on the first frame.
    v.loop = false;
  }, [active, reduced]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-[-18%] right-[-8%] z-0 w-[62%] -rotate-[15deg] opacity-10 sm:inset-y-[-24%] sm:right-4 sm:w-auto sm:aspect-[4/5]"
    >
      <div className="relative isolate h-full w-full">
        <div className="absolute inset-0 bg-navy-soft" />
        <EditableImage
          path={`home.services.${index}.media`}
          raw={media}
          src={resolveImage(media, 700, 900)}
          alt=""
          className="relative h-full w-full object-cover mix-blend-screen [filter:grayscale(1)_invert(1)_sepia(1)_saturate(5)_hue-rotate(-12deg)] sm:object-contain"
          playbackRate={0.75}
          autoPlayVideo={false}
          // Looping is driven imperatively above, not by the element's attribute.
          loopVideo={false}
          videoRef={videoRef}
        />
      </div>
    </div>
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
