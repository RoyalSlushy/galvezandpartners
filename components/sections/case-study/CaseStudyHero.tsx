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

/** Vertical fade masking the backdrop band's top/bottom edges into the navy. */
const BAND_FADE =
  "linear-gradient(to bottom, transparent 0%, #000 16%, #000 78%, transparent 100%)";

/**
 * Mobile case-study masthead: a full-viewport hero (it fills the screen below
 * the pinned site header, so header + hero together own the first screen).
 * The top ~60% is a revolving slideshow of the study's own gallery frames —
 * each crossfades to the next while drifting (Ken Burns) — its top and bottom
 * edges fading into the navy. A low-opacity glyph of the case's initial sits at
 * the top-right (the uploaded letterform where one exists, the display font
 * otherwise). The copy is bottom-anchored: the title (heading face) sits on top
 * of the background write-up with a short thick gold rule between them, and a
 * "gallery" scroll cue leads to the image wall below.
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
      {/* Backdrop band — the revolving Ken-Burns slideshow across the top 60%
          of the hero, its vertical edges masked so the frames dissolve into the
          navy above and below. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] overflow-hidden"
        style={{ WebkitMaskImage: BAND_FADE, maskImage: BAND_FADE }}
      >
        {slides.map((id, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={wixImage(id, 900, 1200)}
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
        {/* Gentle veil (heavier up top, under the back link) so the gold copy
            reads over any frame. */}
        <div className="absolute inset-0 bg-navy/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-transparent to-transparent" />
      </div>

      {/* Low-opacity initial (uploaded glyph where one exists, else the display
          font), top-right, bleeding off the edge behind the copy. */}
      {initial && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[7vw] top-[2vh] select-none font-display text-[52.8vh] leading-none text-white/[0.07]"
        >
          <GlyphNumber value={initial} tintClassName="bg-white/[0.07]" />
        </span>
      )}

      {/* Foreground column — back link up top; title over rule over write-up
          anchored at the bottom, with the gallery cue below. */}
      <div className="relative z-10 flex h-full flex-col px-6 pb-6 pt-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 self-start font-din text-xs uppercase tracking-[0.3em] text-gold transition hover:text-gold-bright"
        >
          <span aria-hidden>←</span>
          {backLabel}
        </Link>

        <div className="mt-auto">
          <h1 className="max-w-md font-heading text-[2rem] leading-[1.1] text-white [text-wrap:balance]">
            {title}
          </h1>
          <span aria-hidden className="mt-3 block h-1 w-12 bg-gold" />
          {/* Kept clear of the floating nav icon (a w-12 / 3rem circle inset
              right-4 / 1rem — see MobileMenu) via the right padding, and
              clamped so it can never overrun the hero. */}
          <p className="mt-3 max-w-md pr-14 font-body text-sm leading-relaxed text-white/85 line-clamp-5">
            {background}
          </p>
          <a
            href="#case-study-gallery"
            className="group mt-5 inline-flex items-center gap-3 text-white/70 transition hover:text-gold"
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
