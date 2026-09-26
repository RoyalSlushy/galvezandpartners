"use client";

import Container from "@/components/ui/Container";
import { GlyphNumber } from "@/components/ui/Glyph";
import type { PartnersContent } from "@/lib/cms";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import PartnerMarquee from "./PartnerMarquee";
import { resolveImage } from "@/lib/adminClient";
import { focusPosition } from "@/lib/wix";
import { useRevealPhase } from "@/components/motion/useRevealPhase";

/**
 * The Our Partners lander (also used by /o) — the whole page, built on the same
 * frame as the Our Team lander: a full-screen masthead (the viewport below the
 * site header), a single still held steady behind a navy veil weighted to the
 * bottom, and the copy anchored low with a big low-opacity letterform hugging
 * the heading. The backdrop's top edge is masked away from sm+ (see .team-band)
 * so it dissolves into the header above it. With no backdrop uploaded it still
 * reads as designed over plain navy.
 *
 * Under the copy runs the partner logos: one full-bleed lane drifting sideways
 * — leftward on sm+, rightward on a phone (see PartnerMarquee) — standing in
 * the site's glyphs until logos are added. There is no CTA; the logos close the
 * lander.
 *
 * It makes the page's entrance, timed to the load veil like every other landing
 * section (see useRevealPhase): the heading climbs out from behind its own edge,
 * the rule draws outward from its middle, then the body arrives.
 *
 * Edit mode swaps the masthead for a plain editable block, as the team lander
 * does, so the backdrop and the logos can be managed without chasing them
 * through a moving marquee.
 */

const LOGOS_PATH = "partners.logos";
export default function PartnersHero({ partners: serverPartners }: { partners: PartnersContent }) {
  const partners = useCmsValue("partners", serverPartners);
  const editMode = useEditMode();
  const tv = useEditableT();
  const phase = useRevealPhase();
  const background = partners.background ?? "";
  const logos = partners.logos ?? [];

  if (editMode) {
    return (
      <section className="w-full bg-navy pb-12 pt-10">
        <Container>
          <EditableText
            path="partners.eyebrow"
            value={partners.eyebrow}
            as="p"
            className="font-din text-xs uppercase tracking-[0.3em] text-gold"
          />
          <EditableText
            path="partners.heading"
            value={partners.heading}
            as="h1"
            className="mt-3 block max-w-3xl font-heading text-f3 leading-none text-white"
          />
          <EditableText
            path="partners.body"
            value={partners.body}
            as="p"
            multiline
            className="mt-4 max-w-2xl whitespace-pre-line font-body text-lg text-white/70"
          />
          <p className="mt-8 font-din text-[10px] uppercase tracking-[0.3em] text-white/40">
            Backdrop
          </p>
          <EditableImage
            path="partners.background"
            raw={background}
            src={resolveImage(background, 320, 200)}
            alt=""
            className="mt-3 h-32 w-48 border border-white/15 object-cover"
          />

          <p className="mt-8 font-din text-[10px] uppercase tracking-[0.3em] text-white/40">
            Partner logos — the marquee runs the site&rsquo;s glyphs until there are some
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            {logos.map((logo, i) => (
              <div key={i} className="relative w-40">
                <ListControls listPath={LOGOS_PATH} index={i} count={logos.length} label="partner logo" />
                <EditableImage
                  path={`${LOGOS_PATH}.${i}.img`}
                  raw={logo.img}
                  src={resolveImage(logo.img, 320, 160)}
                  alt={logo.name}
                  className="h-20 w-40 border border-white/15 bg-white/[0.03] object-contain p-3"
                />
                <EditableText
                  path={`${LOGOS_PATH}.${i}.name`}
                  value={logo.name}
                  as="p"
                  className="mt-1.5 block truncate font-body text-xs text-white/70"
                />
              </div>
            ))}
            <AddChip listPath={LOGOS_PATH} label="partner logo" />
          </div>
        </Container>
      </section>
    );
  }

  const heading = tv(partners.heading);
  const initial = (partners.heading.trim()[0] ?? "").toUpperCase();

  return (
    <section
      aria-label={heading}
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
            style={{ objectPosition: focusPosition(background) }}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-navy/45" />
        </div>
      )}

      {/* Veil weighted to the bottom where the copy sits. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-navy via-navy/55 to-transparent"
      />

      <div className="relative z-10 flex h-full flex-col justify-end pb-20 sm:pb-16">
        <Container>
          <div className="relative">
            {/* Big low-opacity letterform, anchored to the copy as on the team
                lander: its foot on the heading's baseline, its left edge just
                outside the text's. */}
            {initial && (
              <span
                aria-hidden
                className="pointer-events-none absolute -z-10 select-none font-display leading-none text-white/[0.06] bottom-[-0.12em] left-[-0.1em] text-[30vh] sm:text-[38vh] ultra:text-[46vh]"
              >
                <GlyphNumber value={initial} tintClassName="bg-white/[0.06]" />
              </span>
            )}
            {partners.eyebrow && (
              <p
                data-hero-rise
                style={{ ["--d" as string]: "0ms" }}
                className="relative mb-4 font-din text-xs uppercase tracking-[0.3em] text-gold"
              >
                {tv(partners.eyebrow)}
              </p>
            )}
            <div data-hero-line className="relative overflow-hidden">
              <h1 className="max-w-4xl font-heading text-f3 leading-none text-white [text-wrap:balance]">
                {heading}
              </h1>
            </div>
            <span
              aria-hidden
              data-hero-open
              style={{ ["--d" as string]: "260ms" }}
              className="relative mt-5 block h-1 w-16 bg-gold"
            />
            {partners.body && (
              <p
                data-hero-rise
                style={{ ["--d" as string]: "400ms" }}
                className="relative mt-5 max-w-xl whitespace-pre-line font-body text-base leading-relaxed text-white/80 [text-wrap:pretty] sm:text-lg"
              >
                {tv(partners.body)}
              </p>
            )}
          </div>
        </Container>
        <PartnerMarquee logos={logos} />
      </div>
    </section>
  );
}
