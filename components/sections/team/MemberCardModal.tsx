"use client";

import { useEffect, useRef } from "react";
import { GlyphMark } from "@/components/ui/Glyph";
import type { Member } from "@/content/team";
import { useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import { lastNameInitial, memberPhotoSrc } from "./memberUtils";

/** The quirky fact rows, in display order. Placeholders show only in edit mode
 * (visible on purpose, matching the CMS list-template convention) so admins can
 * click and fill empty fields; visitors never see an empty row. */
const FIELDS = [
  { key: "superpower", label: "Superpower", placeholder: "Add a superpower…" },
  { key: "fuel", label: "Fuel of choice", placeholder: "Add a fuel of choice…" },
  { key: "obsession", label: "Currently obsessed with", placeholder: "Add an obsession…" },
  { key: "hiddenTalent", label: "Hidden talent", placeholder: "Add a hidden talent…" },
] as const;

/**
 * Pop-up "trading card" profile for one team member: tilted polaroid-style
 * card over a dimmed backdrop, with a tape strip, the member's emoji as a
 * corner sticker, their glyph initial behind the photo, and the quirky fact
 * rows. Mounted only while open — the entrance is a mount-time keyframe
 * (gp-card-pop / gp-fade-in in globals.css), so closing simply unmounts.
 */
export default function MemberCardModal({
  member,
  index,
  onClose,
}: {
  member: Member;
  index: number;
  onClose: () => void;
}) {
  const editMode = useEditMode();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode.
  const tv = (s: string) => (editMode ? s : t(s));

  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the close button on open; hand focus back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Escape closes (EditableText stops propagation while a field is being
  // edited, so Escape there only cancels the edit). Tab cycles inside the card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Tab") {
        const card = cardRef.current;
        if (!card) return;
        const focusables = Array.from(
          card.querySelectorAll<HTMLElement>(
            'button, a[href], [contenteditable], [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !card.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !card.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while open — same fixed-body technique as the mobile
  // drawer (keeps iOS Safari from scrolling behind, restores without a jump).
  useEffect(() => {
    const scrollY = window.scrollY;
    const { body } = document;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  const base = `team.members.${index}`;
  const titleId = `member-card-${index}-name`;

  return (
    <div className="fixed inset-0 z-[60]">
      <div aria-hidden onClick={onClose} className="gp-fade-in absolute inset-0 bg-black/60" />
      <div
        className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
        onClick={onClose}
      >
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          className="gp-card-pop relative max-h-[90dvh] w-full max-w-sm overflow-y-auto border-b-4 border-gold bg-white shadow-2xl"
        >
          {/* Gold "tape" strip holding the polaroid down. */}
          <div
            aria-hidden
            className="absolute left-1/2 top-0 z-20 h-5 w-24 -translate-x-1/2 rotate-[-4deg] bg-gold/70"
          />

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className="absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center bg-navy/80 text-white transition hover:bg-gold hover:text-navy"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {/* Photo block mirrors the grid tile: glyph initial behind the
              (cutout) photo. */}
          <div className="relative overflow-hidden bg-cream/60">
            <GlyphMark
              char={lastNameInitial(member.name)}
              tintClassName="bg-navy"
              className="pointer-events-none absolute right-2 top-2 z-0 h-28 w-28 opacity-20"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={memberPhotoSrc(member.photo)}
              alt={member.name}
              className="relative z-10 aspect-[5/6] w-full object-cover"
            />
            {/* Emoji sticker, slapped on over the photo's corner. */}
            {(editMode || member.emoji) && (
              <EditableText
                path={`${base}.emoji`}
                value={member.emoji || "😀"}
                as="span"
                className="absolute left-3 top-3 z-20 rotate-12 text-4xl drop-shadow-md"
              />
            )}
          </div>

          <div className="px-6 pb-6 pt-4">
            <h2 id={titleId} className="font-heading text-2xl tracking-tight text-navy">
              {member.name}
            </h2>
            <p className="mt-0.5 font-din text-xs uppercase text-gold">{tv(member.role)}</p>

            <dl className="mt-4 space-y-3 border-t border-navy/10 pt-4">
              {FIELDS.map(({ key, label, placeholder }) => {
                const value = member[key];
                if (!editMode && !value) return null;
                return (
                  <div key={key}>
                    <dt className="font-din text-[10px] uppercase tracking-[0.15em] text-gold">
                      {tv(label)}
                    </dt>
                    <dd className="mt-0.5 text-sm text-navy">
                      <EditableText
                        path={`${base}.${key}`}
                        value={value ? tv(value) : placeholder}
                        as="span"
                        className={value ? undefined : "italic text-navy/40"}
                      />
                    </dd>
                  </div>
                );
              })}
            </dl>

            {(editMode || member.motto) && (
              <p className="mt-4 border-t border-navy/10 pt-3 text-center font-display italic text-navy/80">
                “
                <EditableText
                  path={`${base}.motto`}
                  value={member.motto ? tv(member.motto) : "Add a motto…"}
                  as="span"
                  className={member.motto ? undefined : "text-navy/40"}
                />
                ”
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
