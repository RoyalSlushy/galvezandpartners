"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useFitText from "@/components/ui/useFitText";
import { GlyphNumber } from "@/components/ui/Glyph";
import { focusPosition, wixImage } from "@/lib/wix";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

/** How long each slide is held before crossfading to the next. */
const SLIDE_MS = 5000;
/** Cap on the number of frames pulled into the slideshow. */
const MAX_SLIDES = 8;

/**
 * Mobile case-study masthead: a full-viewport hero (it fills the screen below
 * the pinned site header, so header + hero together own the first screen) over
 * a revolving slideshow of the study's own gallery frames — each crossfades to
 * the next while drifting (Ken Burns). A giant, low-opacity glyph of the case's
 * initial sits behind the copy (the uploaded letterform where one exists, the
 * display font otherwise). The foreground is left-anchored: the back link and
 * title sit top-left; the background write-up sits bottom-left, so the first
 * screen already tells the story.
 *
 * Phones only (`sm:hidden`); tablet/desktop keep the classic article header. The
 * drift + auto-advance are stilled under `prefers-reduced-motion` (the first
 * frame simply holds). Shown to visitors only — edit mode keeps the plain,
 * editable header + write-up so admins can change them.
 */
export default function CaseStudyHero({
  title,
  background,
  gallery,
  backHref,
  backLabel,
  className = "",
}: {
  title: string;
  background: string;
  gallery: string[];
  backHref: string;
  backLabel: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  // The title is fit to fill a fixed box (the fitted size lives on the wrapper;
  // the h1 inherits it — Tailwind preflight sets headings to font-size:inherit),
  // so long client names shrink instead of overflowing.
  const { ref: titleRef } = useFitText<HTMLDivElement>({
    max: 58,
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

  const initial = (title.trim()[0] ?? "").toUpperCase();

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
            // The CMS focal point keeps the important part of the frame in view
            // under this very tall crop (defaults to centre when unset).
            style={{ objectPosition: focusPosition(id) }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
              i % 2 ? "cs-kenburns-alt" : "cs-kenburns"
            } ${i === active ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>

      {/* Legibility scrims tuned for left-anchored text: darkest down the left
          edge, with a top/bottom navy fade that seams the hero into the header
          above and the article below. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/55 to-navy/20" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-navy/70 via-transparent to-navy" />

      {/* Giant, low-opacity initial (uploaded glyph where one exists, else the
          display-font letter) bleeding off the right edge behind the copy. */}
      {initial && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[7vw] top-1/2 -translate-y-1/2 select-none font-display text-[66vh] leading-none text-white/[0.07]"
        >
          <GlyphNumber value={initial} tintClassName="bg-white/[0.07]" />
        </span>
      )}

      {/* Foreground column — title top-left, write-up bottom-left. */}
      <div className="relative z-10 flex h-full flex-col px-6 pb-8 pt-5">
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
              the fit to its minimum). The h1 inherits the fitted size. */}
          <div
            ref={titleRef}
            className="mt-1 h-[30vh] w-full overflow-hidden text-left text-f2"
          >
            <h1 className="font-display lowercase leading-[0.92] text-white [text-wrap:balance]">
              {title}
            </h1>
          </div>
        </div>

        {/* Background write-up, bottom-left. Its right edge is kept clear of the
            floating nav icon (a w-12 / 3rem circle inset right-4 / 1rem — see
            MobileMenu) via the right padding, and clamped so it can never
            overrun the hero. */}
        <p className="mt-auto max-w-md pr-14 font-body text-sm leading-relaxed text-white/85 line-clamp-6">
          {background}
        </p>
      </div>
    </section>
  );
}
