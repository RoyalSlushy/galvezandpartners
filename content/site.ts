/**
 * Site-wide content: navigation, socials, contact info, footer.
 * Extracted from the original Galvez & Partners site.
 */

export type NavItem = { label: string; href: string };

export const NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Our Work", href: "/our-works" },
  { label: "Our Team", href: "/our-team" },
  { label: "Our Partners", href: "/our-partners" },
];

export const TAGLINE = "We Work Our Ads Off.";

export type Social = { label: string; href: string; icon: "facebook" | "instagram" | "linkedin" | "tiktok" };

export const SOCIALS: Social[] = [
  { label: "Facebook", href: "https://www.facebook.com/galvezandpartners/", icon: "facebook" },
  { label: "Instagram", href: "https://www.instagram.com/galvezandpartners/", icon: "instagram" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/galvez-and-partners/posts/", icon: "linkedin" },
  { label: "TikTok", href: "https://www.tiktok.com/@galvezads", icon: "tiktok" },
];

export const CONTACT = {
  email: "media@galvezandpartners.com",
  addressLines: ["734 W Polk St", "Phoenix, AZ 85007"],
};

export const FOOTER = {
  menu: [
    ...NAV,
    { label: "Connect With Us", href: "/contact-us" },
  ] as NavItem[],
  credit: "Site Design by Adrian Chavez",
  copyright: "© 2026 Galvez and Partners",
};

export const SITE = {
  name: "Galvez & Partners",
  brand: "G&P Advertising",
  description:
    "Galvez & Partners (G&P Advertising) — a multicultural advertising & marketing firm in Phoenix, AZ.",
};

// Active color theme id (see lib/themes.ts). Editable from the admin drawer.
export const THEME = "midnight-gold";
