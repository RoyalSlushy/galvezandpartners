"use client";

import Link from "next/link";
import type { NavItem, Social } from "@/content/site";
import DesktopNav from "./DesktopNav";
import MobileMenu from "./MobileMenu";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";

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
  const editMode = useEditMode();

  return (
    <header className="w-full bg-navy">
      {/* items-stretch on mobile lets the header picture fill the full height and
          sit flush against the hero; the desktop cluster re-centers at sm+. */}
      <div className="mx-auto flex h-[var(--header-h)] max-w-site items-stretch justify-between gap-6 px-5 sm:items-center sm:px-8">
        {/* Desktop logo — on mobile the logo lives inside MobileMenu (and opens
            the drawer), so it's hidden here below sm. */}
        <Link href="/" aria-label="Galvez & Partners — home" className="hidden shrink-0 items-center sm:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Galvez & Partners" className="h-16 w-auto sm:h-20" />
        </Link>

        <DesktopNav nav={nav} socials={socials} tagline={tagline} editMode={editMode} />

        <MobileMenu nav={nav} socials={socials} headerImage={serverHeaderImage} />
      </div>
    </header>
  );
}
