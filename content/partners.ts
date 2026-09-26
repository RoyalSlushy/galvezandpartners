/**
 * "Our partners" page copy (also served at /o).
 * Extracted from the original PartnersHero markup so the CMS can manage it.
 */

/** One partner: shown in the lander's logo marquee and in the directory under
 * it. `img` is the uploaded logo (SVG or a transparent PNG reads best over
 * navy); `name` is the partner's name (and the logo's alt text); `industry`
 * files it under a filter in the roster's industry panel. */
export type PartnerLogo = { img: string; name: string; industry: string };

/** Copy for the roster section under the lander. */
export type PartnersDirectory = {
  eyebrow: string;
  heading: string;
  /** The side button's vertical label, which opens the industry filter. */
  filterLabel: string;
  /** The filter tag that shows every industry at once. */
  allLabel: string;
};

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
  directory: PartnersDirectory;
};

export const PARTNERS: PartnersContent = {
  eyebrow: "our partners",
  heading: "Where exceptional results are made.",
  body: "We partner with ambitious brands to tell stories that move people and drive results.",
  ctaLabel: "Connect With Us",
  ctaHref: "/contact-us",
  background: "",
  logos: [],
  directory: {
    eyebrow: "the roster",
    heading: "Every partner we work with",
    filterLabel: "industries",
    allLabel: "All",
  },
};
