import type { Metadata } from "next";
import TeamGrid from "@/components/sections/team/TeamGrid";

export const metadata: Metadata = {
  title: "Our Team",
  description: "Meet the storytellers of Galvez & Partners.",
};

export default function OurTeam() {
  return <TeamGrid />;
}
