import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import ContactForm from "@/components/sections/contact/ContactForm";
import { getSite } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Galvez & Partners.",
};

export default async function ContactUs() {
  const site = await getSite();
  return (
    <section className="w-full bg-navy py-20 sm:py-28">
      <Container>
        <h1 className="font-heading text-f3 leading-none text-white">Contact us</h1>
        <p className="mt-4 max-w-xl font-body text-f8 text-white/80">
          Tell us about your brand and what you want to achieve. We&apos;ll take it from there.
        </p>
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
