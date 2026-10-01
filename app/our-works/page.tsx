import type { Metadata } from "next";
import WorkShowcase from "@/components/sections/work/WorkShowcase";
import WorkGallery from "@/components/sections/work/WorkGallery";
import InstagramFeed from "@/components/sections/home/InstagramFeed";
import { getHome, getSite, getWork } from "@/lib/cms";
import { getInstagramFeed } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Work",
  description: "Selected work from Galvez & Partners — campaigns, brand, video, and design.",
};

export default async function OurWorks() {
  const [work, home, site, instagramPosts] = await Promise.all([
    getWork(),
    getHome(),
    getSite(),
    getInstagramFeed(),
  ]);
  return (
    <>
      <WorkShowcase items={work.items} heading={work.heading} />
      <WorkGallery gallery={work.gallery} />
      {/* The homepage's Instagram strip closes the gallery too — the same
          section and content (home.instagram, or the live feed), so an edit to
          either shows on both pages. */}
      <InstagramFeed
        instagram={home.instagram}
        livePosts={instagramPosts ?? undefined}
        socials={site.socials}
      />
    </>
  );
}
