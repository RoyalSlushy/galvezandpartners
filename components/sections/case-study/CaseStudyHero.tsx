"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlyphNumber } from "@/components/ui/Glyph";
import { focusPosition, wixImage, wixImageFit } from "@/lib/wix";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { useRevealPhase } from "@/components/motion/useRevealPhase";

/** How long each slide is held before crossfading to the next. */
const SLIDE_MS = 5000;
/** Cap on the number of frames pulled into the slideshow. */
const MAX_SLIDES = 8;
/** Frames wider than this (w/h) get collaged instead of brute-cropped. */
const WIDE = 16 / 9 + 0.01;

/** The 1–3 frames collaged under a wide slide: the next frames in gallery
 * order (wrapping, never the slide itself), as many as bring the block close
 * to a square — the wide frame keeps its own strip, so the leftover height
 * divided into n near-square cells gives n ≈ 1 / (1 − 1/aspect). */
function pickCompanions(all: string[], i: number, aspect: number): string[] {
  const n = Math.min(3, Math.max(1, Math.round(1 / (1 - 1 / aspect))));
  const out: string[] = [];
  for (let k = 1; k < all.length && out.length < n; k++) out.push(all[(i + k) % all.length]);
  return out;
}

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
  const reduced = useMotionOff();
  const phase = useRevealPhase();

  const slides = gallery.filter(Boolean).slice(0, MAX_SLIDES);
  const [active, setActive] = useState(0);

  // Revolve through the frames; a single interval crossfades one to the next.
  useEffect(() => {
    if (reduced || slides.length <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [reduced, slides.length]);

  // Natural aspect (w/h) per frame, probed client-side from a small fit (no
  // crop) render. Frames wider than 16:9 would lose everything to the band's
  // tall crop, so those slides swap to a collage: the wide frame keeps a strip
  // at its own aspect with 1–3 other case frames beneath, approximating a
  // square block.
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const slidesKey = slides.join("|");
  useEffect(() => {
    let alive = true;
    for (const id of slides) {
      if (aspects[id]) continue;
      const probe = new window.Image();
      probe.onload = () => {
        if (!alive || !probe.naturalWidth || !probe.naturalHeight) return;
        setAspects((a) =>
          a[id] ? a : { ...a, [id]: probe.naturalWidth / probe.naturalHeight },
        );
      };
      probe.src = wixImageFit(id, 200, 200);
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slidesKey]);

  // The hero and the gallery wall are gentle scroll-snap stops while this
  // masthead is mounted (see html[data-gp-case-snap] in globals.css).
  useEffect(() => {
    document.documentElement.setAttribute("data-gp-case-snap", "");
    return () => document.documentElement.removeAttribute("data-gp-case-snap");
  }, []);

  const initial = (title.trim()[0] ?? "").toUpperCase();

  return (
    <section
      data-gp-hero={phase ?? undefined}
      id="case-hero"
      aria-label={title}
      style={{ height: "calc(100svh - var(--header-h))" }}
      className={`relative w-full snap-start scroll-mt-[var(--header-h)] overflow-hidden bg-navy ${className}`}
    >
      {/* Backdrop band — geometry + edge fade per breakpoint live in .cs-band. */}
      <div aria-hidden className="cs-band">
        {slides.map((id, i) => {
          const aspect = aspects[id];
          const companions =
            aspect && aspect > WIDE ? pickCompanions(slides, i, aspect) : [];
          const collage = companions.length > 0 && aspect ? aspect : null;
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
                i === active ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className={`h-full w-full ${i % 2 ? "cs-kenburns-alt" : "cs-kenburns"}`}>
                {collage ? (
                  // Wide frame: a collage block — the frame's own strip up top
                  // (row share = its height within a square of its width), the
                  // companions splitting the leftover beneath.
                  <div
                    className="grid h-full w-full gap-1"
                    style={{
                      gridTemplateRows: `${(1 / collage).toFixed(3)}fr ${(1 - 1 / collage).toFixed(3)}fr`,
                      gridTemplateColumns: `repeat(${companions.length}, 1fr)`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={wixImage(id, 1200, Math.max(200, Math.round(1200 / collage)))}
                      alt=""
                      loading={i === 0 ? "eager" : "lazy"}
                      style={{ objectPosition: focusPosition(id), gridColumn: "1 / -1" }}
                      className="h-full w-full object-cover"
                    />
                    {companions.map((cid, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={j}
                        src={wixImage(cid, 600, 600)}
                        alt=""
                        loading="lazy"
                        style={{ objectPosition: focusPosition(cid) }}
                        className="h-full w-full object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={wixImage(id, 1200, 1200)}
                    alt=""
                    loading={i === 0 ? "eager" : "lazy"}
                    // The CMS focal point keeps the important part of the frame
                    // in view under the crop (defaults to centre when unset).
                    style={{ objectPosition: focusPosition(id) }}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>
          );
        })}
        {/* Gentle veil so the gold copy reads over any frame; phones add a
            heavier top scrim under the back link. */}
        <div className="absolute inset-0 bg-navy/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-transparent to-transparent sm:hidden" />
      </div>

      {/* Low-opacity initial behind the copy: bleeding off the top-right on
          phones; on sm+ it sits bottom-left with 40% of its own height (0.4 ×
          56vh = 22.4vh) hanging past the hero's bottom edge — clipped by the
          section's overflow-hidden where the body continues. */}
      {initial && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[7vw] top-[2vh] select-none font-display text-[52.8vh] leading-none text-white/[0.07] sm:-bottom-[22.4vh] sm:-left-[3vw] sm:right-auto sm:top-auto sm:text-[56vh]"
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
          {/* The study's landing beat, over the (already drifting) backdrop:
              the title climbs out from behind its own edge, the rule draws out
              from its middle, then the background copy and the scroll cue
              arrive. */}
          <div data-hero-line className="overflow-hidden">
            <h1 className="max-w-md font-heading text-[2rem] leading-[1.1] text-white [text-wrap:balance] sm:max-w-2xl sm:text-f4 sm:leading-[1.05]">
              {title}
            </h1>
          </div>
          <span
            aria-hidden
            data-hero-open
            style={{ ["--d" as string]: "240ms" }}
            className="mt-3 block h-1 w-12 bg-gold sm:mt-5 sm:w-16"
          />
          {/* On phones, kept clear of the floating nav icon (a w-12 / 3rem
              square inset right-4 / 1rem — see MobileMenu) via the right
              padding, and clamped so it can never overrun the hero. */}
          <p
            data-hero-rise
            style={{ ["--d" as string]: "380ms" }}
            className="mt-3 max-w-md pr-14 font-body text-sm leading-relaxed text-white/85 line-clamp-5 sm:mt-5 sm:max-w-xl sm:pr-0 sm:text-base"
          >
            {background}
          </p>
          <a
            href="#case-study-gallery"
            data-hero-rise
            style={{ ["--d" as string]: "560ms" }}
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
