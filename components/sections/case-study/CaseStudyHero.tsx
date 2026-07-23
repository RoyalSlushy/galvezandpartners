"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlyphNumber } from "@/components/ui/Glyph";
import { focusPosition, wixImage } from "@/lib/wix";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

/** How long each slide is held before crossfading to the next. */
const SLIDE_MS = 5000;
/** Cap on the number of frames pulled into the slideshow. */
const MAX_SLIDES = 8;

/**
 * Case-study masthead, every width: a full-viewport hero (it fills the screen
 * below the site header, so header + hero together own the first screen) over
 * a revolving slideshow of the study's own gallery frames — each crossfades to
 * the next while drifting (Ken Burns). A low-opacity glyph of the case's
 * initial (the uploaded letterform where one exists, the display font
 * otherwise) sits behind the copy. The band and layout adapt per breakpoint
 * (see .cs-band):
 *
 * - Phones: the band spans the top 60%, its top/bottom edges fading into the
 *   navy; the glyph bleeds off the top-right; the copy is bottom-anchored.
 * - sm+: the band docks to the RIGHT at full hero height and fades out toward
 *   the left, leaving clean navy under the left-anchored copy; the glyph
 *   bleeds off the bottom-left behind the text.
 *
 * The copy is the same lockup everywhere: back link up top, then title
 * (heading face) over a short thick gold rule over the background write-up,
 * with a "gallery" scroll cue leading to the image wall below. Drift +
 * auto-advance are stilled under `prefers-reduced-motion` (the first frame
 * simply holds). Shown to visitors only — edit mode keeps the plain, editable
 * header + write-up so admins can change them.
 */
export default function CaseStudyHero({
  title,
  background,
  gallery,
  backHref,
  backLabel,
  scrollLabel,
  className = "",
}: {
  title: string;
  background: string;
  gallery: string[];
  backHref: string;
  backLabel: string;
  scrollLabel: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();

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
      {/* Backdrop band — geometry + edge fade per breakpoint live in .cs-band. */}
      <div aria-hidden className="cs-band">
        {slides.map((id, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={wixImage(id, 1200, 1200)}
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
            // The CMS focal point keeps the important part of the frame in view
            // under the crop (defaults to centre when unset).
            style={{ objectPosition: focusPosition(id) }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
              i % 2 ? "cs-kenburns-alt" : "cs-kenburns"
            } ${i === active ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        {/* Gentle veil so the gold copy reads over any frame; phones add a
            heavier top scrim under the back link. */}
        <div className="absolute inset-0 bg-navy/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-transparent to-transparent sm:hidden" />
      </div>

      {/* Low-opacity initial behind the copy: bleeding off the top-right on
          phones, off the bottom-left (under the text column) on sm+. */}
      {initial && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[7vw] top-[2vh] select-none font-display text-[52.8vh] leading-none text-white/[0.07] sm:-bottom-[6vh] sm:-left-[3vw] sm:right-auto sm:top-auto sm:text-[56vh]"
        >
          <GlyphNumber value={initial} tintClassName="bg-white/[0.07]" />
        </span>
      )}

      {/* Foreground column (site width on sm+) — back link up top; title over
          rule over write-up anchored at the bottom, with the gallery cue below. */}
      <div className="relative z-10 mx-auto flex h-full max-w-site flex-col px-6 pb-6 pt-5 sm:px-8 sm:pb-12 sm:pt-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 self-start font-din text-xs uppercase tracking-[0.3em] text-gold transition hover:text-gold-bright"
        >
          <span aria-hidden>←</span>
          {backLabel}
        </Link>

        <div className="mt-auto">
          <h1 className="max-w-md font-heading text-[2rem] leading-[1.1] text-white [text-wrap:balance] sm:max-w-2xl sm:text-f4 sm:leading-[1.05]">
            {title}
          </h1>
          <span aria-hidden className="mt-3 block h-1 w-12 bg-gold sm:mt-5 sm:w-16" />
          {/* On phones, kept clear of the floating nav icon (a w-12 / 3rem
              square inset right-4 / 1rem — see MobileMenu) via the right
              padding, and clamped so it can never overrun the hero. */}
          <p className="mt-3 max-w-md pr-14 font-body text-sm leading-relaxed text-white/85 line-clamp-5 sm:mt-5 sm:max-w-xl sm:pr-0 sm:text-base">
            {background}
          </p>
          <a
            href="#case-study-gallery"
            className="group mt-5 inline-flex items-center gap-3 text-white/70 transition hover:text-gold sm:mt-8"
          >
            <span className="font-heading text-[11px] uppercase tracking-[0.35em]">
              {scrollLabel}
            </span>
            <span aria-hidden className="cs-scroll-cue text-lg leading-none">
              ↓
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
