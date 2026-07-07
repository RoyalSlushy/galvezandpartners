"use client";

import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { Member } from "@/content/team";
import { wixImage } from "@/lib/wix";
import { PLACEHOLDER_IMG } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";

/** "Meet Our Storytellers" team grid. */
export default function TeamGrid({
  members: serverMembers,
  heading: serverHeading,
}: {
  members: Member[];
  heading: string;
}) {
  const members = useCmsValue("team.members", serverMembers);
  const heading = useCmsValue("team.heading", serverHeading);
  const editMode = useEditMode();

  return (
    <section className="w-full bg-navy py-20 sm:py-28">
      <Container>
        <RevealOnScroll>
          <EditableText
            path="team.heading"
            value={heading}
            as="h1"
            className="font-heading text-f3 leading-none text-white"
          />
        </RevealOnScroll>

        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <RevealOnScroll key={i} delay={0.05 * (i % 4)}>
              <figure className={`text-center${editMode ? " relative" : ""}`}>
                {editMode && (
                  <ListControls
                    listPath="team.members"
                    index={i}
                    count={members.length}
                    label="team member"
                  />
                )}
                <div className="overflow-hidden rounded-2xl bg-navy-soft">
                  <EditableImage
                    path={`team.members.${i}.photo`}
                    raw={m.photo}
                    src={
                      m.photo
                        ? m.photo.startsWith("http")
                          ? m.photo
                          : wixImage(m.photo, 400, 480)
                        : PLACEHOLDER_IMG
                    }
                    alt={m.name}
                    className="aspect-[5/6] w-full object-cover"
                  />
                </div>
                <figcaption className="mt-4">
                  <EditableText
                    path={`team.members.${i}.name`}
                    value={m.name}
                    as="span"
                    className="block font-heading text-f9 text-white"
                  />
                  <EditableText
                    path={`team.members.${i}.role`}
                    value={m.role}
                    as="span"
                    className="mt-1 block font-din text-sm uppercase tracking-wide text-gold"
                  />
                </figcaption>
              </figure>
            </RevealOnScroll>
          ))}
          {editMode && (
            <div className="flex aspect-[5/6] items-center justify-center rounded-2xl border border-dashed border-white/15">
              <AddChip listPath="team.members" label="member" />
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
