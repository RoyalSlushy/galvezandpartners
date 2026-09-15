"use client";

import type { ContactPageContent } from "@/lib/cms";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import { useRevealPhase } from "@/components/motion/useRevealPhase";

/**
 * Contact page heading + intro (editable in the in-page CMS), and the page's
 * landing beat: the heading climbs out from behind its own edge as the veil
 * lifts and the intro arrives under it. The form below is left alone — it is
 * the thing the visitor came to use, and it should be usable the instant it is
 * on screen.
 */
export default function ContactIntro({ contact: serverContact }: { contact: ContactPageContent }) {
  const contact = useCmsValue("contact", serverContact);
  const editMode = useEditMode();
  const t = useT();
  const tv = useEditableT();
  const phase = useRevealPhase();
  return (
    <div data-gp-hero={phase ?? undefined}>
      <div data-hero-line className="overflow-hidden">
        <EditableText
          path="contact.heading"
          value={tv(contact.heading)}
          as="h1"
          className="block font-heading text-f3 leading-none text-white"
        />
      </div>
      <div data-hero-rise style={{ ["--d" as string]: "180ms" }}>
        <EditableText
          path="contact.intro"
          value={tv(contact.intro)}
          as="p"
          multiline
          className="mt-4 max-w-xl whitespace-pre-line font-body text-f8 text-white/80"
        />
      </div>
    </div>
  );
}
