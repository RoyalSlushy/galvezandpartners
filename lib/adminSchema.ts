/**
 * Editing metadata for the in-page CMS: templates for newly added list items
 * and human-readable labels for the hover chips.
 *
 * Paths are dot-separated content paths rooted at a section key
 * (e.g. "home.hero.headline", "team.members.2.photo"). Normalized paths
 * replace numeric segments with "*".
 */

export function normalizePath(path: string): string {
  return path.replace(/\.\d+(?=\.|$)/g, ".*");
}

/** Templates for "+ add" on each editable list. Placeholder copy is visible on
 * purpose so freshly added items can be clicked and edited in place. */
const LIST_TEMPLATES: Record<string, () => unknown> = {
  "team.members": () => ({ name: "New Member", role: "Role", photo: "", socials: [] }),
  "team.members.*.socials": () => ({ label: "Instagram", href: "", icon: "instagram" }),
  "home.services": () => ({ title: "New Service", description: "Describe this service.", media: "" }),
  "home.multicultural.cards": () => ({ title: "new card", body: "Card copy goes here." }),
  "site.nav": () => ({ label: "New Link", href: "/" }),
  "site.socials": () => ({
    label: "Instagram",
    href: "https://www.instagram.com/",
    icon: "instagram",
  }),
  "work.items": () => ({ title: "New Work", slug: null, img: "", description: "Describe this work." }),
  "work.gallery.items": () => ({ title: "New Image", img: "", tags: "" }),
  "home.instagram.posts": () => ({
    img: "",
    href: "https://www.instagram.com/galvezandpartners/",
    caption: "New post",
  }),
  "case_studies.studies": () => ({
    slug: "new-case-study",
    title: "New Case Study",
    background: "Background copy goes here.",
    gallery: [],
  }),
  "case_studies.studies.*.gallery": () => "",
};

export function templateFor(listPath: string): unknown {
  const make = LIST_TEMPLATES[normalizePath(listPath)];
  return make ? make() : "";
}

const FIELD_LABELS: Record<string, string> = {
  "site.tagline": "tagline",
  "site.contact.email": "contact email",
  "site.contact.addressLines": "address",
  "site.footer.copyright": "copyright",
  "site.footer.credit": "credit",
  "site.nav.*.label": "menu link",
  "site.headerImage": "mobile header image",
  "site.site.name": "site name",
  "site.site.brand": "brand",
  "site.site.description": "meta description",
  "site.glyphs.*.svg": "letter SVG",
  "home.hero.headline": "hero headline",
  "home.hero.sub": "hero subtitle",
  "home.hero.image": "hero image",
  "home.hero.ctaLabel": "button label",
  "home.worksEyebrow": "eyebrow",
  "home.servicesHeading": "services heading",
  "home.services.*.title": "service title",
  "home.services.*.description": "service description",
  "home.services.*.media": "card backdrop",
  "home.multicultural.titleLines": "title lines",
  "home.multicultural.intro": "intro",
  "home.multicultural.cards.*.title": "card title",
  "home.multicultural.cards.*.body": "card body",
  "home.marqueeWords": "marquee words",
  "home.featuredWork.eyebrow": "eyebrow",
  "home.featuredWork.heading": "heading",
  "home.featuredWork.blurb": "intro",
  "home.featuredWork.ctaLabel": "button label",
  "home.instagram.eyebrow": "eyebrow",
  "home.instagram.heading": "heading",
  "home.instagram.handle": "handle",
  "home.instagram.ctaLabel": "button label",
  "home.instagram.posts.*.img": "post image",
  "home.instagram.posts.*.caption": "post caption",
  "team.heading": "heading",
  "team.members.*.name": "name",
  "team.members.*.role": "role",
  "team.members.*.photo": "photo",
  "work.heading": "heading",
  "work.items.*.title": "work title",
  "work.items.*.img": "work image",
  "work.items.*.description": "work description",
  "work.gallery.heading": "gallery heading",
  "work.gallery.items.*.title": "image title",
  "work.gallery.items.*.img": "gallery image",
  "work.gallery.items.*.tags": "tags (comma-separated)",
  "case_studies.studies.*.title": "case study title",
  "case_studies.studies.*.background": "background",
  "case_studies.studies.*.gallery.*": "gallery image",
  "partners.eyebrow": "eyebrow",
  "partners.heading": "heading",
  "partners.body": "body",
  "partners.ctaLabel": "button label",
  "contact.heading": "heading",
  "contact.intro": "intro",
};

export function labelFor(path: string): string {
  const normalized = normalizePath(path);
  if (FIELD_LABELS[normalized]) return FIELD_LABELS[normalized];
  const last = path.split(".").pop() ?? path;
  return last.replace(/([A-Z])/g, " $1").toLowerCase();
}
