"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { GlyphMark } from "@/components/ui/Glyph";
import SocialIcons from "@/components/ui/SocialIcons";
import type { Member } from "@/content/team";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import CtaGrid from "@/components/sections/home/CtaGrid";
import MemberCardModal from "./MemberCardModal";
import { lastNameInitial, memberPhotoSrc } from "./memberUtils";

/** The member tiles. The page heading lives on the lander above this. */
export default function TeamGrid({ members: serverMembers }: { members: Member[] }) {
  const members = useCmsValue("team.members", serverMembers);
  const editMode = useEditMode();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode.
  const tv = (s: string) => (editMode ? s : t(s));

  // Which member's profile card is open (null = none). Lives here so a single
  // modal instance serves the whole grid; `members` is draft-aware, so edits
  // made inside the open card re-render it live.
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // If the open member is deleted in edit mode, close the card.
  useEffect(() => {
    if (openIdx !== null && openIdx >= members.length) setOpenIdx(null);
  }, [openIdx, members.length]);

  // The photo block is shared between modes: in normal mode it sits inside the
  // button that opens the profile card; in edit mode it stays a plain div so
  // EditableImage keeps the click for the media picker.
  const photoBlock = (m: Member, i: number) => (
    <>
      {/* Decorative last-name initial in the member's custom glyph —
          a low-opacity mark in the site's background color, sitting on
          the white card but behind the (cutout) photo. Only shows once
          that letter's SVG is uploaded in the Letters panel. */}
      {/* Per-member backdrop behind the cut-out portrait, wiped up into view on
          hover: the clip is inset from the bottom by its full height at rest and
          released to nothing, so the picture is uncovered from the floor of the
          tile upward. Pure CSS off the tile's hover, so it costs nothing when
          idle. */}
      {m.hoverImage && (
        <img
          src={memberPhotoSrc(m.hoverImage)}
          alt=""
          aria-hidden
          loading="lazy"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover [clip-path:inset(100%_0_0_0)] transition-[clip-path] duration-700 ease-out group-hover:[clip-path:inset(0_0_0_0)]"
        />
      )}
      <GlyphMark
        char={lastNameInitial(m.name)}
        tintClassName="bg-navy"
        className="pointer-events-none absolute right-2 top-2 z-[1] aspect-square w-[40%] opacity-25 transition-opacity duration-300 group-hover:opacity-50"
      />
      <EditableImage
        path={`team.members.${i}.photo`}
        raw={m.photo}
        src={memberPhotoSrc(m.photo)}
        alt={m.name}
        className="relative z-10 aspect-[5/6] w-full object-cover"
      />
    </>
  );

  return (
    <section className="relative w-full bg-navy py-20 sm:py-28">
      <Container>
        {/* Three across from sm right through xl: the body column is still
            1200px up to 1920 (see the --site-max tiers), so a fourth column
            there only shrinks every portrait. The fourth arrives with the
            wider column at `wide`. */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 wide:grid-cols-4">
          {members.map((m, i) => (
            <RevealOnScroll key={i} delay={0.05 * (i % 4)}>
              <figure className="group relative text-center">
                {editMode && (
                  <ListControls
                    listPath="team.members"
                    index={i}
                    count={members.length}
                    label="team member"
                  />
                )}
                {editMode ? (
                  <div className="relative overflow-hidden border-b-4 border-gold bg-white">
                    {photoBlock(m, i)}
                    {/* The photo click belongs to the media picker in edit
                        mode, so the profile card gets its own admin chip
                        (bottom-left; ListControls holds the top-right). */}
                    <button
                      type="button"
                      onClick={() => setOpenIdx(i)}
                      className="absolute bottom-2 left-2 z-20 border border-white/15 bg-navy-soft/95 px-2 py-1 font-din text-[10px] uppercase text-white/75 shadow-lg backdrop-blur transition hover:bg-white/10 hover:text-gold"
                    >
                      profile card
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenIdx(i)}
                    aria-haspopup="dialog"
                    aria-label={`${t("See More")} — ${m.name}`}
                    className="relative block w-full cursor-pointer overflow-hidden border-b-4 border-gold bg-white"
                  >
                    {photoBlock(m, i)}
                    {/* Hover hint that the tile opens a profile card. */}
                    <span className="absolute bottom-2 right-2 z-20 bg-gold px-2 py-1 font-din text-[10px] uppercase text-navy opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      {t("See More")} {m.emoji || "✦"}
                    </span>
                  </button>
                )}
                <figcaption className="mt-4">
                  <EditableText
                    path={`team.members.${i}.name`}
                    value={m.name}
                    as="span"
                    className="block whitespace-nowrap font-heading text-f9 tracking-tight text-white"
                  />
                  {/* The role sits centered; the social wrapper collapses to
                      zero width. On card hover (or always in edit mode) it
                      expands, so the centered group glides — role slides left and
                      the links slide in from the right, in one smooth motion. */}
                  <div className="mt-1 flex items-center justify-center">
                    <EditableText
                      path={`team.members.${i}.role`}
                      value={tv(m.role)}
                      as="span"
                      className="min-w-0 truncate font-din text-sm uppercase text-gold"
                    />
                    <div
                      className={`flex shrink-0 items-center overflow-hidden transition-all duration-300 ease-out ${
                        editMode
                          ? "max-w-none pl-2 opacity-100"
                          : m.socials?.length
                            ? "max-w-0 pl-2 opacity-0 group-hover:max-w-[8rem] group-hover:opacity-100"
                            : "hidden"
                      }`}
                    >
                      <SocialIcons
                        socials={m.socials ?? []}
                        editPathBase={`team.members.${i}.socials`}
                        className="!gap-2.5"
                        iconClassName="h-4 w-4"
                      />
                      {editMode && (m.socials?.length ?? 0) === 0 && (
                        <AddChip
                          listPath={`team.members.${i}.socials`}
                          label="social link"
                          className="!px-2.5 !py-1 !text-xs"
                        />
                      )}
                    </div>
                  </div>
                </figcaption>
              </figure>
            </RevealOnScroll>
          ))}
          {editMode && (
            <div className="flex aspect-[5/6] items-center justify-center border border-dashed border-white/15">
              <AddChip listPath="team.members" label="member" />
            </div>
          )}
        </div>
      </Container>

      {/* Drifting letterform grid gathered into the bottom-right corner, just
          above the footer. Held to a corner patch at ordinary widths; once
          there is more viewport than content column, it grows and bleeds in
          across the body rather than staying a small tile in the gutter.
          CtaGrid contains its own paint, so the letters can't spill out. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-[22rem] w-[34rem] max-w-full wide:h-[32rem] wide:w-[min(58vw,72rem)] ultra:h-[40rem] ultra:w-[min(64vw,90rem)]"
      >
        <CtaGrid
          className="team-glyph-grid"
          glyphClassName="bg-white"
          fontClassName="text-white"
          scale={1.5}
        />
      </div>

      {openIdx !== null && members[openIdx] && (
        <MemberCardModal
          members={members}
          index={openIdx}
          onNavigate={setOpenIdx}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </section>
  );
}
