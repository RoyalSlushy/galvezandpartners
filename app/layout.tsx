import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSite } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: {
      default: `${site.site.name} | ${site.site.brand}`,
      template: `%s | ${site.site.name}`,
    },
    description: site.site.description,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSite();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Header
          nav={site.nav}
          socials={site.socials}
          tagline={site.tagline}
        />
        <main className="flex-1">{children}</main>
        <Footer
          nav={site.nav}
          socials={site.socials}
          contact={site.contact}
          footer={site.footer}
          tagline={site.tagline}
        />
      </body>
    </html>
  );
}
