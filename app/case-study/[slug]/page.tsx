import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { getCaseStudies } from "@/lib/cms";
import { wixImage } from "@/lib/wix";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { studies } = await getCaseStudies();
  const cs = studies.find((c) => c.slug === params.slug);
  return {
    title: cs ? cs.title : "Case Study",
    description: cs?.background,
  };
}

export default async function CaseStudyPage({ params }: { params: { slug: string } }) {
  const { studies } = await getCaseStudies();
  const cs = studies.find((c) => c.slug === params.slug);
  if (!cs) notFound();

  return (
    <article className="w-full bg-navy">
      <header className="border-b border-white/10 py-20 sm:py-28">
        <Container>
          <Link href="/our-works" className="font-din text-sm uppercase tracking-widest text-gold hover:underline">
            ← Our Work
          </Link>
          <h1 className="mt-4 font-heading text-f2 leading-none text-white">{cs.title}</h1>
        </Container>
      </header>

      <section className="py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-f6 uppercase tracking-wide text-gold">Background</h2>
          <p className="mt-4 max-w-3xl font-body text-f8 text-white/80">{cs.background}</p>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2">
            {cs.gallery.map((id, i) => (
              <RevealOnScroll key={`${id}-${i}`} delay={0.05 * (i % 2)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={id.startsWith("http") ? id : wixImage(id, 900, 620)}
                  alt={`${cs.title} — image ${i + 1}`}
                  className="w-full rounded-2xl object-cover"
                />
              </RevealOnScroll>
            ))}
          </div>
        </Container>
      </section>
    </article>
  );
}
