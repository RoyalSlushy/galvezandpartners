import type { Metadata } from "next";
import PartnersHero from "@/components/sections/partners/PartnersHero";
import { getPartners } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Partners",
  description: "Where exceptional results are made — the partners of Galvez & Partners.",
};

/** The original site exposed this placeholder at /o as well. */
export default async function OPage() {
  const partners = await getPartners();
  return <PartnersHero partners={partners} />;
}
