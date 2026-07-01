import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Carousel from "@/components/ui/Carousel";
import { HERO, SERVICES } from "@/content/home";

/**
 * Homepage hero: fills the viewport below the header. On desktop the storefront
 * image and the carousel/CTA row split that height in a 2:1 ratio (see the
 * .hero-image / .hero-row calc rules in globals.css); on mobile the image sits
 * above the carousel-then-CTA stack and the section grows with its content.
 */
export default function HomeHero() {
  const slides = SERVICES.map((s) => (
    <div key={s.title} className="flex flex-col justify-center px-8 pb-6 pt-3 sm:px-12">
      <h3 className="font-heading text-f6 leading-none text-white">{s.title}</h3>
      <p className="mt-3 max-w-xl font-body text-lg leading-snug text-white/80">{s.description}</p>
    </div>
  ));

  return (
    <section className="hero-fill flex w-full flex-col bg-gradient-to-b from-navy via-navy to-blue-muted/50 pb-16 pt-0">
      <Container className="flex flex-1 flex-col">
        {/* Storefront image + headline — 2x the height of the carousel/CTA row on desktop */}
        <div className="hero-image relative min-h-[280px] flex-1 overflow-hidden rounded-2xl sm:flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO.image}
            alt="Galvez & Partners storytelling"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <h1 className="font-heading text-f4 leading-none text-white">{HERO.headline}</h1>
            <p className="mt-3 max-w-2xl font-body text-f9 text-white/85">{HERO.sub}</p>
          </div>
        </div>

        {/* Carousel (left) + CTA (right) on desktop; carousel above CTA on mobile */}
        <div className="hero-row mt-8 grid grid-cols-1 gap-6 sm:shrink-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,0.5fr)]">
          <div className="flex items-center overflow-hidden rounded-2xl bg-navy-soft py-2">
            <Carousel slides={slides} ariaLabel="Our services" className="w-full" />
          </div>
          <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-gold p-6 text-center">
            <div>
              <p className="font-display text-f6 leading-none text-navy">Ready?</p>
              <Button href={HERO.ctaHref} variant="outline" className="mt-4 border-navy text-navy hover:bg-navy hover:text-gold">
                {HERO.ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
