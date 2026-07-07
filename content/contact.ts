/**
 * Contact page heading + intro copy.
 * Extracted from app/contact-us/page.tsx so the CMS can manage it.
 */

export type ContactPageContent = {
  heading: string;
  intro: string;
};

export const CONTACT_PAGE: ContactPageContent = {
  heading: "Contact us",
  intro: "Tell us about your brand and what you want to achieve. We'll take it from there.",
};
