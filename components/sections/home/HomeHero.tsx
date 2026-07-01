import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Carousel from "@/components/ui/Carousel";
import { HERO, SERVICES } from "@/content/home";

/**
 * Homepage hero: storefront image with "We Are Storytellers." overlay, then a
 * row with the "Let's Connect" CTA (left) and the services carousel (right) on
 * desktop — stacked (carousel above CTA) on mobile. This mirrors the approved
 * CTA/carousel swap.
 */
export default function HomeHero() {
  const slides = SERVICES.map((s) => (
    <div key={s.title} className="flex h-full min-h-[240px] flex-col justify-center px-8 py-10 sm:px-12">
      <h3 className="font-heading text-f5 leading-none text-white">{s.title}</h3>
      <p className="mt-5 max-w-xl font-body text-f9 text-white/80">{s.description}</p>
    </div>
  ));

  return (
    <section className="w-full bg-gradient-to-b from-navy via-navy to-blue-muted/50 pb-16 pt-8">
      <Container wide>
        {/* Storefront image + headline */}
        <div className="relative overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO.image}
            alt="Galvez & Partners storytelling"
            className="h-[42vw] max-h-[520px] min-h-[260px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <h1 className="font-heading text-f4 leading-none text-white">{HERO.headline}</h1>
            <p className="mt-3 max-w-2xl font-body text-f9 text-white/85">{HERO.sub}</p>
          </div>
        </div>

        {/* CTA (left) + carousel (right) */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,0.5fr)_minmax(0,1.5fr)]">
          <div className="order-2 flex items-center justify-center rounded-2xl bg-gold p-8 text-center sm:order-1">
            <div>
              <p className="font-display text-f5 leading-none text-navy">Ready?</p>
              <Button href={HERO.ctaHref} variant="outline" className="mt-5 border-navy text-navy hover:bg-navy hover:text-gold">
                {HERO.ctaLabel}
              </Button>
            </div>
          </div>
          <div className="order-1 rounded-2xl bg-navy-soft py-6 sm:order-2">
            <Carousel slides={slides} ariaLabel="Our services" />
          </div>
        </div>
      </Container>
    </section>
  );
}
