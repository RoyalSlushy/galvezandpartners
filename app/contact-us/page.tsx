import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import ContactForm from "@/components/sections/contact/ContactForm";
import ContactIntro from "@/components/sections/contact/ContactIntro";
import { getContact, getSite } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Galvez & Partners.",
};

export default async function ContactUs() {
  const [site, contact] = await Promise.all([getSite(), getContact()]);
  return (
    <section className="w-full bg-navy py-20 sm:py-28">
      <Container>
        <ContactIntro contact={contact} />
        <div className="mt-6 font-din text-white/70">
          <a href={`mailto:${site.contact.email}`} className="text-gold hover:underline">
            {site.contact.email}
          </a>
          <span className="mx-2">·</span>
          {site.contact.addressLines.join(", ")}
        </div>
        <ContactForm />
      </Container>
    </section>
  );
}
