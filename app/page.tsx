import HomeHero from "@/components/sections/home/HomeHero";
import Cityscape from "@/components/sections/home/Cityscape";
import WordMarquee from "@/components/sections/home/WordMarquee";
import ServicesGrid from "@/components/sections/home/ServicesGrid";
import MulticulturalReveal from "@/components/sections/home/MulticulturalReveal";
import FeaturedWork from "@/components/sections/home/FeaturedWork";
import InstagramFeed from "@/components/sections/home/InstagramFeed";
import { getHome, getWork } from "@/lib/cms";
import { getInstagramFeed } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [home, work, instagramPosts] = await Promise.all([
    getHome(),
    getWork(),
    getInstagramFeed(),
  ]);
  return (
    <>
      <HomeHero hero={home.hero} services={home.services} />
      {/* Everything below the hero rises up and over it as you scroll (the hero
          is pinned). This block sits above the hero (z-10) with the cityscape
          skyline as its leading border and an opaque base so the hero is
          covered as the content climbs. */}
      <div className="relative z-10">
        <Cityscape />
        <div className="bg-navy">
          <WordMarquee words={home.marqueeWords} />
          <MulticulturalReveal multicultural={home.multicultural} />
          <FeaturedWork featured={home.featuredWork} items={work.items} />
          <ServicesGrid
            services={home.services}
            heading={home.servicesHeading}
            eyebrow={home.worksEyebrow}
          />
          <InstagramFeed instagram={home.instagram} livePosts={instagramPosts ?? undefined} />
        </div>
      </div>
    </>
  );
}
