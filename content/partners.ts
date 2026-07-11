/**
 * "Our partners" page copy (also served at /o).
 * Extracted from the original PartnersHero markup so the CMS can manage it.
 */

export type PartnersContent = {
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export const PARTNERS: PartnersContent = {
  eyebrow: "our partners",
  heading: "Where exceptional results are made.",
  body: "We partner with ambitious brands to tell stories that move people and drive results.",
  ctaLabel: "Connect With Us",
  ctaHref: "/contact-us",
};
