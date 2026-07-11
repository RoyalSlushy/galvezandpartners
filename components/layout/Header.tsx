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
}: {
  nav: NavItem[];
  socials: Social[];
  tagline: string;
}) {
  const nav = useCmsValue("site.nav", serverNav);
  const socials = useCmsValue("site.socials", serverSocials);
  const tagline = useCmsValue("site.tagline", serverTagline);
  const editMode = useEditMode();

  return (
    <header className="w-full bg-navy">
      <div className="mx-auto flex h-[var(--header-h)] max-w-site items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="Galvez & Partners — home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Galvez & Partners" className="h-16 w-auto sm:h-20" />
        </Link>

        <DesktopNav nav={nav} socials={socials} tagline={tagline} editMode={editMode} />

        <MobileMenu nav={nav} socials={socials} />
      </div>
    </header>
  );
}
