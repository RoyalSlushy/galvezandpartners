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

// The site's designer, linked from the credit line to their portfolio. Matched
// case-insensitively inside the CMS credit text, so admins can reword the line
// around the name without losing the link.
const DESIGNER = "Adrian Chavez";
const DESIGNER_URL = "https://adriven.design";

// What the footer map searches for: the business listing, so the pin carries the
// company name instead of a bare street number.
const MAP_PLACE = "Galvez and Partners Advertising and Marketing";

/**
 * Google's embed only ships its stock light palette, so the map is recolored
 * from the outside in two stages.
 *
 * 1. This filter on the iframe. `invert` flips the near-white land to near-black
 *    and Google's marker red (#ea4335) to a cyan; the hue rotation then carries
 *    that cyan around to the brand gold's hue (~36°) — so every red accent on
 *    the map lands on the accent yellow — while the land, being neutral, is
 *    unmoved by it and stays a dark gray for stage 2.
 * 2. Two blend layers over the iframe (see <MapTint>) push those darks and grays
 *    into navy: a `screen` pass lifts the near-black land onto the navy, and a
 *    partial `color` pass pulls the remaining neutrals to the navy's hue. Both
 *    leave the saturated gold accents standing.
 */
const MAP_FILTER = "invert(0.92) hue-rotate(220deg) saturate(1.08) brightness(0.96) contrast(1.05)";

/** Frames the map embed and lays the navy blend passes over it (see MAP_FILTER).
 * `isolate` keeps the blending inside this box, and the layers are click-through
 * so the map underneath stays draggable. */
function MapTint({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative isolate overflow-hidden border border-white/10 ${className}`}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "rgb(var(--c-navy))", mixBlendMode: "screen", opacity: 0.5 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "rgb(var(--c-navy))", mixBlendMode: "color", opacity: 0.3 }}
      />
    </div>
  );
}

/** The footer credit with the designer's name linked to their site. Renders the
 * credit unchanged when the name isn't part of it. */
function CreditLine({ credit }: { credit: string }) {
  const at = credit.toLowerCase().indexOf(DESIGNER.toLowerCase());
  if (at < 0) return <span>{credit}</span>;
  return (
    <span>
      {credit.slice(0, at)}
      <a
        href={DESIGNER_URL}
        target="_blank"
        rel="noreferrer"
        className="text-white/70 underline underline-offset-4 transition hover:text-gold"
      >
        {credit.slice(at, at + DESIGNER.length)}
      </a>
      {credit.slice(at + DESIGNER.length)}
    </span>
  );
}

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
  // The map is aimed at the business listing rather than the street number, so
  // the embed (and the directions link) label the pin with the company name.
  // Everything after the street line — the city/state/zip in the CMS address —
  // still qualifies the search, so an address edit re-aims the map too.
  const mapQuery = [MAP_PLACE, ...contact.addressLines.slice(1)].join(", ");
  return (
    // Extra bottom padding on mobile clears the floating bottom nav (h-16) so
    // the credit line and admin gear are never hidden behind it.
    <footer className="w-full bg-navy pb-28 text-white sm:pb-8">
      {/* The header's animated accent stroke, mirrored along the footer's top
          edge (same site-column constraint as the header's wrapper). */}
      <div aria-hidden className="pointer-events-none mx-auto w-full max-w-site px-5 sm:px-8">
        <div className="header-accent-border" />
      </div>
      {/* Columns pack to the left on desktop (auto-width, gapped) rather than
          stretching across the full width. */}
      <Container className="flex flex-col gap-12 pt-16 md:flex-row md:flex-wrap md:justify-start md:gap-x-20">
        {/* The logo scales to the exact width of the tagline beneath it: the
            column shrinks to the tagline's single-line width (w-fit) and the
            logo fills it (w-full). */}
        <div className="w-fit wide:order-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Galvez & Partners" className="block h-auto w-full" />
          <EditableText
            path="site.tagline"
            value={editMode ? tagline : t(tagline)}
            as="p"
            className="mt-5 whitespace-nowrap font-heading text-2xl text-cream"
          />
        </div>

        {/* Contact. At `wide` this wrapper dissolves (display: contents) so its
            two halves join the footer row as columns in their own right — the
            details staying put and the map taking the leftover width at the end
            of the row. Dissolving the wrapper, rather than rendering the map
            twice, keeps it to a single iframe and so a single map load. */}
        <div className="wide:contents">
          <div className="md:w-72 wide:order-2">
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
          </div>

          {/* Office map, aimed at the listing above. The keyless Google embed
              geocodes the query itself, and the treatment below re-tints its
              stock palette into the site's — see <MapTint>. Its own column at
              `wide`, flexing into whatever width the other columns leave and
              stretching to the height of the row. */}
          <div className="wide:order-4 wide:flex wide:min-w-[20rem] wide:flex-1 wide:flex-col">
            <MapTint className="mt-5 h-44 wide:mt-0 wide:h-full wide:min-h-[18rem]">
              <iframe
                title={t("Map to our office")}
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block h-full w-full"
                style={{ border: 0, filter: MAP_FILTER }}
              />
            </MapTint>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block font-din text-xs uppercase tracking-[0.2em] text-gold transition hover:text-gold-bright"
            >
              {t("get directions")} ↗
            </a>
          </div>
        </div>

        <div className="md:w-56 wide:order-3">
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
          {editMode ? (
            <EditableText path="site.footer.credit" value={footer.credit} as="span" />
          ) : (
            <CreditLine credit={footer.credit} />
          )}
          <AdminGearButton />
        </div>
      </Container>
    </footer>
  );
}
