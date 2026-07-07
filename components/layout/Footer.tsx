import Link from "next/link";
import type { NavItem, Social } from "@/content/site";
import Container from "@/components/ui/Container";
import SocialIcons from "@/components/ui/SocialIcons";

/** Site footer: tagline, contact, menu, socials, credit line, and a discrete
 * gear icon linking to the admin CMS. */
export default function Footer({
  nav,
  socials,
  contact,
  footer,
  tagline,
}: {
  nav: NavItem[];
  socials: Social[];
  contact: { email: string; addressLines: string[] };
  footer: { credit: string; copyright: string };
  tagline: string;
}) {
  const menu: NavItem[] = [...nav, { label: "Connect With Us", href: "/contact-us" }];
  return (
    <footer className="w-full bg-navy pt-16 pb-8 text-white">
      <Container className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Galvez & Partners" className="h-16 w-auto" />
          <p className="mt-5 font-heading text-2xl text-cream">{tagline}</p>
        </div>

        <div>
          <h2 className="font-heading text-lg uppercase tracking-widest text-gold">Get in Touch</h2>
          <a
            href={`mailto:${contact.email}`}
            className="mt-4 block text-white/85 transition hover:text-gold"
          >
            {contact.email}
          </a>
          <address className="mt-3 not-italic text-white/70">
            {contact.addressLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
        </div>

        <div>
          <h2 className="font-heading text-lg uppercase tracking-widest text-gold">Menu</h2>
          <ul className="mt-4 space-y-2">
            {menu.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/85 transition hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 font-heading text-lg uppercase tracking-widest text-gold">Follow Us</h2>
          <SocialIcons socials={socials} className="mt-4" />
        </div>
      </Container>

      <Container className="mt-14 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
        <span>{footer.copyright}</span>
        <div className="flex items-center gap-4">
          <span>{footer.credit}</span>
          <Link
            href="/admin"
            aria-label="Admin"
            title="Admin"
            className="inline-flex h-5 w-5 items-center justify-center text-white/30 transition hover:text-gold"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
      </Container>
    </footer>
  );
}
