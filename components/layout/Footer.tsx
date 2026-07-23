"use client";

import Link from "next/link";
import type { NavItem, Social } from "@/content/site";
import Container from "@/components/ui/Container";
import SocialIcons from "@/components/ui/SocialIcons";
import AdminGearButton from "@/components/admin/AdminGearButton";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableLines from "@/components/admin/editable/EditableLines";

/** Site footer: tagline, contact, menu, socials, credit line, and a discrete
 * gear icon that unlocks the in-page CMS. */
export default function Footer({
  nav: serverNav,
  socials: serverSocials,
  contact: serverContact,
  footer: serverFooter,
  tagline: serverTagline,
}: {
  nav: NavItem[];
  socials: Social[];
  contact: { email: string; addressLines: string[] };
  footer: { credit: string; copyright: string };
  tagline: string;
}) {
  const nav = useCmsValue("site.nav", serverNav);
  const socials = useCmsValue("site.socials", serverSocials);
  const contact = useCmsValue("site.contact", serverContact);
  const footer = useCmsValue("site.footer", serverFooter);
  const tagline = useCmsValue("site.tagline", serverTagline);
  const editMode = useEditMode();
  const t = useT();

  const menu: NavItem[] = [...nav, { label: "Connect With Us", href: "/contact-us" }];
  // Map query follows the CMS address ("734 W Polk St, Phoenix, AZ 85007" by
  // default), so an address edit re-aims the embed too.
  const mapQuery = contact.addressLines.join(", ");
  return (
    // Extra bottom padding on mobile clears the floating bottom nav (h-16) so
    // the credit line and admin gear are never hidden behind it.
    <footer className="w-full bg-navy pb-28 text-white sm:pb-8">
      {/* The header's animated accent stroke, mirrored along the footer's top
          edge (same site-column constraint as the header's wrapper). */}
      <div aria-hidden className="pointer-events-none mx-auto w-full max-w-site px-5 sm:px-8">
        <div className="header-accent-border" />
      </div>
      <Container className="grid gap-12 pt-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Galvez & Partners" className="h-16 w-auto" />
          <EditableText
            path="site.tagline"
            value={editMode ? tagline : t(tagline)}
            as="p"
            className="mt-5 font-heading text-2xl text-cream"
          />
        </div>

        <div>
          <h2 className="font-heading text-lg uppercase tracking-widest text-gold">{t("Get in Touch")}</h2>
          <EditableText
            path="site.contact.email"
            value={contact.email}
            as="a"
            href={`mailto:${contact.email}`}
            className="mt-4 block text-white/85 transition hover:text-gold"
            label="contact email"
          />
          <EditableLines
            path="site.contact.addressLines"
            values={contact.addressLines}
            as="address"
            className="mt-3 not-italic text-white/70"
            lineClassName={() => "block"}
            label="address"
          />
          {/* Office map, aimed at the address above. The keyless Google embed
              geocodes the query itself; the invert/hue filter re-tints the map
              into the site's navy so it doesn't glare in the dark footer. */}
          <div className="mt-5 overflow-hidden border border-white/10">
            <iframe
              title={t("Map to our office")}
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-44 w-full"
              style={{
                border: 0,
                filter: "invert(0.88) hue-rotate(185deg) saturate(0.55) brightness(0.95)",
              }}
            />
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-din text-xs uppercase tracking-[0.2em] text-gold transition hover:text-gold-bright"
          >
            {t("get directions")} ↗
          </a>
        </div>

        <div>
          <h2 className="font-heading text-lg uppercase tracking-widest text-gold">{t("Menu")}</h2>
          <ul className="mt-4 space-y-2">
            {menu.map((item, i) => (
              <li key={i}>
                <Link href={item.href} className="text-white/85 transition hover:text-gold">
                  {editMode && i < nav.length ? (
                    <EditableText
                      path={`site.nav.${i}.label`}
                      value={item.label}
                      link={{ path: `site.nav.${i}.href`, value: item.href }}
                    />
                  ) : (
                    t(item.label)
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 font-heading text-lg uppercase tracking-widest text-gold">{t("Follow Us")}</h2>
          <SocialIcons socials={socials} className="mt-4" editPathBase="site.socials" />
        </div>
      </Container>

      <Container className="mt-14 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
        <EditableText path="site.footer.copyright" value={footer.copyright} as="span" />
        <div className="flex items-center gap-4">
          <EditableText path="site.footer.credit" value={footer.credit} as="span" />
          <AdminGearButton />
        </div>
      </Container>
    </footer>
  );
}
