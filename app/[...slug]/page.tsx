import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WixPage from "@/components/WixPage";
import { getPageData, PAGES } from "@/lib/pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return PAGES.filter((p) => p.slug.length > 0).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}): Promise<Metadata> {
  const page = await getPageData(params.slug);
  return { title: page?.title, description: page?.description };
}

export default async function Page({ params }: { params: { slug: string[] } }) {
  const page = await getPageData(params.slug);
  if (!page) notFound();
  return <WixPage html={page.html} />;
}
