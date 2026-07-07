"use client";

import type { ContactPageContent } from "@/lib/cms";
import { useCmsValue } from "@/components/admin/AdminProvider";
import EditableText from "@/components/admin/editable/EditableText";

/** Contact page heading + intro (editable in the in-page CMS). */
export default function ContactIntro({ contact: serverContact }: { contact: ContactPageContent }) {
  const contact = useCmsValue("contact", serverContact);
  return (
    <>
      <EditableText
        path="contact.heading"
        value={contact.heading}
        as="h1"
        className="font-heading text-f3 leading-none text-white"
      />
      <EditableText
        path="contact.intro"
        value={contact.intro}
        as="p"
        multiline
        className="mt-4 max-w-xl whitespace-pre-line font-body text-f8 text-white/80"
      />
    </>
  );
}
