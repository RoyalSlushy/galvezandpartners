"use client";

import Link from "next/link";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { Work } from "@/content/work";
import { focusPosition } from "@/lib/wix";
import { PLACEHOLDER_IMG, resolveImage } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";

/** Portfolio grid used by /our-works and the /case-study index. */
export default function WorkGrid({
  items: serverItems,
  heading: serverHeading,
}: {
  items: Work[];
  heading: string;
}) {
  const items = useCmsValue("work.items", serverItems);
  const heading = useCmsValue("work.heading", serverHeading);
  const editMode = useEditMode();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode.
  // Only the section heading is translated; work titles are brand names.
  const tv = (s: string) => (editMode ? s : t(s));

  return (
    <section className="w-full bg-navy py-20 sm:py-28">
      <Container>
        <RevealOnScroll>
          <EditableText
            path="work.heading"
            value={tv(heading)}
            as="h1"
            className="font-display text-f2 lowercase text-white"
          />
        </RevealOnScroll>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w, i) => {
            const card = (
              <article className="group relative overflow-hidden bg-navy-soft">
                {editMode && (
                  <ListControls
                    listPath="work.items"
                    index={i}
                    count={items.length}
                    label="work item"
                    className="top-2 right-2"
                  />
                )}
                <EditableImage
                  path={`work.items.${i}.img`}
                  raw={w.img}
                  src={w.img ? resolveImage(w.img, 700, 480) : PLACEHOLDER_IMG}
                  style={{ objectPosition: focusPosition(w.img) }}
                  alt={w.title}
                  className="aspect-[7/5] w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent${
                    editMode ? " pointer-events-none" : ""
                  }`}
                />
                <EditableText
                  path={`work.items.${i}.title`}
                  value={w.title}
                  as="h2"
                  className="absolute inset-x-0 bottom-0 p-5 font-heading text-f8 leading-tight text-white"
                  link={{
                    path: `work.items.${i}.slug`,
                    value: w.slug ?? "",
                    kind: "slug",
                    createCaseStudy: true,
                  }}
                />
              </article>
            );
            return (
              <RevealOnScroll key={i} delay={0.06 * (i % 3)}>
                {w.slug ? (
                  <Link href={`/case-study/${w.slug}`} aria-label={w.title}>
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </RevealOnScroll>
            );
          })}
        </div>
        {editMode && (
          <div className="mt-8">
            <AddChip listPath="work.items" label="work item" />
          </div>
        )}
      </Container>
    </section>
  );
}
