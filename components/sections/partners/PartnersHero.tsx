"use client";

import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { PartnersContent } from "@/lib/cms";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";

/** "Our partners" band (also used by /o). */
export default function PartnersHero({ partners: serverPartners }: { partners: PartnersContent }) {
  const partners = useCmsValue("partners", serverPartners);
  const editMode = useEditMode();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode.
  const tv = (s: string) => (editMode ? s : t(s));
  return (
    <section className="flex min-h-[70vh] w-full items-center bg-gradient-to-b from-navy to-blue-muted/40 py-24">
      <Container>
        <RevealOnScroll>
          <EditableText
            path="partners.eyebrow"
            value={tv(partners.eyebrow)}
            as="p"
            className="font-display text-f5 lowercase text-gold"
          />
          <EditableText
            path="partners.heading"
            value={tv(partners.heading)}
            as="h1"
            className="mt-4 max-w-3xl font-heading text-f3 leading-tight text-white"
          />
          <EditableText
            path="partners.body"
            value={tv(partners.body)}
            as="p"
            multiline
            className="mt-6 max-w-2xl whitespace-pre-line font-body text-f8 text-white/80"
          />
          <Button href={partners.ctaHref} className="mt-8">
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
        </RevealOnScroll>
      </Container>
    </section>
  );
}
