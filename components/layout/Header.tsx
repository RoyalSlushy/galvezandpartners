import Link from "next/link";
import { SOCIALS, TAGLINE } from "@/content/site";
import NavLinks from "./NavLinks";
import MobileMenu from "./MobileMenu";
import SocialIcons from "@/components/ui/SocialIcons";
import Button from "@/components/ui/Button";

/** Site header: logo, desktop nav + social/tagline cluster, Connect CTA on the far right. Width flush with the body Container. */
export default function Header() {
  return (
    <header className="w-full bg-navy">
      <div className="mx-auto flex h-[var(--header-h)] max-w-site items-center justify-between gap-6 px-5 pb-[0.33em] sm:px-8">
        {/* Logo */}
        <Link href="/" aria-label="Galvez & Partners — home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Galvez & Partners" className="h-14 w-auto sm:h-16" />
        </Link>

        {/* Desktop nav + right cluster, with the CTA pushed to the far right */}
        <div className="hidden flex-1 items-center justify-end gap-8 sm:flex">
          <div className="flex flex-col items-end gap-3">
            <NavLinks />
            <div className="flex items-center gap-4">
              <span className="font-din text-sm tracking-wide text-white/80">{TAGLINE}</span>
              <SocialIcons socials={SOCIALS} iconClassName="h-5 w-5" />
            </div>
          </div>
          <Button href="/contact-us">Connect</Button>
        </div>

        {/* Mobile hamburger */}
        <MobileMenu />
      </div>
    </header>
  );
}
