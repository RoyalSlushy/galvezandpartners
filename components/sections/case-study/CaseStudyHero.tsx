"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useFitText from "@/components/ui/useFitText";
import { wixImage } from "@/lib/wix";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

/** How long each slide is held before crossfading to the next. */
const SLIDE_MS = 5000;
/** Cap on the number of frames pulled into the slideshow. */
const MAX_SLIDES = 8;

/**
 * Mobile case-study masthead: a full-viewport hero (it fills the screen below
 * the pinned site header, so header + hero together own the first screen) over
 * a revolving slideshow of the study's own gallery frames — each crossfades to
 * the next while drifting (Ken Burns). The foreground is deliberately spare: the
 * back link and the case title sit top-left (left-aligned); a single "Background"
 * span sits bottom-left and scrolls down to the write-up.
 *
 * Phones only (`sm:hidden`); tablet/desktop keep the classic article header. The
 * drift + auto-advance are stilled under `prefers-reduced-motion` (the first
 * frame simply holds). Shown to visitors only — edit mode keeps the plain,
 * editable header so admins can change the title.
 */
export default function CaseStudyHero({
  title,
  gallery,
  backHref,
  backLabel,
  scrollLabel,
  className = "",
}: {
  title: string;
  gallery: string[];
  backHref: string;
  backLabel: string;
  scrollLabel: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  // The title is fit to fill its box (the fitted size lives on the wrapper; the
  // h1 inherits it — Tailwind preflight sets headings to font-size:inherit), so
  // long client names shrink instead of overflowing.
  const { ref: titleRef } = useFitText<HTMLDivElement>({
    max: 62,
    min: 22,
    deps: [title],
  });

  const slides = gallery.filter(Boolean).slice(0, MAX_SLIDES);
  const [active, setActive] = useState(0);

  // Revolve through the frames; a single interval crossfades one to the next.
  useEffect(() => {
    if (reduced || slides.length <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [reduced, slides.length]);

  return (
    <section
      aria-label={title}
      style={{ height: "calc(100svh - var(--header-h))" }}
      className={`relative w-full overflow-hidden bg-navy ${className}`}
    >
      {/* Backdrop — the revolving Ken-Burns slideshow. Every frame drifts; the
          active one is faded in over the rest. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {slides.map((id, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={wixImage(id, 900, 1200)}
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
              i % 2 ? "cs-kenburns-alt" : "cs-kenburns"
            } ${i === active ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>

      {/* Legibility scrims tuned for left-anchored text: darkest down the left
          edge, with a top/bottom navy fade that seams the hero into the header
          above and the article below. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/55 to-navy/15" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-navy/70 via-transparent to-navy" />

      {/* Foreground column. */}
      <div className="relative z-10 flex h-full flex-col px-6 pb-7 pt-5">
        <div className="flex flex-col items-start gap-4 text-left">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 font-din text-xs uppercase tracking-[0.3em] text-gold transition hover:text-gold-bright"
          >
            <span aria-hidden>←</span>
            {backLabel}
          </Link>
          {/* Fixed-height box so the fit constrains both axes with slack (a tight
              line-height would otherwise overflow a content-hugging box and pin
              the fit to its minimum). The h1 inherits the fitted size and flows
              top-left. */}
          <div
            ref={titleRef}
            className="mt-1 h-[36vh] w-full overflow-hidden text-left text-f2"
          >
            <h1 className="font-display lowercase leading-[0.92] text-white [text-wrap:balance]">
              {title}
            </h1>
          </div>
        </div>

        {/* The "Background" span — bottom-left, scrolls to the write-up. */}
        <a
          href="#case-study-read"
          className="group mt-auto inline-flex items-center gap-3 self-start text-white/70 transition hover:text-gold"
        >
          <span className="font-heading text-[11px] uppercase tracking-[0.35em]">{scrollLabel}</span>
          <span aria-hidden className="cs-scroll-cue text-lg leading-none">
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}
