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
          is pinned). This block sits above the hero (z-10), capped by the
          cityscape skyline so the skyline rises together with the section. The
          negative top margin pulls the block up by one cityscape band so, at
          rest, the skyline overlaps the hero's bare bottom band — its buildings
          stand against the hero gradient with no panel behind them — then an
          opaque base covers the hero as the content climbs. */}
      <div className="relative z-10 mt-[calc(-1*var(--cityscape-h))]">
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
