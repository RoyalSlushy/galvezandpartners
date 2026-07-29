"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GlyphMark } from "@/components/ui/Glyph";
import type { Member } from "@/content/team";
import { useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";
import EditableText from "@/components/admin/editable/EditableText";
import { AddChip } from "@/components/admin/editable/ListControls";
import PromptPicker from "./PromptPicker";
import { lastNameInitial, memberPhotoSrc } from "./memberUtils";

/** Shown in edit mode for a fact whose answer hasn't been filled in yet
 * (visible on purpose, matching the CMS list-template convention). */
const ANSWER_PLACEHOLDER = "Add an answer…";

/** How long the whole deal takes: the last piece's delay plus its flight. */
const DEAL_SETTLED_MS = 900;

/** One dealt piece: where it comes in from, where it lands, and when. `y`
 * defaults to the keyframes' off-screen 110vh; small pieces override it. */
function deal(
  rot: string,
  spin: string,
  delayMs: number,
  extra?: { x?: string; y?: string },
): CSSProperties {
  return {
    ["--deal-rot" as string]: rot,
    ["--deal-spin" as string]: spin,
    ...(extra?.x ? { ["--deal-x" as string]: extra.x } : null),
    ...(extra?.y ? { ["--deal-y" as string]: extra.y } : null),
    animationDelay: `${delayMs}ms`,
  };
}

/**
 * Pop-up profile for one team member, staged like cards dealt onto a surface:
 * an isolated polaroid photo card and a separate details card come in from
 * off-screen below the viewport, spin, skid past their mark and settle at
 * slight opposed angles, with the emoji sticker dealt last. They sit side by
 * side on desktop and stack on mobile.
 *
 * Mounted only while open — the entrances are mount-time keyframes (gp-deal /
 * gp-fade-in in globals.css), so closing simply unmounts.
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
  // Which fact's question picker is open, and where to anchor it.
  const [picking, setPicking] = useState<{ i: number; top: number; left: number } | null>(null);

  // The cards are dealt in from below the bottom of the screen, so nothing may
  // clip them on the way: scrolling is only switched on once they have landed.
  // (A scroll container would both cut the flight short and briefly let the
  // page scroll down to the empty space the incoming cards occupy.)
  const reducedMotion = usePrefersReducedMotion();
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (reducedMotion) {
      setLanded(true);
      return;
    }
    const id = window.setTimeout(() => setLanded(true), DEAL_SETTLED_MS);
    return () => window.clearTimeout(id);
  }, [reducedMotion]);

  // Focus the close button on open; hand focus back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Escape closes (EditableText and the prompt picker stop propagation while
  // they're active, so Escape there only dismisses them). Tab cycles inside.
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
  const factsPath = `${base}.facts`;
  const titleId = `member-card-${index}-name`;
  const facts = member.facts ?? [];
  // Visitors only ever see answered lines; admins see every line so they can
  // fill it in.
  const shown = editMode ? facts : facts.filter((f) => f?.answer);

  return (
    // The dialog is the full-screen layer, so the close button can sit at the
    // viewport corner: a `fixed` child of a tossed card would resolve against
    // that card's transform instead of the viewport.
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[60]"
    >
      <div aria-hidden onClick={onClose} className="gp-fade-in absolute inset-0 bg-black/60" />

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t("Close")}
        className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center bg-navy/80 text-white shadow-lg transition hover:bg-gold hover:text-navy"
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

      <div
        onClick={onClose}
        className={`absolute inset-0 ${landed ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {/* min-h-full + centering keeps a card pair taller than the screen
            fully reachable once scrolling is on, instead of overflowing off
            the top where it can't be scrolled to. */}
        <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md sm:max-w-5xl"
          >
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch sm:gap-10">
              {/* Polaroid photo card — the picture stands on its own, with the
                  tape strip, emoji sticker and glyph initial, plus the classic
                  thick polaroid bottom margin. */}
              <div
                style={deal("-2.5deg", "-24deg", 0, { x: "-6rem" })}
                className="gp-deal relative w-52 shrink-0 self-center bg-white pb-10 shadow-2xl sm:w-80 sm:pb-14"
              >
                <div
                  aria-hidden
                  className="absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rotate-[-4deg] bg-gold/70 sm:h-6 sm:w-32"
                />
                <div className="relative m-3 mb-0 overflow-hidden bg-cream/60 sm:m-4">
                  <GlyphMark
                    char={lastNameInitial(member.name)}
                    tintClassName="bg-navy"
                    className="pointer-events-none absolute right-2 top-2 z-0 h-24 w-24 opacity-20 sm:h-32 sm:w-32"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={memberPhotoSrc(member.photo)}
                    alt={member.name}
                    className="relative z-10 aspect-[5/6] w-full object-cover"
                  />
                </div>
                {/* Emoji sticker, slapped on last. */}
                {(editMode || member.emoji) && (
                  <EditableText
                    path={`${base}.emoji`}
                    value={member.emoji || "😀"}
                    as="span"
                    style={deal("-12deg", "-60deg", 320, { y: "40vh" })}
                    className="gp-deal absolute -left-3 top-6 z-20 text-5xl drop-shadow-md sm:-left-5 sm:text-6xl"
                  />
                )}
              </div>

              {/* Details card — a separate horizontal card carrying the name,
                  role, the chosen questions and the motto. */}
              <div
                style={deal("1.2deg", "18deg", 150, { x: "6rem" })}
                className="gp-deal w-full min-w-0 flex-1 self-center border-b-4 border-gold bg-white px-6 py-6 shadow-2xl sm:px-10 sm:py-9"
              >
                <h2
                  id={titleId}
                  className="font-heading text-3xl tracking-tight text-navy sm:text-4xl"
                >
                  {member.name}
                </h2>
                <p className="mt-1 font-din text-xs uppercase tracking-wide text-gold sm:text-sm">
                  {tv(member.role)}
                </p>

                {(shown.length > 0 || editMode) && (
                  <dl className="mt-6 grid gap-x-10 gap-y-5 border-t border-navy/10 pt-6 sm:grid-cols-2">
                    {shown.map((fact, fi) => (
                      <div key={fi}>
                        <dt className="font-din text-[11px] uppercase tracking-[0.15em] text-gold">
                          {editMode ? (
                            // The question comes from the shared library, so it's
                            // picked rather than typed.
                            <button
                              type="button"
                              title="Choose a question"
                              onClick={(e) => {
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setPicking({
                                  i: fi,
                                  top: Math.min(r.bottom + 6, window.innerHeight - 340),
                                  left: Math.min(r.left, window.innerWidth - 300),
                                });
                              }}
                              className="border-b border-dashed border-gold/60 uppercase transition hover:text-gold-dark"
                            >
                              {fact.prompt || "Choose a question"} ▾
                            </button>
                          ) : (
                            tv(fact.prompt)
                          )}
                        </dt>
                        <dd className="mt-1 text-base text-navy sm:text-lg">
                          <EditableText
                            path={`${factsPath}.${fi}.answer`}
                            value={fact.answer ? tv(fact.answer) : ANSWER_PLACEHOLDER}
                            as="span"
                            label="answer"
                            className={fact.answer ? undefined : "italic text-navy/40"}
                          />
                        </dd>
                      </div>
                    ))}
                    {editMode && (
                      <div className="self-end">
                        <AddChip listPath={factsPath} label="line" className="!px-3 !py-1.5 !text-xs" />
                      </div>
                    )}
                  </dl>
                )}

                {(editMode || member.motto) && (
                  <p className="mt-6 border-t border-navy/10 pt-4 text-center font-display text-lg italic text-navy/80 sm:text-xl">
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
      </div>

      {picking && (
        <PromptPicker
          listPath={factsPath}
          index={picking.i}
          pos={{ top: picking.top, left: picking.left }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
