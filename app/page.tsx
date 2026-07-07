import HomeHero from "@/components/sections/home/HomeHero";
import ServicesGrid from "@/components/sections/home/ServicesGrid";
import MulticulturalReveal from "@/components/sections/home/MulticulturalReveal";
import { getHome } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function Home() {
  const home = await getHome();
  return (
    <>
      <HomeHero hero={home.hero} services={home.services} />
      <ServicesGrid
        services={home.services}
        heading={home.servicesHeading}
        eyebrow={home.worksEyebrow}
      />
      <MulticulturalReveal multicultural={home.multicultural} />
    </>
  );
}
