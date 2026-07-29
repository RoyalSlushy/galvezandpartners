"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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

/** How long the spread takes: the last piece's delay plus its travel. */
const EMERGE_SETTLED_MS = 700;
/** How long the sweep takes to clear the viewport, before the card unmounts. */
const SWEEP_MS = 540;

/** One piece's angles and its stagger, which differs between arriving
 * (flowing outward from the centre) and leaving (swept off to the left). */
function piece(
  rot: string,
  spin: string,
  inDelayMs: number,
  outDelayMs: number,
  closing: boolean,
): CSSProperties {
  return {
    ["--rot" as string]: rot,
    ["--spin" as string]: spin,
    animationDelay: `${closing ? outDelayMs : inDelayMs}ms`,
  };
}

/**
 * Pop-up profile for one team member: an isolated polaroid photo card and a
 * separate details card, side by side on desktop and stacked on mobile. They
 * spread outward from a single point at the group's centre, as though the
 * whole set came from one source, and settle at slight opposed angles with
 * the emoji sticker arriving last.
 *
 * Closing sweeps everything off to the left — an arm clearing the table —
 * before the card unmounts, so the component owns the exit rather than
 * vanishing the moment its parent drops it. All of it is CSS keyframes
 * (gp-emerge / gp-sweep / gp-fade-in / gp-fade-out in globals.css).
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

  // The pieces travel outward past their resting places' bounds, so nothing may
  // clip them on the way: scrolling is only switched on once they have settled.
  const reducedMotion = usePrefersReducedMotion();
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (reducedMotion) {
      setLanded(true);
      return;
    }
    const id = window.setTimeout(() => setLanded(true), EMERGE_SETTLED_MS);
    return () => window.clearTimeout(id);
  }, [reducedMotion]);

  // Closing plays the sweep first and unmounts once it has cleared the screen.
  const [closing, setClosing] = useState(false);
  const sweepTimer = useRef<number | undefined>(undefined);
  const requestClose = useCallback(() => {
    if (reducedMotion) {
      onClose();
      return;
    }
    setClosing((already) => {
      if (already) return already;
      sweepTimer.current = window.setTimeout(onClose, SWEEP_MS);
      return true;
    });
  }, [reducedMotion, onClose]);
  useEffect(() => () => window.clearTimeout(sweepTimer.current), []);

  // Each piece flows out from the group's own centre, so it starts life offset
  // by however far its resting place sits from that centre. Measured from
  // layout boxes (offsetLeft/Top ignore transforms, so the animation's own
  // starting transform can't feed back into the measurement) and written as
  // custom properties the keyframes read.
  const groupRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const cx = group.offsetWidth / 2;
    const cy = group.offsetHeight / 2;
    group.querySelectorAll<HTMLElement>("[data-gp-piece]").forEach((el) => {
      el.style.setProperty("--from-x", `${cx - (el.offsetLeft + el.offsetWidth / 2)}px`);
      el.style.setProperty("--from-y", `${cy - (el.offsetTop + el.offsetHeight / 2)}px`);
    });
  }, [member]);

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
        requestClose();
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
  }, [requestClose]);

  // Lock body scroll while open — same fixed-body technique as the mobile
  // drawer (keeps iOS Safari from scrolling behind).
  useEffect(() => {
    const scrollY = window.scrollY;
    const { body, documentElement: html } = document;
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
      // Un-fixing the body drops the page to the top, so it has to be put back
      // — but the site sets `scroll-behavior: smooth` globally (for in-page
      // anchors), which would *animate* that, gliding the page back into place
      // after the card is already gone. Suspend it so the page is restored
      // within this same frame and never appears to move at all.
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      html.style.scrollBehavior = prev;
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
      <div
        aria-hidden
        onClick={requestClose}
        className={`absolute inset-0 bg-black/60 ${closing ? "gp-fade-out" : "gp-fade-in"}`}
      />

      <button
        ref={closeRef}
        type="button"
        onClick={requestClose}
        aria-label={t("Close")}
        className={`absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center bg-navy/80 text-white shadow-lg transition hover:bg-gold hover:text-navy ${
          closing ? "gp-fade-out" : ""
        }`}
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
        onClick={requestClose}
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
            <div
              ref={groupRef}
              className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-stretch sm:gap-10"
            >
              {/* Polaroid photo card — the picture stands on its own, with the
                  tape strip, emoji sticker and glyph initial, plus the classic
                  thick polaroid bottom margin. The sweep takes the rightmost
                  card first, the way an arm crossing the table reaches it. */}
              <div
                data-gp-piece
                style={piece("-2.5deg", "-14deg", 90, 70, closing)}
                className={`relative w-52 shrink-0 self-center bg-white pb-10 shadow-2xl sm:w-80 sm:pb-14 ${
                  closing ? "gp-sweep" : "gp-emerge"
                }`}
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
                {/* Emoji sticker, arriving last. It is stuck to the polaroid,
                    so it rides that card off the table rather than being swept
                    on its own (which would double up the two translations). */}
                {(editMode || member.emoji) && (
                  <EditableText
                    path={`${base}.emoji`}
                    value={member.emoji || "😀"}
                    as="span"
                    style={piece("-12deg", "-60deg", 260, 0, false)}
                    className="gp-emerge absolute -left-3 top-6 z-20 text-5xl drop-shadow-md sm:-left-5 sm:text-6xl"
                  />
                )}
              </div>

              {/* Details card — a separate horizontal card carrying the name,
                  role, the chosen questions and the motto. */}
              <div
                data-gp-piece
                style={piece("1.2deg", "12deg", 0, 0, closing)}
                className={`w-full min-w-0 flex-1 self-center border-b-4 border-gold bg-white px-6 py-6 shadow-2xl sm:px-10 sm:py-9 ${
                  closing ? "gp-sweep" : "gp-emerge"
                }`}
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
