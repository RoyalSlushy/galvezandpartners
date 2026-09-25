/**
 * "Our partners" page copy (also served at /o).
 * Extracted from the original PartnersHero markup so the CMS can manage it.
 */

/** One partner in the lander's logo marquee. `img` is the uploaded logo
 * (SVG or a transparent PNG reads best over navy); `name` is its alt text. */
export type PartnerLogo = { img: string; name: string };

export type PartnersContent = {
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  /** Full-bleed still behind the lander, like the Our Team office backdrop.
   * Empty by default — the page still reads as designed over plain navy. */
  background: string;
  /** Partner logos for the two-lane marquee. Empty by default, in which case
   * the marquee runs the site's glyphs instead (see PartnerMarquee). */
  logos: PartnerLogo[];
};

export const PARTNERS: PartnersContent = {
  eyebrow: "our partners",
  heading: "Where exceptional results are made.",
  body: "We partner with ambitious brands to tell stories that move people and drive results.",
  ctaLabel: "Connect With Us",
  ctaHref: "/contact-us",
  background: "",
  logos: [],
};
