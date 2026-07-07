import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Carousel from "@/components/ui/Carousel";
import CtaGrid from "@/components/sections/home/CtaGrid";
import type { Service } from "@/content/home";

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
  hero,
  services,
}: {
  hero: Hero;
  services: Service[];
}) {
  const slides = services.map((s) => (
    <div key={s.title} className="hero-slide flex h-full flex-col justify-center px-8 py-3 sm:px-12">
      <h3 className="font-display text-[2.025rem] leading-none text-sky-200">{s.title}</h3>
      <p className="hero-slide-body mt-3 max-w-xl font-body text-lg leading-snug text-white/80">{s.description}</p>
    </div>
  ));

  return (
    <section className="hero-breathe hero-fill flex w-full flex-col bg-gradient-to-b from-navy via-navy to-blue-muted/50 pb-4 pt-0">
      <Container className="hero-shell flex flex-1 flex-col">
        <div className="hero-grid flex-1">
          <div className="hero-main relative min-h-[280px] overflow-hidden rounded-2xl [container-type:inline-size]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.image}
              alt="Galvez & Partners storytelling"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
              <h1 className="font-heading text-[clamp(2rem,4.5cqi,3rem)] leading-none text-white">{hero.headline}</h1>
              <p className="mt-3 font-body text-[clamp(0.95rem,2.6cqi,1.4rem)] text-white/85 sm:whitespace-nowrap">{hero.sub}</p>
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
                {hero.ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
