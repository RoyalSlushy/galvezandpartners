import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";

/** "Our partners" placeholder band (also used by /o). */
export default function PartnersHero() {
  return (
    <section className="flex min-h-[70vh] w-full items-center bg-gradient-to-b from-navy to-blue-muted/40 py-24">
      <Container>
        <RevealOnScroll>
          <p className="font-display text-f5 lowercase text-gold">our partners</p>
          <h1 className="mt-4 max-w-3xl font-heading text-f3 leading-tight text-white">
            Where exceptional results are made.
          </h1>
          <p className="mt-6 max-w-2xl font-body text-f8 text-white/80">
            We partner with ambitious brands to tell stories that move people and drive results.
          </p>
          <Button href="/contact-us" className="mt-8">
            Connect With Us
          </Button>
        </RevealOnScroll>
      </Container>
    </section>
  );
}
