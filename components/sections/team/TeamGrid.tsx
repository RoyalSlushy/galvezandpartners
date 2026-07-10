"use client";

import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { GlyphMark } from "@/components/ui/Glyph";
import type { Member } from "@/content/team";
import { wixImage } from "@/lib/wix";
import { PLACEHOLDER_IMG } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";

/** Trailing name suffixes that shouldn't count as the last name. */
const NAME_SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;

/** First letter of a member's last name, upper-cased. Skips a trailing suffix
 * (e.g. "Cesar Salas Jr" -> "S", "Hector Galvez" -> "G"). */
function lastNameInitial(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && NAME_SUFFIX.test(parts[parts.length - 1])) {
    parts.pop();
  }
  const last = parts[parts.length - 1] ?? "";
  return last.charAt(0).toUpperCase();
}

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
              <figure className="relative text-center">
                {editMode && (
                  <ListControls
                    listPath="team.members"
                    index={i}
                    count={members.length}
                    label="team member"
                  />
                )}
                <div className="relative overflow-hidden rounded-t-2xl border-b-4 border-gold bg-white">
                  {/* Decorative last-name initial in the member's custom glyph:
                      a low-opacity watermark inside the card, behind the photo.
                      Only shows once that letter's SVG is uploaded. */}
                  <GlyphMark
                    char={lastNameInitial(m.name)}
                    tintClassName="bg-gold"
                    className="pointer-events-none absolute right-2 top-2 z-0 h-24 w-24 opacity-20 sm:h-28 sm:w-28"
                  />
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
                    className="relative z-10 aspect-[5/6] w-full object-cover"
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
