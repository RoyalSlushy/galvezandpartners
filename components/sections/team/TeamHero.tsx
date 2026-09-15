"use client";

import Container from "@/components/ui/Container";
import { GlyphNumber } from "@/components/ui/Glyph";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import LanderPhotoTrail from "./LanderPhotoTrail";
import LanderPhotoCards from "./LanderPhotoCards";
import { useMinWidth } from "@/components/ui/useMinWidth";
import { resolveImage } from "@/lib/adminClient";
import { focusPosition } from "@/lib/wix";
import { useRevealPhase } from "@/components/motion/useRevealPhase";

const LANDER_PATH = "team.lander.images";

/**
 * The Our Team lander: a full-screen masthead (the viewport below the site
 * header, so header + lander together own the first screen).
 *
 * The backdrop is a single still of the office, held steady. Over it — and under
 * the copy, always — go the team-together photographs, as polaroids: on a
 * pointer they follow the cursor, laid down one after another as it crosses the
 * lander and sinking away behind it; on a phone, where there is no cursor to
 * follow, they are dealt out into the clear space instead and left to drift and
 * fade on their own. The backdrop's top edge is masked away from sm+ (see
 * .team-band) so the picture dissolves into the header above it.
 *
 * All three image sets are separate — the office still, the gallery, and the
 * member portraits — so each can be chosen and cropped for its own job. With
 * none uploaded the lander still reads as designed: the heading over navy with
 * a big low-opacity letterform hugging it.
 *
 * Edit mode swaps the masthead for a plain editable block (heading, subtitle,
 * the backdrop and a thumbnail strip), since a full-bleed masthead is no place
 * to manage a list of images.
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
  const tv = useEditableT();
  const phase = useRevealPhase();
  // A trail needs a cursor to follow, and a phone has none — a drag paints one,
  // but nothing at all is shown to a visitor who only scrolls. Below the
  // breakpoint the photographs are dealt out and left to drift instead, which
  // asks nothing of the visitor. 751px is `sm`, where the copy grows too.
  const hasCursor = useMinWidth(751);

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
      data-gp-hero={phase ?? undefined}
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
          {/* Knocks the room back so it reads as a backdrop rather than a
              picture in its own right. */}
          <div className="absolute inset-0 bg-navy/45" />
        </div>
      )}

      {/* Zero-height marker giving the dealt gallery the span of the body
          column, so a photograph's centre never strays out into the gutter. It
          rides in the same Container the copy does, so it tracks the --site-max
          tiers and the responsive gutters without restating them. Declared
          before the gallery so it is in the DOM when the cards measure. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
        <Container>
          <div data-gp-lander-bounds className="h-0" />
        </Container>
      </div>

      {hasCursor ? (
        <LanderPhotoTrail images={images ?? []} />
      ) : (
        <LanderPhotoCards images={images ?? []} />
      )}

      {/* Veil over the trail and the room alike, weighted to the bottom where
          the copy sits: the photographs pass behind the heading, and this is
          what keeps the heading readable while they do. Above the trail rather
          than inside the band, so it works whether or not a backdrop has been
          uploaded. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-navy via-navy/55 to-transparent"
      />

      {/* The section's own navy shows through the band's faded top edge, so
          nothing else is needed to complete the hand-off to the header. */}

      <div className="relative z-10 flex h-full items-end pb-12 sm:pb-16">
        <Container>
          {/* Marked so the dealt gallery treats this block as occupied and never
              drops a polaroid over the copy. The trail has no such rule — it
              goes where the cursor goes, and passes behind the copy instead. */}
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
            {/* The landing beat: the name climbs out from behind its own edge,
                the rule draws outward from its middle, then the line under it
                arrives. */}
            <div data-hero-line className="relative overflow-hidden">
              <h1 className="font-heading text-f3 leading-none text-white [text-wrap:balance]">
                {tv(heading)}
              </h1>
            </div>
            <span
              aria-hidden
              data-hero-open
              style={{ ["--d" as string]: "260ms" }}
              className="relative mt-5 block h-1 w-16 bg-gold"
            />
            {subtitle && (
              <p
                data-hero-rise
                style={{ ["--d" as string]: "400ms" }}
                className="relative mt-5 max-w-xl font-body text-base leading-relaxed text-white/80 [text-wrap:pretty] sm:text-lg"
              >
                {tv(subtitle)}
              </p>
            )}
          </div>
        </Container>
      </div>
    </section>
  );
}
