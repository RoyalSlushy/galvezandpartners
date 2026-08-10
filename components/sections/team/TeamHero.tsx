"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import { GlyphNumber } from "@/components/ui/Glyph";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { resolveImage } from "@/lib/adminClient";
import { focusPosition } from "@/lib/wix";

/** How long each frame is held before crossfading to the next. */
const SLIDE_MS = 5000;
/** Cap on the number of frames pulled into the slideshow. */
const MAX_SLIDES = 8;

const LANDER_PATH = "team.lander.images";

/**
 * The Our Team lander: a full-screen masthead (the viewport below the site
 * header, so header + lander together own the first screen) over a revolving
 * slideshow of the team-together photographs, each crossfading to the next
 * while drifting — the same Ken Burns treatment as the case-study mastheads,
 * reusing their keyframes.
 *
 * The lander's photographs are their own set (team.lander.images), separate
 * from the member portraits, so the two can be chosen and cropped for very
 * different jobs. With none uploaded the lander still reads as designed: the
 * heading over navy with a big low-opacity letterform behind it.
 *
 * Drift and auto-advance are stilled under `prefers-reduced-motion` — the
 * first frame simply holds. Edit mode swaps the masthead for a plain editable
 * block (heading plus a thumbnail strip), the same trade the case-study
 * masthead makes, since a cross-fading full-bleed slideshow is no place to
 * manage a list of images.
 */
export default function TeamHero({
  heading: serverHeading,
  images: serverImages,
}: {
  heading: string;
  images: string[];
}) {
  const heading = useCmsValue("team.heading", serverHeading);
  const images = useCmsValue<string[]>(LANDER_PATH, serverImages);
  const editMode = useEditMode();
  const t = useT();
  const reduced = usePrefersReducedMotion();
  // Admins edit the English source, so translation is suppressed in edit mode.
  const tv = (s: string) => (editMode ? s : t(s));

  const slides = (images ?? []).filter(Boolean).slice(0, MAX_SLIDES);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced || slides.length <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [reduced, slides.length]);

  // Keep the active frame in range if images are removed while editing.
  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);

  if (editMode) {
    return (
      <section className="w-full bg-navy pb-12 pt-10">
        <Container>
          <EditableText
            path="team.heading"
            value={heading}
            as="h1"
            className="font-heading text-f3 leading-none text-white"
          />
          <p className="mt-6 font-din text-[10px] uppercase tracking-[0.3em] text-white/40">
            Lander images — the team together
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            {(images ?? []).map((img, i) => (
              <div key={i} className="relative">
                <ListControls
                  listPath={LANDER_PATH}
                  index={i}
                  count={images.length}
                  label="lander image"
                />
                <EditableImage
                  path={`${LANDER_PATH}.${i}`}
                  raw={img}
                  src={resolveImage(img, 240, 160)}
                  alt=""
                  className="h-24 w-36 border border-white/15 object-cover"
                />
              </div>
            ))}
            <AddChip listPath={LANDER_PATH} label="lander image" />
          </div>
        </Container>
      </section>
    );
  }

  const initial = (heading.trim()[0] ?? "").toUpperCase();

  return (
    <section
      aria-label={tv(heading)}
      style={{ height: "calc(100svh - var(--header-h))" }}
      className="relative w-full overflow-hidden bg-navy"
    >
      {slides.length > 0 && (
        <div aria-hidden className="absolute inset-0">
          {slides.map((raw, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
                i === active ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className={`h-full w-full ${i % 2 ? "cs-kenburns-alt" : "cs-kenburns"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImage(raw, 1800, 1200)}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  // The CMS focal point keeps the important part of the frame in
                  // view under the crop (defaults to centre when unset).
                  style={{ objectPosition: focusPosition(raw) }}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ))}
          {/* Veil so the heading reads over any frame, weighted to the bottom
              where the copy sits. */}
          <div className="absolute inset-0 bg-navy/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
        </div>
      )}

      {/* Big low-opacity letterform, bleeding off the bottom-left behind the
          copy — carries the lander on its own when no photographs are set. */}
      {initial && (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-[18vh] -left-[3vw] select-none font-display text-[46vh] leading-none text-white/[0.06] sm:text-[56vh]"
        >
          <GlyphNumber value={initial} tintClassName="bg-white/[0.06]" />
        </span>
      )}

      <div className="relative z-10 flex h-full items-end pb-12 sm:pb-16">
        <Container>
          <h1 className="font-heading text-f3 leading-none text-white [text-wrap:balance]">
            {tv(heading)}
          </h1>
          <span aria-hidden className="mt-5 block h-1 w-16 bg-gold" />
        </Container>
      </div>
    </section>
  );
}
