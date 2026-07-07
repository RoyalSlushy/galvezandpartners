import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";

type Multicultural = {
  titleLines: string[];
  intro: string;
  cards: { title: string; body: string }[];
};

/**
 * "the multi-cultural / Agency doing / big things" band with a 3-card row.
 */
export default function MulticulturalReveal({
  multicultural,
}: {
  multicultural: Multicultural;
}) {
  return (
    <section className="w-full bg-gradient-to-b from-blue-muted/60 via-navy to-navy py-24 sm:py-32">
      <Container>
        <RevealOnScroll>
          <h2 className="font-display leading-[0.95] text-white">
            {multicultural.titleLines.map((line, i) => (
              <span
                key={line}
                className={`block text-f2 ${i === 0 ? "lowercase" : ""} ${
                  i === multicultural.titleLines.length - 1 ? "text-gold" : ""
                }`}
              >
                {line}
              </span>
            ))}
          </h2>
          <p className="mt-6 max-w-2xl font-body text-f8 text-white/80">{multicultural.intro}</p>
        </RevealOnScroll>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {multicultural.cards.map((c, i) => (
            <RevealOnScroll key={c.title} delay={0.09 * (i + 1)}>
              <article className="h-full rounded-2xl border border-white/10 bg-navy-soft/60 p-8">
                <h3 className="font-heading text-f7 lowercase text-gold">{c.title}</h3>
                <p className="mt-4 font-body text-f9 text-white/75">{c.body}</p>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
