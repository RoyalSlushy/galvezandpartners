"use client";

import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Carousel from "@/components/ui/Carousel";
import CtaGrid from "@/components/sections/home/CtaGrid";
import type { Service } from "@/content/home";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls from "@/components/admin/editable/ListControls";
import { wixImage } from "@/lib/wix";

type Hero = {
  headline: string;
  sub: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * Homepage hero: fills the viewport below the header. The image ("main"), the
 * carousel card and the CTA are laid out on a responsive grid (.hero-grid).
 */
export default function HomeHero({
  hero: serverHero,
  services: serverServices,
}: {
  hero: Hero;
  services: Service[];
}) {
  const hero = useCmsValue("home.hero", serverHero);
  const services = useCmsValue("home.services", serverServices);
  const editMode = useEditMode();

  const slides = services.map((s, i) => (
    <div
      key={i}
      className={`hero-slide flex h-full flex-col justify-center px-8 py-3 sm:px-12${
        editMode ? " relative" : ""
      }`}
    >
      {editMode && (
        <ListControls
          listPath="home.services"
          index={i}
          count={services.length}
          label="service"
          className="right-8 top-2 sm:right-12"
        />
      )}
      <EditableText
        path={`home.services.${i}.title`}
        value={s.title}
        as="h3"
        className="font-display text-[2.025rem] leading-none text-sky-200"
      />
      <EditableText
        path={`home.services.${i}.description`}
        value={s.description}
        as="p"
        multiline
        className="hero-slide-body mt-3 max-w-xl whitespace-pre-line font-body text-lg leading-snug text-white/80"
      />
    </div>
  ));

  return (
    <section className="hero-breathe hero-fill flex w-full flex-col bg-gradient-to-b from-navy via-navy to-blue-muted/50 pb-4 pt-0">
      <Container className="hero-shell flex flex-1 flex-col">
        <div className="hero-grid flex-1">
          <div className="hero-main relative min-h-[280px] overflow-hidden rounded-2xl [container-type:inline-size]">
            <EditableImage
              path="home.hero.image"
              raw={hero.image}
              src={hero.image.startsWith("http") ? hero.image : wixImage(hero.image, 1280, 800)}
              alt="Galvez & Partners storytelling"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className={`absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent${
                editMode ? " pointer-events-none" : ""
              }`}
            />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
              <EditableText
                path="home.hero.headline"
                value={hero.headline}
                as="h1"
                className="font-heading text-[clamp(2rem,4.5cqi,3rem)] leading-none text-white"
              />
              <EditableText
                path="home.hero.sub"
                value={hero.sub}
                as="p"
                className="mt-3 font-body text-[clamp(0.95rem,2.6cqi,1.4rem)] text-white/85 sm:whitespace-nowrap"
              />
            </div>
          </div>

          <div className="hero-carousel hero-card relative flex min-h-0 overflow-hidden rounded-2xl bg-navy-soft py-10">
            <Carousel slides={slides} ariaLabel="Our services" className="flex w-full flex-col justify-center" />
          </div>

          <div className="hero-cta relative flex min-h-0 items-center justify-center overflow-hidden rounded-2xl bg-gold p-6 text-center">
            <CtaGrid />
            <div className="relative z-10">
              <p className="font-display text-f6 leading-none text-navy">Ready?</p>
              <Button href={hero.ctaHref} variant="gold" className="mt-4 border-2 border-navy hover:bg-navy hover:text-gold">
                {editMode ? (
                  <EditableText
                    path="home.hero.ctaLabel"
                    value={hero.ctaLabel}
                    link={{ path: "home.hero.ctaHref", value: hero.ctaHref }}
                  />
                ) : (
                  hero.ctaLabel
                )}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
