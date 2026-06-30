import type { Metadata } from "next";
import WixPage from "@/components/WixPage";
import { getPageData } from "@/lib/pages";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageData([]);
  return { title: page?.title, description: page?.description };
}

export default async function Home() {
  const page = await getPageData([]);
  if (!page) return null;
  return <WixPage html={page.html} />;
}
