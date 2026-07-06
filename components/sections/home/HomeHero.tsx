import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Carousel from "@/components/ui/Carousel";
import { HERO, SERVICES } from "@/content/home";

/**
 * Homepage hero: fills the viewport below the header. On desktop the carousel/CTA
 * row is capped by a max-height and the storefront image flex-grows to fill the
 * rest; on mobile the image sits above the carousel-then-CTA stack and the section
 * grows with its content.
 */
export default function HomeHero() {
  const slides = SERVICES.map((s) => (
    <div key={s.title} className="hero-slide flex h-full flex-col justify-center px-8 py-3 sm:px-12">
      <h3 className="font-display text-[2.025rem] leading-none text-sky-200">{s.title}</h3>
      <p className="hero-slide-body mt-3 max-w-xl font-body text-lg leading-snug text-white/80">{s.description}</p>
    </div>
  ));

  return (
    <section className="hero-breathe hero-fill flex w-full flex-col bg-gradient-to-b from-navy via-navy to-blue-muted/50 pb-4 pt-0">
      <Container className="flex flex-1 flex-col">
        {/* Storefront image + headline — flex-grows to fill the height the capped
            carousel/CTA row leaves. container-type lets the overlay text scale with
            the image width (cqi), not the viewport. */}
        <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-2xl [container-type:inline-size]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO.image}
            alt="Galvez & Partners storytelling"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <h1 className="font-heading text-[clamp(2rem,4.5cqi,3rem)] leading-none text-white">{HERO.headline}</h1>
            <p className="mt-3 font-body text-[clamp(0.95rem,2.6cqi,1.4rem)] text-white/85 sm:whitespace-nowrap">{HERO.sub}</p>
          </div>
        </div>

        {/* Carousel (left) + CTA (right) on desktop; carousel above CTA on mobile */}
        <div className="mt-8 grid shrink-0 grid-cols-1 gap-6 sm:max-h-[340px] sm:grid-cols-[minmax(0,1.5fr)_minmax(0,0.5fr)]">
          <div className="hero-card flex overflow-hidden rounded-2xl bg-navy-soft py-6">
            <Carousel slides={slides} ariaLabel="Our services" className="flex w-full flex-col justify-center" />
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
