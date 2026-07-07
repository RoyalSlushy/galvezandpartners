import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CaseStudyBody from "@/components/sections/case-study/CaseStudyBody";
import { getCaseStudies } from "@/lib/cms";

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
  const index = studies.findIndex((c) => c.slug === params.slug);
  if (index < 0) notFound();

  return <CaseStudyBody index={index} study={studies[index]} />;
}
