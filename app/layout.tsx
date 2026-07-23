import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AdminProvider from "@/components/admin/AdminProvider";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import { GlyphProvider } from "@/components/ui/Glyph";
import PageReveal from "@/components/ui/PageReveal";
import ScrollToTopOnHome from "@/components/ScrollToTopOnHome";
import { getSite, getHome } from "@/lib/cms";
import { getTheme, themeCssVars } from "@/lib/themes";
import { heroTopColor, heroBorderGradientCss } from "@/lib/heroGradient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: {
      default: `${site.site.name} | ${site.site.brand}`,
      template: `%s | ${site.site.name}`,
    },
    description: site.site.description,
    // Brand favicon — a gold "&" tile (public/favicon.svg). The page-load veil
    // (PageReveal) breathes this same mark while a page's first-viewport assets
    // load, so the loader and the browser tab share one icon.
    icons: { icon: "/favicon.svg" },
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
  const [site, home] = await Promise.all([getSite(), getHome()]);
  const theme = getTheme(site.theme);
  // The homepage header is painted with the hero's top color (see Header.tsx) so
  // the two share one seamless surface. The hero gradient uses literal colors,
  // so this is exposed as a variable rather than derived from the theme tokens.
  const heroTop = heroTopColor(home.hero.gradient);
  // The inner-page header's animated accent stroke draws from the same hero
  // gradient stops (the mobile header image's color picker), exposed as a
  // variable so the header (rendered here in the layout) can use it.
  const headerBorderGrad = heroBorderGradientCss(home.hero.gradient);
  return (
    <html lang="en" data-gp-theme={theme.id}>
      <body
        className="flex min-h-screen flex-col"
        style={{
          ["--hero-top-color" as string]: heroTop,
          ["--header-border-grad" as string]: headerBorderGrad,
        }}
      >
        {/* Active theme, applied server-side so anonymous visitors never see a
            flash of the default palette. `:root:root` outranks the defaults in
            globals.css; the admin editor previews other themes by setting the
            same variables inline on <html>. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root:root{${themeCssVars(theme)}}`,
          }}
        />
        {/* Pages reveal only once their first-viewport images have loaded (the
            veil ships covering the page). Without JS the veil could never
            clear, so noscript visitors skip it entirely. */}
        <noscript>
          <style>{`[data-gp-veil]{display:none}`}</style>
        </noscript>
        <PageReveal />
        <ScrollToTopOnHome />
        <LocaleProvider>
          <AdminProvider>
            <GlyphProvider glyphs={site.glyphs}>
              <Header
                nav={site.nav}
                socials={site.socials}
                tagline={site.tagline}
                headerImage={site.headerImage}
              />
              <main className="flex-1">{children}</main>
              <Footer
                nav={site.nav}
                socials={site.socials}
                contact={site.contact}
                footer={site.footer}
                tagline={site.tagline}
              />
            </GlyphProvider>
          </AdminProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
