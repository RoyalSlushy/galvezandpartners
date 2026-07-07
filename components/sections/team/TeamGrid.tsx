import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { Member } from "@/content/team";
import { wixImage } from "@/lib/wix";

/** "Meet Our Storytellers" team grid. */
export default function TeamGrid({
  members,
  heading,
}: {
  members: Member[];
  heading: string;
}) {
  return (
    <section className="w-full bg-navy py-20 sm:py-28">
      <Container>
        <RevealOnScroll>
          <h1 className="font-heading text-f3 leading-none text-white">{heading}</h1>
        </RevealOnScroll>

        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <RevealOnScroll key={`${m.name}-${i}`} delay={0.05 * (i % 4)}>
              <figure className="text-center">
                <div className="overflow-hidden rounded-2xl bg-navy-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.photo.startsWith("http") ? m.photo : wixImage(m.photo, 400, 480)}
                    alt={m.name}
                    className="aspect-[5/6] w-full object-cover"
                  />
                </div>
                <figcaption className="mt-4">
                  <span className="block font-heading text-f9 text-white">{m.name}</span>
                  <span className="mt-1 block font-din text-sm uppercase tracking-wide text-gold">
                    {m.role}
                  </span>
                </figcaption>
              </figure>
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
