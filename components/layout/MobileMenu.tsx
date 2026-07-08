"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NavItem, Social } from "@/content/site";
import SocialIcons from "@/components/ui/SocialIcons";
import Button from "@/components/ui/Button";
import { useT } from "@/components/i18n/LocaleProvider";

/** Hamburger + full-screen navy overlay menu for mobile (< sm). */
export default function MobileMenu({
  nav,
  socials,
}: {
  nav: NavItem[];
  socials: Social[];
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 flex-col items-center justify-center gap-[6px]"
      >
        <span className="block h-[3px] w-7 bg-cream" />
        <span className="block h-[3px] w-7 bg-cream" />
        <span className="block h-[3px] w-7 bg-cream" />
      </button>

      <div
        className={`fixed inset-0 z-50 bg-navy transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-end px-5 py-6">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="text-4xl leading-none text-white"
          >
            &times;
          </button>
        </div>
        <nav aria-label="Site" className="flex flex-col items-center gap-7 pt-8">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="font-heading text-3xl uppercase tracking-wide text-white hover:text-gold"
            >
              {t(item.label)}
            </Link>
          ))}
          <Button href="/contact-us" className="mt-4" onClick={() => setOpen(false)}>
            {t("Connect")}
          </Button>
          <SocialIcons socials={socials} className="mt-8" />
        </nav>
      </div>
    </div>
  );
}
