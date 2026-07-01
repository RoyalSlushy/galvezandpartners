import Link from "next/link";
import { SOCIALS, TAGLINE } from "@/content/site";
import NavLinks from "./NavLinks";
import MobileMenu from "./MobileMenu";
import SocialIcons from "@/components/ui/SocialIcons";
import Button from "@/components/ui/Button";

/** Site header: logo, desktop nav, social + tagline (right-aligned), Connect CTA. Sticky. */
export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-navy/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        {/* Logo */}
        <Link href="/" aria-label="Galvez & Partners — home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Galvez & Partners" className="h-14 w-auto sm:h-16" />
        </Link>

        {/* Desktop nav + right cluster */}
        <div className="hidden flex-1 flex-col items-end gap-3 sm:flex">
          <div className="flex items-center gap-8">
            <NavLinks />
            <Button href="/contact-us">Connect</Button>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-din text-sm tracking-wide text-white/80">{TAGLINE}</span>
            <SocialIcons socials={SOCIALS} iconClassName="h-5 w-5" />
          </div>
        </div>

        {/* Mobile hamburger */}
        <MobileMenu />
      </div>
    </header>
  );
}
