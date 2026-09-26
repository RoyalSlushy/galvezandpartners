import type { Metadata } from "next";
import PartnersHero from "@/components/sections/partners/PartnersHero";
import PartnersDirectory from "@/components/sections/partners/PartnersDirectory";
import { getPartners } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Partners",
  description: "Where exceptional results are made — the partners of Galvez & Partners.",
};

export default async function OurPartners() {
  const partners = await getPartners();
  return (
    <>
      <PartnersHero partners={partners} />
      <PartnersDirectory partners={partners} />
    </>
  );
}
