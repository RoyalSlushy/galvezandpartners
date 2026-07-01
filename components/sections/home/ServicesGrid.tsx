import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { SERVICES, SERVICES_HEADING, WORKS_EYEBROW } from "@/content/home";

/** "the works" eyebrow + "What We Can Do For YOU." services grid with View More. */
export default function ServicesGrid() {
  return (
    <section className="w-full bg-navy py-20 sm:py-28">
      <Container>
        <RevealOnScroll>
          <p className="font-display text-f6 lowercase text-gold">{WORKS_EYEBROW}</p>
          <h2 className="mt-2 font-heading text-f3 leading-none text-white">{SERVICES_HEADING}</h2>
        </RevealOnScroll>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <RevealOnScroll key={s.title} delay={0.08 * (i % 3)}>
              <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-navy-soft p-8">
                <h3 className="font-heading text-f7 leading-tight text-gold">{s.title}</h3>
                <p className="mt-4 flex-1 font-body text-f9 text-white/75">{s.description}</p>
                <Button href="/contact-us" variant="outline" className="mt-6 self-start text-sm">
                  View More
                </Button>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
