"use client";

import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import type { PartnersContent } from "@/lib/cms";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import { useRevealPhase } from "@/components/motion/useRevealPhase";

/**
 * "Our partners" band (also used by /o) — the whole page, so this is its
 * landing section. It sits above the fold at load, where a scroll reveal only
 * ever fires immediately; it makes the page's entrance instead, timed to the
 * load veil like every other landing section (see useRevealPhase): eyebrow,
 * heading and body arrive in turn and the CTA opens out of its own middle.
 */
export default function PartnersHero({ partners: serverPartners }: { partners: PartnersContent }) {
  const partners = useCmsValue("partners", serverPartners);
  const editMode = useEditMode();
  const t = useT();
  const tv = useEditableT();
  const phase = useRevealPhase();
  return (
    <section
      data-gp-hero={phase ?? undefined}
      className="flex min-h-[70vh] w-full items-center bg-gradient-to-b from-navy to-blue-muted/40 py-24"
    >
      <Container>
        <div data-hero-rise style={{ ["--d" as string]: "0ms" }}>
          <EditableText
            path="partners.eyebrow"
            value={tv(partners.eyebrow)}
            as="p"
            className="font-display text-f5 lowercase text-gold"
          />
        </div>
        {/* The clip is what the heading climbs out from. */}
        <div data-hero-line style={{ ["--d" as string]: "150ms" }} className="mt-4 overflow-hidden">
          <EditableText
            path="partners.heading"
            value={tv(partners.heading)}
            as="h1"
            className="block max-w-3xl font-heading text-f3 leading-tight text-white"
          />
        </div>
        <div data-hero-rise style={{ ["--d" as string]: "320ms" }}>
          <EditableText
            path="partners.body"
            value={tv(partners.body)}
            as="p"
            multiline
            className="mt-6 max-w-2xl whitespace-pre-line font-body text-f8 text-white/80"
          />
        </div>
        <span data-hero-open style={{ ["--d" as string]: "500ms" }} className="mt-8 inline-block">
          <Button href={partners.ctaHref}>
            {editMode ? (
              <EditableText
                path="partners.ctaLabel"
                value={partners.ctaLabel}
                link={{ path: "partners.ctaHref", value: partners.ctaHref }}
              />
            ) : (
              t(partners.ctaLabel)
            )}
          </Button>
        </span>
      </Container>
    </section>
  );
}
