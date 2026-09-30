"use client";

import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import PartnerMarquee from "@/components/sections/partners/PartnerMarquee";
import type { PartnerLogo } from "@/content/partners";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";

type HomePartnersCopy = {
  eyebrow: string;
  heading: string;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * The homepage's partners band: a heading, a way on to Our Partners, and the
 * same logo lane that closes that page's lander (PartnerMarquee), under the
 * copy and bleeding a little past the body column either side, its cells a
 * little taller than that page's. The logos are the Our Partners list itself
 * (partners.logos), run here back to front so the two lanes don't open on the
 * same partners.
 * Logos are managed on Our Partners; only this band's copy is edited here.
 */
export default function HomePartners({
  copy: serverCopy,
  logos: serverLogos,
}: {
  copy: HomePartnersCopy;
  logos: PartnerLogo[];
}) {
  const copy = useCmsValue("home.partners", serverCopy);
  const logos = useCmsValue("partners.logos", serverLogos);
  const editMode = useEditMode();
  const t = useT();
  const tv = useEditableT();

  return (
    <section className="relative w-full overflow-hidden bg-navy pb-6 pt-20 sm:pb-8">
      <Container className="relative">
        <RevealOnScroll>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <EditableText
                path="home.partners.eyebrow"
                value={tv(copy.eyebrow)}
                as="p"
                className="font-display text-f6 lowercase text-gold"
              />
              <EditableText
                path="home.partners.heading"
                value={tv(copy.heading)}
                as="h2"
                className="mt-2 font-heading text-f3 leading-none text-white"
              />
            </div>
            <Button href={copy.ctaHref} variant="outline" className="shrink-0">
              {editMode ? (
                <EditableText
                  path="home.partners.ctaLabel"
                  value={copy.ctaLabel}
                  link={{ path: "home.partners.ctaHref", value: copy.ctaHref }}
                />
              ) : (
                t(copy.ctaLabel)
              )}
            </Button>
          </div>
        </RevealOnScroll>
      </Container>
      <PartnerMarquee logos={logos} reverse tall />
    </section>
  );
}
