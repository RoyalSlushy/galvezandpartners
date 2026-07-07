"use client";

import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { Service } from "@/content/home";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import EditableText from "@/components/admin/editable/EditableText";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";

/** "the works" eyebrow + "What We Can Do For YOU." services grid with View More. */
export default function ServicesGrid({
  services: serverServices,
  heading: serverHeading,
  eyebrow: serverEyebrow,
}: {
  services: Service[];
  heading: string;
  eyebrow: string;
}) {
  const services = useCmsValue("home.services", serverServices);
  const heading = useCmsValue("home.servicesHeading", serverHeading);
  const eyebrow = useCmsValue("home.worksEyebrow", serverEyebrow);
  const editMode = useEditMode();

  return (
    <section className="w-full bg-navy py-20 sm:py-28">
      <Container>
        <RevealOnScroll>
          <EditableText
            path="home.worksEyebrow"
            value={eyebrow}
            as="p"
            className="font-display text-f6 lowercase text-gold"
          />
          <EditableText
            path="home.servicesHeading"
            value={heading}
            as="h2"
            className="mt-2 font-heading text-f3 leading-none text-white"
          />
        </RevealOnScroll>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <RevealOnScroll key={i} delay={0.08 * (i % 3)}>
              <article
                className={`flex h-full flex-col rounded-2xl border border-white/10 bg-navy-soft p-8${
                  editMode ? " relative" : ""
                }`}
              >
                {editMode && (
                  <ListControls
                    listPath="home.services"
                    index={i}
                    count={services.length}
                    label="service"
                  />
                )}
                <EditableText
                  path={`home.services.${i}.title`}
                  value={s.title}
                  as="h3"
                  className="font-heading text-f7 leading-tight text-gold"
                />
                <EditableText
                  path={`home.services.${i}.description`}
                  value={s.description}
                  as="p"
                  multiline
                  className="mt-4 flex-1 whitespace-pre-line font-body text-f9 text-white/75"
                />
                <Button href="/contact-us" variant="outline" className="mt-6 self-start text-sm">
                  View More
                </Button>
              </article>
            </RevealOnScroll>
          ))}
        </div>
        {editMode && (
          <div className="mt-8">
            <AddChip listPath="home.services" label="service" />
          </div>
        )}
      </Container>
    </section>
  );
}
