"use client";

import Link from "next/link";
import type { NavItem, Social } from "@/content/site";
import NavLinks from "./NavLinks";
import MobileMenu from "./MobileMenu";
import SocialIcons from "@/components/ui/SocialIcons";
import Button from "@/components/ui/Button";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";

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
  const t = useT();

  return (
    <header className="w-full bg-navy">
      <div className="mx-auto flex h-[var(--header-h)] max-w-site items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="Galvez & Partners — home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Galvez & Partners" className="h-16 w-auto sm:h-20" />
        </Link>

        <div className="hidden flex-1 items-center justify-end gap-8 sm:flex">
          <div className="flex h-16 flex-col items-end justify-between sm:h-20">
            <NavLinks nav={nav} />
            <div className="flex items-center gap-5">
              <EditableText
                path="site.tagline"
                value={editMode ? tagline : t(tagline)}
                as="span"
                className="font-din text-sm tracking-wide text-white/80"
              />
              <SocialIcons socials={socials} iconClassName="h-5 w-5" editPathBase="site.socials" />
            </div>
          </div>
          <LanguageSwitcher />
          <Button href="/contact-us">{t("Connect")}</Button>
        </div>

        <div className="flex flex-col items-end gap-1.5 sm:hidden">
          <MobileMenu nav={nav} socials={socials} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
