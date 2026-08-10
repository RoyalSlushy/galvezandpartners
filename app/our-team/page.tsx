import type { Metadata } from "next";
import TeamHero from "@/components/sections/team/TeamHero";
import TeamGrid from "@/components/sections/team/TeamGrid";
import { getTeam } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Team",
  description: "Meet the storytellers of Galvez & Partners.",
};

export default async function OurTeam() {
  const team = await getTeam();
  return (
    <>
      {/* The heading belongs to the lander now, so the grid below runs
          straight into the member tiles. */}
      <TeamHero
        heading={team.heading}
        subtitle={team.lander?.subtitle ?? ""}
        background={team.lander?.background ?? ""}
        images={team.lander?.images ?? []}
      />
      <TeamGrid members={team.members} />
    </>
  );
}
