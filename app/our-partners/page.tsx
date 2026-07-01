import type { Metadata } from "next";
import PartnersHero from "@/components/sections/partners/PartnersHero";

export const metadata: Metadata = {
  title: "Our Partners",
  description: "Where exceptional results are made — the partners of Galvez & Partners.",
};

export default function OurPartners() {
  return <PartnersHero />;
}
