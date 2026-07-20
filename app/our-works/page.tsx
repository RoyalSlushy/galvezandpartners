import type { Metadata } from "next";
import WorkShowcase from "@/components/sections/work/WorkShowcase";
import WorkGallery from "@/components/sections/work/WorkGallery";
import { getWork } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Work",
  description: "Selected work from Galvez & Partners — campaigns, brand, video, and design.",
};

export default async function OurWorks() {
  const work = await getWork();
  return (
    <>
      <WorkShowcase items={work.items} heading={work.heading} />
      <WorkGallery gallery={work.gallery} />
    </>
  );
}
