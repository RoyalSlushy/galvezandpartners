import type { Metadata } from "next";
import PartnersHero from "@/components/sections/partners/PartnersHero";

export const metadata: Metadata = {
  title: "Our Partners",
  description: "Where exceptional results are made — the partners of Galvez & Partners.",
};

/** The original site exposed this placeholder at /o as well. */
export default function OPage() {
  return <PartnersHero />;
}
