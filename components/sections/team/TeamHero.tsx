"use client";

import Container from "@/components/ui/Container";
import { GlyphNumber } from "@/components/ui/Glyph";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import LanderPhotoCards from "./LanderPhotoCards";
import { resolveImage } from "@/lib/adminClient";
import { focusPosition } from "@/lib/wix";

const LANDER_PATH = "team.lander.images";

/**
 * The Our Team lander: a full-screen masthead (the viewport below the site
 * header, so header + lander together own the first screen).
 *
 * The backdrop is a single still of the office, held steady. Over it, the
 * team-together photographs are dealt out as polaroids — the same card the home
 * hero scatters through its gutters — each drifting and fading in and out on
 * its own cycle, so the gallery turns over without anything sliding or
 * crossfading underneath it. The backdrop's top edge is masked away from sm+
 * (see .team-band) so the picture dissolves into the header above it.
 *
 * All three image sets are separate — the office still, the gallery, and the
 * member portraits — so each can be chosen and cropped for its own job. With
 * none uploaded the lander still reads as designed: the heading over navy with
 * a big low-opacity letterform hugging it.
 *
 * Edit mode swaps the masthead for a plain editable block (heading, subtitle,
 * the backdrop and a thumbnail strip), since a drifting full-bleed collage is
 * no place to manage a list of images.
 */
export default function TeamHero({
  heading: serverHeading,
  subtitle: serverSubtitle,
  background: serverBackground,
  images: serverImages,
}: {
  heading: string;
  subtitle: string;
  background: string;
  images: string[];
}) {
  const heading = useCmsValue("team.heading", serverHeading);
  const subtitle = useCmsValue("team.lander.subtitle", serverSubtitle);
  const background = useCmsValue("team.lander.background", serverBackground);
  const images = useCmsValue<string[]>(LANDER_PATH, serverImages);
  const editMode = useEditMode();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode.
  const tv = (s: string) => (editMode ? s : t(s));

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
          <EditableText
            path="team.lander.subtitle"
            value={subtitle}
            as="p"
            label="lander subtitle"
            className="mt-4 max-w-2xl font-body text-lg text-white/70"
          />
          <p className="mt-8 font-din text-[10px] uppercase tracking-[0.3em] text-white/40">
            Backdrop — the office
          </p>
          <EditableImage
            path="team.lander.background"
            raw={background}
            src={resolveImage(background, 320, 200)}
            alt=""
            className="mt-3 h-32 w-48 border border-white/15 object-cover"
          />

          <p className="mt-8 font-din text-[10px] uppercase tracking-[0.3em] text-white/40">
            Gallery — the team together
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
      {background && (
        <div aria-hidden className="team-band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveImage(background, 2000, 1300)}
            alt=""
            // The CMS focal point keeps the important part of the room in view
            // under the crop (defaults to centre when unset).
            style={{ objectPosition: focusPosition(background) }}
            className="h-full w-full object-cover"
          />
          {/* Veil so the copy reads over the room, weighted to the bottom
              where it sits. */}
          <div className="absolute inset-0 bg-navy/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/45 to-transparent" />
        </div>
      )}

      <LanderPhotoCards images={images ?? []} />

      {/* The section's own navy shows through the band's faded top edge, so
          nothing else is needed to complete the hand-off to the header. */}

      <div className="relative z-10 flex h-full items-end pb-12 sm:pb-16">
        <Container>
          {/* Marked so the gallery's placement treats this block as occupied
              and never drops a polaroid over the copy. */}
          <div data-gp-lander-keepout className="relative">
            {/* Big low-opacity letterform. Anchored to the copy rather than to
                the section, so it hugs the heading — sitting behind it, its
                foot on the heading's baseline and its left edge just outside
                the text's — and travels with the copy at every width. The
                offsets are in em, so the letter keeps the same grip on the
                text as it scales. */}
            {initial && (
              <span
                aria-hidden
                className="pointer-events-none absolute -z-10 select-none font-display leading-none text-white/[0.06] bottom-[-0.12em] left-[-0.1em] text-[30vh] sm:text-[38vh] ultra:text-[46vh]"
              >
                <GlyphNumber value={initial} tintClassName="bg-white/[0.06]" />
              </span>
            )}
            <h1 className="relative font-heading text-f3 leading-none text-white [text-wrap:balance]">
              {tv(heading)}
            </h1>
            <span aria-hidden className="relative mt-5 block h-1 w-16 bg-gold" />
            {subtitle && (
              <p className="relative mt-5 max-w-xl font-body text-base leading-relaxed text-white/80 [text-wrap:pretty] sm:text-lg">
                {tv(subtitle)}
              </p>
            )}
          </div>
        </Container>
      </div>
    </section>
  );
}
