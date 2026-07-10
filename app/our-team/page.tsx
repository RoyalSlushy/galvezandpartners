import type { Metadata } from "next";
import TeamGrid from "@/components/sections/team/TeamGrid";
import { getTeam, getSite } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Team",
  description: "Meet the storytellers of Galvez & Partners.",
};

export default async function OurTeam() {
  const [team, site] = await Promise.all([getTeam(), getSite()]);
  return (
    <TeamGrid members={team.members} heading={team.heading} socials={site.socials} />
  );
}
