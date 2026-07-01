import type { Metadata } from "next";
import WorkGrid from "@/components/sections/work/WorkGrid";

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Case studies from Galvez & Partners.",
};

export default function CaseStudyIndex() {
  return <WorkGrid />;
}
