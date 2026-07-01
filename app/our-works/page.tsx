import type { Metadata } from "next";
import WorkGrid from "@/components/sections/work/WorkGrid";

export const metadata: Metadata = {
  title: "Our Work",
  description: "Selected work from Galvez & Partners — campaigns, brand, video, and design.",
};

export default function OurWorks() {
  return <WorkGrid />;
}
