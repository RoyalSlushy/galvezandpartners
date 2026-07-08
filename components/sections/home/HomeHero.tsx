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
    <section className="hero-breathe hero-fill flex w-full flex-col bg-gradient-to-b from-navy via-navy to-blue-muted/50 pb-0 pt-0 sm:pb-4">
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

          {/* Mobile CTA: a single full-width gold pill between the image and the
              carousel card. Swapped for the "Ready?" card at the sm breakpoint. */}
          <div className="hero-cta sm:hidden">
            <Button
              href={hero.ctaHref}
              variant="gold"
              className="w-full py-4 text-2xl font-bold normal-case"
            >
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

          <div className="hero-cta relative hidden min-h-0 items-center justify-center overflow-hidden rounded-2xl bg-gold p-6 text-center sm:flex">
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

      <HeroSkyline />
    </section>
  );
}

/**
 * Mobile-only hero footer: a downtown skyline silhouette (two depth layers)
 * over a warm sunset glow, bleeding to the full viewport width.
 */
function HeroSkyline() {
  return (
    <div aria-hidden className="relative mt-8 sm:hidden">
      {/* Sunset glow the buildings sit against — blue sky up top, ramping into a
          bright cream horizon behind the rooftops. */}
      <div className="absolute inset-x-0 bottom-0 h-full bg-[linear-gradient(to_bottom,transparent_0%,rgba(243,216,176,0.2)_40%,rgba(248,232,198,0.8)_72%,#fdf2d6_100%)]" />
      <svg
        viewBox="0 0 750 260"
        preserveAspectRatio="xMidYMax meet"
        className="relative block w-full"
      >
        {/* Back row: taller, hazier buildings. */}
        <g fill="#4d608a" opacity="0.7">
          <rect x="20" y="100" width="36" height="160" />
          <rect x="95" y="60" width="30" height="200" />
          <rect x="108" y="34" width="4" height="26" />
          <rect x="170" y="110" width="40" height="150" />
          <rect x="280" y="50" width="32" height="210" />
          <rect x="294" y="24" width="4" height="26" />
          <rect x="360" y="95" width="38" height="165" />
          <rect x="470" y="70" width="30" height="190" />
          <rect x="545" y="105" width="42" height="155" />
          <rect x="655" y="55" width="34" height="205" />
          <rect x="670" y="30" width="4" height="25" />
        </g>
        {/* Front row: shorter, darker buildings with sunset gaps between them. */}
        <g fill="#2c3550">
          <rect x="0" y="170" width="55" height="90" />
          <rect x="70" y="145" width="50" height="115" />
          <rect x="140" y="185" width="55" height="75" />
          <rect x="215" y="155" width="48" height="105" />
          <rect x="290" y="195" width="60" height="65" />
          <rect x="370" y="165" width="50" height="95" />
          <rect x="440" y="140" width="45" height="120" />
          <rect x="505" y="185" width="55" height="75" />
          <rect x="580" y="158" width="48" height="102" />
          <rect x="648" y="190" width="55" height="70" />
          <rect x="715" y="150" width="35" height="110" />
        </g>
      </svg>
    </div>
  );
}
