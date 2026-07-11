import type { Metadata } from "next";
import WorkGrid from "@/components/sections/work/WorkGrid";
import { getWork } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Case studies from Galvez & Partners.",
};

export default async function CaseStudyIndex() {
  const work = await getWork();
  return <WorkGrid items={work.items} heading={work.heading} />;
}
