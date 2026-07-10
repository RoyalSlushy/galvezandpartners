import { supabase } from "@/lib/supabase";
import {
  NAV,
  SOCIALS,
  CONTACT,
  FOOTER,
  TAGLINE,
  SITE,
  THEME,
  type NavItem,
  type Social,
} from "@/content/site";
import {
  HERO,
  SERVICES,
  MULTICULTURAL,
  MARQUEE_WORDS,
  FEATURED_WORK,
  INSTAGRAM,
  WORKS_EYEBROW,
  SERVICES_HEADING,
  type Service,
  type InstagramPost,
} from "@/content/home";
import { TEAM, TEAM_HEADING, type Member } from "@/content/team";
import { WORK, WORK_HEADING, type Work } from "@/content/work";
import { CASE_STUDIES, type CaseStudy } from "@/content/caseStudies";
import { PARTNERS, type PartnersContent } from "@/content/partners";
import { CONTACT_PAGE, type ContactPageContent } from "@/content/contact";

export type SiteContent = {
  nav: NavItem[];
  socials: Social[];
  tagline: string;
  contact: { email: string; addressLines: string[] };
  footer: { credit: string; copyright: string };
  site: { name: string; brand: string; description: string };
  theme: string;
};

export type HomeContent = {
  hero: {
    headline: string;
    sub: string;
    image: string;
    ctaLabel: string;
    ctaHref: string;
  };
  services: Service[];
  worksEyebrow: string;
  servicesHeading: string;
  multicultural: {
    titleLines: string[];
    intro: string;
    cards: { title: string; body: string }[];
  };
  marqueeWords: string[];
  featuredWork: {
    eyebrow: string;
    heading: string;
    blurb: string;
    ctaLabel: string;
    ctaHref: string;
  };
  instagram: {
    eyebrow: string;
    heading: string;
    handle: string;
    href: string;
    ctaLabel: string;
    posts: InstagramPost[];
  };
};

export type TeamContent = { heading: string; members: Member[] };
export type WorkContent = { heading: string; items: Work[] };
export type CaseStudiesContent = { studies: CaseStudy[] };
export type { PartnersContent, ContactPageContent };

export const DEFAULT_SITE: SiteContent = {
  nav: NAV,
  socials: SOCIALS,
  tagline: TAGLINE,
  contact: { email: CONTACT.email, addressLines: [...CONTACT.addressLines] },
  footer: { credit: FOOTER.credit, copyright: FOOTER.copyright },
  site: { name: SITE.name, brand: SITE.brand, description: SITE.description },
  theme: THEME,
};

export const DEFAULT_HOME: HomeContent = {
  hero: { ...HERO },
  services: SERVICES.map((s) => ({ ...s })),
  worksEyebrow: WORKS_EYEBROW,
  servicesHeading: SERVICES_HEADING,
  multicultural: {
    titleLines: [...MULTICULTURAL.titleLines],
    intro: MULTICULTURAL.intro,
    cards: MULTICULTURAL.cards.map((c) => ({ ...c })),
  },
  marqueeWords: [...MARQUEE_WORDS],
  featuredWork: { ...FEATURED_WORK },
  instagram: {
    ...INSTAGRAM,
    posts: INSTAGRAM.posts.map((p) => ({ ...p })),
  },
};

export const DEFAULT_TEAM: TeamContent = {
  heading: TEAM_HEADING,
  members: TEAM.map((m) => ({ ...m })),
};

export const DEFAULT_WORK: WorkContent = {
  heading: WORK_HEADING,
  items: WORK.map((w) => ({ ...w })),
};

export const DEFAULT_CASE_STUDIES: CaseStudiesContent = {
  studies: CASE_STUDIES.map((c) => ({ ...c, gallery: [...c.gallery] })),
};

export const DEFAULT_PARTNERS: PartnersContent = { ...PARTNERS };

export const DEFAULT_CONTACT: ContactPageContent = { ...CONTACT_PAGE };

export const CONTENT_KEYS = [
  "site",
  "home",
  "team",
  "work",
  "case_studies",
  "partners",
  "contact",
] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];

export const DEFAULTS: Record<ContentKey, unknown> = {
  site: DEFAULT_SITE,
  home: DEFAULT_HOME,
  team: DEFAULT_TEAM,
  work: DEFAULT_WORK,
  case_studies: DEFAULT_CASE_STUDIES,
  partners: DEFAULT_PARTNERS,
  contact: DEFAULT_CONTACT,
};

export function mergeDeep<T>(fallback: T, override: unknown): T {
  if (override === null || override === undefined) return fallback;
  if (Array.isArray(fallback)) {
    return (Array.isArray(override) ? override : fallback) as T;
  }
  if (typeof fallback === "object" && fallback !== null) {
    if (typeof override !== "object" || Array.isArray(override)) return fallback;
    const result: Record<string, unknown> = { ...(fallback as Record<string, unknown>) };
    const src = override as Record<string, unknown>;
    for (const key of Object.keys(src)) {
      const fbVal = (fallback as Record<string, unknown>)[key];
      result[key] = fbVal !== undefined ? mergeDeep(fbVal, src[key]) : src[key];
    }
    return result as T;
  }
  return (override as T) ?? fallback;
}

async function fetchOne<T>(key: ContentKey, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return fallback;
    return mergeDeep(fallback, data.value);
  } catch {
    return fallback;
  }
}

export const getSite = () => fetchOne<SiteContent>("site", DEFAULT_SITE);
export const getHome = () => fetchOne<HomeContent>("home", DEFAULT_HOME);
export const getTeam = () => fetchOne<TeamContent>("team", DEFAULT_TEAM);
export const getWork = () => fetchOne<WorkContent>("work", DEFAULT_WORK);
export const getCaseStudies = () =>
  fetchOne<CaseStudiesContent>("case_studies", DEFAULT_CASE_STUDIES);
export const getPartners = () => fetchOne<PartnersContent>("partners", DEFAULT_PARTNERS);
export const getContact = () => fetchOne<ContactPageContent>("contact", DEFAULT_CONTACT);

export async function getAllContent(): Promise<Record<ContentKey, unknown>> {
  const [site, home, team, work, caseStudies, partners, contact] = await Promise.all([
    getSite(),
    getHome(),
    getTeam(),
    getWork(),
    getCaseStudies(),
    getPartners(),
    getContact(),
  ]);
  return { site, home, team, work, case_studies: caseStudies, partners, contact };
}
