"use client";

import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableLines from "@/components/admin/editable/EditableLines";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";

type Multicultural = {
  titleLines: string[];
  intro: string;
  cards: { title: string; body: string }[];
};

/**
 * "the multi-cultural / Agency doing / big things" band with a 3-card row.
 */
export default function MulticulturalReveal({
  multicultural: serverMulticultural,
}: {
  multicultural: Multicultural;
}) {
  const multicultural = useCmsValue("home.multicultural", serverMulticultural);
  const editMode = useEditMode();

  return (
    <section className="w-full bg-gradient-to-b from-blue-muted/60 via-navy to-navy py-24 sm:py-32">
      <Container>
        <RevealOnScroll>
          <EditableLines
            path="home.multicultural.titleLines"
            values={multicultural.titleLines}
            as="h2"
            className="font-display leading-[0.95] text-white"
            lineClassName={(_, i, all) =>
              `block text-f2 ${i === 0 ? "lowercase" : ""} ${
                i === all.length - 1 ? "text-gold" : ""
              }`
            }
            editingClassName="text-f2"
            label="title lines"
          />
          <EditableText
            path="home.multicultural.intro"
            value={multicultural.intro}
            as="p"
            multiline
            className="mt-6 max-w-2xl whitespace-pre-line font-body text-f8 text-white/80"
          />
        </RevealOnScroll>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {multicultural.cards.map((c, i) => (
            <RevealOnScroll key={i} delay={0.09 * (i + 1)}>
              <article
                className={`h-full rounded-2xl border border-white/10 bg-navy-soft/60 p-8${
                  editMode ? " relative" : ""
                }`}
              >
                {editMode && (
                  <ListControls
                    listPath="home.multicultural.cards"
                    index={i}
                    count={multicultural.cards.length}
                    label="card"
                  />
                )}
                <EditableText
                  path={`home.multicultural.cards.${i}.title`}
                  value={c.title}
                  as="h3"
                  className="font-heading text-f7 lowercase text-gold"
                />
                <EditableText
                  path={`home.multicultural.cards.${i}.body`}
                  value={c.body}
                  as="p"
                  multiline
                  className="mt-4 whitespace-pre-line font-body text-f9 text-white/75"
                />
              </article>
            </RevealOnScroll>
          ))}
        </div>
        {editMode && (
          <div className="mt-8">
            <AddChip listPath="home.multicultural.cards" label="card" />
          </div>
        )}
      </Container>
    </section>
  );
}
