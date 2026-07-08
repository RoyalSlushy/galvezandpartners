import HomeHero from "@/components/sections/home/HomeHero";
import WordMarquee from "@/components/sections/home/WordMarquee";
import ServicesGrid from "@/components/sections/home/ServicesGrid";
import MulticulturalReveal from "@/components/sections/home/MulticulturalReveal";
import FeaturedWork from "@/components/sections/home/FeaturedWork";
import InstagramFeed from "@/components/sections/home/InstagramFeed";
import { getHome, getWork } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [home, work] = await Promise.all([getHome(), getWork()]);
  return (
    <>
      <HomeHero hero={home.hero} services={home.services} />
      <WordMarquee words={home.marqueeWords} />
      <MulticulturalReveal multicultural={home.multicultural} />
      <FeaturedWork featured={home.featuredWork} items={work.items} />
      <ServicesGrid
        services={home.services}
        heading={home.servicesHeading}
        eyebrow={home.worksEyebrow}
      />
      <InstagramFeed instagram={home.instagram} />
    </>
  );
}
