"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, Social } from "@/content/site";
import DesktopNav from "./DesktopNav";
import MobileMenu from "./MobileMenu";
import EditableImage from "@/components/admin/editable/EditableImage";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { wixImage } from "@/lib/wix";

/** Site header: logo, desktop nav + social/tagline cluster, Connect CTA on the far right. */
export default function Header({
  nav: serverNav,
  socials: serverSocials,
  tagline: serverTagline,
  headerImage: serverHeaderImage,
}: {
  nav: NavItem[];
  socials: Social[];
  tagline: string;
  headerImage: string;
}) {
  const nav = useCmsValue("site.nav", serverNav);
  const socials = useCmsValue("site.socials", serverSocials);
  const tagline = useCmsValue("site.tagline", serverTagline);
  const headerImg = useCmsValue("site.headerImage", serverHeaderImage);
  const headerSrc = headerImg.startsWith("http") ? headerImg : wixImage(headerImg, 480, 360);
  const editMode = useEditMode();
  // On the homepage the header is painted with the hero's top color (exposed as
  // --hero-top-color on <body> in the layout) so the header and the hero below
  // form one seamless surface — no visible seam at their boundary — for any
  // theme or admin-authored hero gradient. It falls back to the theme navy. The
  // header stays in normal flow (it does not overlap the hero), so the hero
  // image never bleeds up behind it. Other pages keep the header solid navy.
  const isHome = usePathname() === "/";

  return (
    <header
      className={`w-full ${isHome ? "" : "bg-navy"}`}
      style={isHome ? { background: "var(--hero-top-color, rgb(var(--c-navy)))" } : undefined}
    >
      {/* items-stretch on mobile lets the header picture fill the full height and
          sit flush against the hero; the desktop cluster re-centers at sm+. */}
      <div className="mx-auto flex h-[var(--header-h)] max-w-site items-stretch justify-between gap-6 px-5 sm:items-center sm:px-8">
        {/* Desktop logo + header image cluster — on mobile the logo lives inside
            MobileMenu (and opens the drawer), so this is hidden below sm.
            self-stretch fills the full header height so the header image can
            bottom-anchor to the header's bottom edge (see below). */}
        <div className="hidden shrink-0 items-center gap-4 sm:flex sm:self-stretch">
          <Link href="/" aria-label="Galvez & Partners — home" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Galvez & Partners" className="h-16 w-auto sm:h-24" />
          </Link>
          {/* Header image: bottom flush with the header's bottom edge (self-end)
              while its top stays level with the centered logo. Its height is
              (header-h + logo-h) / 2 — i.e. header-h/2 + 3rem, since the logo
              is sm:h-24 (6rem) — which places its top exactly at the logo's top
              for any header height. */}
          <EditableImage
            path="site.headerImage"
            raw={headerImg}
            src={headerSrc}
            alt=""
            className="h-14 w-auto object-contain sm:h-[calc(var(--header-h)*0.5_+_3rem)] sm:self-end"
          />
        </div>

        <DesktopNav nav={nav} socials={socials} tagline={tagline} editMode={editMode} />

        <MobileMenu nav={nav} socials={socials} headerImage={serverHeaderImage} />
      </div>
    </header>
  );
}
