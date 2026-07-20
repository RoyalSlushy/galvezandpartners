"use client";

import type { ContactPageContent } from "@/lib/cms";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";

/** Contact page heading + intro (editable in the in-page CMS). */
export default function ContactIntro({ contact: serverContact }: { contact: ContactPageContent }) {
  const contact = useCmsValue("contact", serverContact);
  const editMode = useEditMode();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode.
  const tv = (s: string) => (editMode ? s : t(s));
  return (
    <>
      <EditableText
        path="contact.heading"
        value={tv(contact.heading)}
        as="h1"
        className="font-heading text-f3 leading-none text-white"
      />
      <EditableText
        path="contact.intro"
        value={tv(contact.intro)}
        as="p"
        multiline
        className="mt-4 max-w-xl whitespace-pre-line font-body text-f8 text-white/80"
      />
    </>
  );
}
