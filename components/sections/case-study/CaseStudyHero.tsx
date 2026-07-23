"use client";

import Link from "next/link";
import useFitText from "@/components/ui/useFitText";
import { wixImage } from "@/lib/wix";

/** How many gallery frames ride the revolving ring. */
const RING = 8;

/**
 * Mobile case-study masthead: a full-viewport hero (it fills the screen below
 * the pinned site header, so header + hero together own the first screen) built
 * in stacked layers, back to front:
 *
 *   0. a full-bleed, dimmed lead frame with a slow Ken-Burns drift;
 *   1. a ring of the case study's gallery frames slowly *revolving* around the
 *      centre — each frame counter-spins so it stays upright as it orbits;
 *   2. legibility scrims (a dark centre vignette + a top/bottom navy fade that
 *      seams the hero into the header above and the article below);
 *   3. decorative background spans — a giant ghost index numeral, an outlined
 *      ghost of the title bleeding off both edges, and a vertical "case study"
 *      eyebrow;
 *   4. the foreground column — back link, eyebrow, the title (shrunk to fit),
 *      and a scroll cue down to the write-up.
 *
 * Phones only (`sm:hidden`); tablet/desktop keep the classic article header.
 * All motion is pure CSS and stilled under `prefers-reduced-motion` (the ring
 * simply rests as a static upright arrangement). Shown to visitors only — edit
 * mode keeps the plain, editable header so admins can change the title.
 */
export default function CaseStudyHero({
  title,
  indexLabel,
  gallery,
  backHref,
  backLabel,
  eyebrow,
  scrollLabel,
  className = "",
}: {
  title: string;
  /** Zero-padded position, e.g. "01" — used as the ghost numeral. */
  indexLabel: string;
  gallery: string[];
  backHref: string;
  backLabel: string;
  eyebrow: string;
  scrollLabel: string;
  className?: string;
}) {
  // The title is fit to fill a fixed box (the fitted size lives on the wrapper;
  // the h1 inherits it — Tailwind preflight sets headings to font-size:inherit),
  // so long client names shrink to fit instead of overflowing the hero.
  const { ref: titleRef } = useFitText<HTMLDivElement>({
    max: 76,
    min: 24,
    deps: [title],
  });

  const frames = gallery.filter(Boolean);
  // Cycle the available frames up to a full ring so the orbit stays balanced
  // even for studies with only a handful of images.
  const ring =
    frames.length > 0
      ? Array.from({ length: Math.min(RING, Math.max(6, frames.length)) }, (_, i) => frames[i % frames.length])
      : [];
  const lead = frames[0];

  return (
    <section
      aria-label={title}
      style={{ ["--cs-r" as string]: "43vw", height: "calc(100svh - var(--header-h))" }}
      className={`relative w-full overflow-hidden bg-navy ${className}`}
    >
      {/* 0 — full-bleed lead frame, dimmed and slowly drifting. */}
      {lead && (
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wixImage(lead, 800, 1000)}
            alt=""
            className="cs-kenburns h-full w-full object-cover opacity-[0.22] blur-[2px]"
          />
        </div>
      )}

      {/* 1 — the revolving gallery ring. Each arm is placed on the circle
          (rotate → translate out); inside, a reverse-spin (same period) plus an
          undo-tilt keep the frame upright as it orbits, and the framed box is
          centred on the arm point with its own translate. */}
      {ring.length > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="cs-orbit-ring absolute left-1/2 top-[47%] h-0 w-0">
            {ring.map((id, i) => {
              const a = (360 / ring.length) * i;
              return (
                <div
                  key={i}
                  className="absolute left-0 top-0"
                  style={{ transform: `rotate(${a}deg) translateY(calc(-1 * var(--cs-r)))` }}
                >
                  <div className="cs-orbit-face">
                    <div style={{ transform: `rotate(${-a}deg)` }}>
                      <div className="h-[40vw] w-[32vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl opacity-80 shadow-2xl shadow-black/50 ring-1 ring-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={wixImage(id, 360, 450)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2 — legibility scrims: a soft centre vignette (keeps the title clear of
          the busy ring) plus a top/bottom navy fade that seams the hero into the
          header above and the article below. Kept gentle so the frames still
          read as a living backdrop. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(62%_46%_at_50%_47%,rgba(20,25,36,0.88),rgba(20,25,36,0.35)_68%,rgba(20,25,36,0)_100%)]"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-navy via-navy/5 to-navy" />

      {/* 3 — decorative background spans. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 select-none font-display text-[46vw] leading-none text-stroke-gold opacity-[0.08]"
      >
        {indexLabel}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 -rotate-3 select-none whitespace-nowrap text-center font-display text-[24vw] lowercase leading-none text-stroke-white opacity-[0.07]"
      >
        {title}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none font-heading text-[10px] uppercase tracking-[0.42em] text-gold/45 [writing-mode:vertical-rl]"
      >
        {eyebrow}
      </span>

      {/* 4 — foreground column. */}
      <div className="relative z-10 flex h-full flex-col px-6 pb-7 pt-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 self-start font-din text-xs uppercase tracking-[0.3em] text-gold transition hover:text-gold-bright"
        >
          <span aria-hidden>←</span>
          {backLabel}
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* Soft gold glow anchoring the title over the busy backdrop. */}
          <div className="relative flex flex-col items-center">
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 -z-10 h-[120%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(230,179,103,0.16),transparent)]"
            />
            <p className="flex items-center gap-3 font-heading text-[11px] uppercase tracking-[0.4em] text-gold/80">
              <span className="h-px w-6 bg-gold/50" />
              {eyebrow}
              <span className="h-px w-6 bg-gold/50" />
            </p>
            <div
              ref={titleRef}
              className="mt-4 flex h-[34vh] w-full items-center justify-center overflow-hidden text-f2"
            >
              <h1 className="font-display lowercase leading-[0.92] text-white [text-wrap:balance]">
                {title}
              </h1>
            </div>
          </div>
        </div>

        <a
          href="#case-study-read"
          className="group mx-auto flex flex-col items-center gap-1.5 text-white/60 transition hover:text-gold"
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
