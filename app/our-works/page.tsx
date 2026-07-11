import type { Metadata } from "next";
import WorkGrid from "@/components/sections/work/WorkGrid";
import { getWork } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Work",
  description: "Selected work from Galvez & Partners — campaigns, brand, video, and design.",
};

export default async function OurWorks() {
  const work = await getWork();
  return <WorkGrid items={work.items} heading={work.heading} />;
}
