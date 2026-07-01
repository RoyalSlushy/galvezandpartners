import Link from "next/link";
import { CONTACT, FOOTER, SOCIALS, TAGLINE } from "@/content/site";
import Container from "@/components/ui/Container";
import SocialIcons from "@/components/ui/SocialIcons";

/** Site footer: tagline, contact, menu, socials, credit line. */
export default function Footer() {
  return (
    <footer className="w-full bg-navy pt-16 pb-8 text-white">
      <Container className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Galvez & Partners" className="h-16 w-auto" />
          <p className="mt-5 font-heading text-2xl text-cream">{TAGLINE}</p>
        </div>

        <div>
          <h2 className="font-heading text-lg uppercase tracking-widest text-gold">Get in Touch</h2>
          <a
            href={`mailto:${CONTACT.email}`}
            className="mt-4 block text-white/85 transition hover:text-gold"
          >
            {CONTACT.email}
          </a>
          <address className="mt-3 not-italic text-white/70">
            {CONTACT.addressLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
        </div>

        <div>
          <h2 className="font-heading text-lg uppercase tracking-widest text-gold">Menu</h2>
          <ul className="mt-4 space-y-2">
            {FOOTER.menu.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/85 transition hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 font-heading text-lg uppercase tracking-widest text-gold">Follow Us</h2>
          <SocialIcons socials={SOCIALS} className="mt-4" />
        </div>
      </Container>

      <Container className="mt-14 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
        <span>{FOOTER.copyright}</span>
        <span>{FOOTER.credit}</span>
      </Container>
    </footer>
  );
}
