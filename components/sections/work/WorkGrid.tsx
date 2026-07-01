import Link from "next/link";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { WORK, WORK_HEADING } from "@/content/work";
import { wixImage } from "@/lib/wix";

/** Portfolio grid used by /our-works and the /case-study index. */
export default function WorkGrid() {
  return (
    <section className="w-full bg-navy py-20 sm:py-28">
      <Container>
        <RevealOnScroll>
          <h1 className="font-display text-f2 lowercase text-white">{WORK_HEADING}</h1>
        </RevealOnScroll>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {WORK.map((w, i) => {
            const card = (
              <article className="group relative overflow-hidden rounded-2xl bg-navy-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wixImage(w.img, 700, 480)}
                  alt={w.title}
                  className="aspect-[7/5] w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent" />
                <h2 className="absolute inset-x-0 bottom-0 p-5 font-heading text-f8 leading-tight text-white">
                  {w.title}
                </h2>
              </article>
            );
            return (
              <RevealOnScroll key={w.title} delay={0.06 * (i % 3)}>
                {w.slug ? (
                  <Link href={`/case-study/${w.slug}`} aria-label={w.title}>
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </RevealOnScroll>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
