"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GlyphMark } from "@/components/ui/Glyph";
import type { Member } from "@/content/team";
import { useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";
import { useMinWidth } from "@/components/ui/useMinWidth";
import EditableText from "@/components/admin/editable/EditableText";
import SocialIcons from "@/components/ui/SocialIcons";
import { AddChip } from "@/components/admin/editable/ListControls";
import PromptPicker from "./PromptPicker";
import SideStickers from "./SideStickers";
import { lastNameInitial, memberPhotoSrc, piece, type SweepDir } from "./memberUtils";
import { resolveImage } from "@/lib/adminClient";

/** Shown in edit mode for a fact whose answer hasn't been filled in yet
 * (visible on purpose, matching the CMS list-template convention). */
const ANSWER_PLACEHOLDER = "Add an answer…";

/** How long the spread takes: the last piece's delay plus its travel. */
const EMERGE_SETTLED_MS = 700;
/** How long the sweep takes to clear the viewport, before the card unmounts. */
const SWEEP_MS = 540;
/** Where the entrance originates, as a multiple of the viewport height below
 * its top edge — 2 puts the source a full screen below the bottom edge. */
const ORIGIN_VH = 2;

/** How far a touch must travel to count as a swipe, and how much further it has
 * to go along one axis than the other before that axis wins — enough that a
 * wandering thumb never fires the wrong thing. */
const SWIPE_MIN_PX = 56;
const SWIPE_DOMINANCE = 1.5;

/**
 * One end of the bottom navigation: a chevron plus the name of the person it
 * leads to, anchored to its own side of the viewport.
 *
 * `compact` drops it to the chevron alone. The name is worth its space while
 * there is space; once a phone's profile is opened out there isn't, and the
 * button steps back to the smallest thing that still says which way it goes.
 * The name stays in the button's label either way, so nothing is lost to a
 * screen reader.
 */
function NavButton({
  dir,
  name,
  label,
  disabled,
  compact,
  onClick,
}: {
  dir: "prev" | "next";
  name: string;
  label: string;
  disabled: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  const isPrev = dir === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}: ${name}`}
      className={`pointer-events-auto flex min-w-0 items-center gap-2 border border-white/15 bg-navy/80 text-white shadow-lg backdrop-blur transition-all hover:border-gold hover:text-gold disabled:opacity-40 ${
        compact ? "p-2.5" : "max-w-[45%] px-3 py-2 sm:px-4 sm:py-2.5"
      } ${isPrev ? "" : "flex-row-reverse"}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-4 w-4 shrink-0 ${isPrev ? "" : "rotate-180"}`}
        aria-hidden
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {!compact && (
        <span className={`min-w-0 ${isPrev ? "text-left" : "text-right"}`}>
          <span className="block font-din text-[10px] uppercase tracking-[0.15em] text-gold">
            {label}
          </span>
          <span className="block truncate font-heading text-sm tracking-tight">{name}</span>
        </span>
      )}
    </button>
  );
}

/**
 * Pop-up profile for one team member: an isolated polaroid photo card and a
 * separate details card, side by side on desktop and stacked on mobile. They
 * rise out of a single point well below the viewport, spreading up and outward
 * as though the whole set came from one source, and settle at slight opposed
 * angles with the emoji sticker arriving last.
 *
 * Leaving sweeps everything off the side — an arm clearing the table — so the
 * component owns its exit rather than vanishing the moment its parent drops it.
 * Navigating between people plays that sweep and then the entrance, in that
 * order: the current pair is wiped off before the next one rises. Which side
 * they leave by carries the direction of travel — forward clears to the left,
 * back to the right, closing to the left — so going back reads as retracing
 * your steps. All of it is CSS keyframes (gp-emerge / gp-sweep / gp-fade-in /
 * gp-fade-out in globals.css).
 */
export default function MemberCardModal({
  members,
  index,
  onNavigate,
  onClose,
}: {
  /** The whole roster, so the nav can name the people either side. */
  members: Member[];
  index: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}) {
  const member = members[index];
  const stickers = member.stickers ?? [];
  const count = members.length;
  const memberNameAt = (i: number) => members[i]?.name ?? "";
  const editMode = useEditMode();
  const t = useT();
  const tv = useEditableT();

  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // On a phone the profile arrives as a finished card — the picture, the name,
  // the role — and the rest of it is there for whoever goes looking. Nothing on
  // screen says so: the whole viewport answers to a swipe, and the card is
  // complete enough at rest that it doesn't read as something withheld. 751px is
  // `sm`, the same line the lander and the grid change over at.
  const phone = !useMinWidth(751);
  // Open from the start in an edit session: half the fields an admin has come to
  // fill in live in the opened-out part, and they shouldn't have to find a
  // gesture first.
  const [opened, setOpened] = useState(editMode);
  const extraRef = useRef<HTMLDivElement>(null);
  useEffect(() => setOpened(editMode), [index, editMode]);

  // Which fact's question picker is open, and where to anchor it.
  const [picking, setPicking] = useState<{ i: number; top: number; left: number } | null>(null);

  // The pieces travel in from far below, so nothing may clip them on the way:
  // scrolling is only switched on once they have settled. Re-armed per member,
  // since each navigation plays the entrance again.
  const reducedMotion = usePrefersReducedMotion();
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (reducedMotion) {
      setLanded(true);
      return;
    }
    setLanded(false);
    const id = window.setTimeout(() => setLanded(true), EMERGE_SETTLED_MS);
    return () => window.clearTimeout(id);
  }, [reducedMotion, index]);

  // Leaving always sweeps first; what happens after the pieces have cleared the
  // screen is either unmounting ("close") or swapping in the next member
  // ("nav"), which then plays the entrance again. Tracked as a kind rather than
  // a flag so the chrome can fade on close but stay put across a navigation.
  const [exit, setExit] = useState<null | { kind: "close" | "nav"; dir: SweepDir }>(null);
  const exitingRef = useRef(false);
  const sweepTimer = useRef<number | undefined>(undefined);
  const runExit = useCallback(
    (kind: "close" | "nav", dir: SweepDir, after: () => void) => {
      if (reducedMotion) {
        after();
        return;
      }
      // One sweep at a time: further presses mid-exit are ignored.
      if (exitingRef.current) return;
      exitingRef.current = true;
      setExit({ kind, dir });
      sweepTimer.current = window.setTimeout(after, SWEEP_MS);
    },
    [reducedMotion],
  );
  useEffect(() => () => window.clearTimeout(sweepTimer.current), []);

  const requestClose = useCallback(() => runExit("close", -1, onClose), [runExit, onClose]);
  const goTo = useCallback(
    (to: number, dir: SweepDir) =>
      runExit("nav", dir, () => {
        onNavigate(to);
        setExit(null);
        exitingRef.current = false;
      }),
    [runExit, onNavigate],
  );

  const prevIndex = (index - 1 + count) % count;
  const nextIndex = (index + 1) % count;
  // Forward clears to the left; back clears to the right.
  const goNext = useCallback(() => goTo(nextIndex, -1), [goTo, nextIndex]);
  const goPrev = useCallback(() => goTo(prevIndex, 1), [goTo, prevIndex]);
  const exiting = exit !== null;
  const sweepDir: SweepDir = exit?.dir ?? -1;

  // Every piece flows out of one point below the screen, on the viewport's
  // vertical centre line. Each starts life offset by however far its resting
  // place sits from there.
  //
  // The offset has to be measured rather than assumed, since the two cards sit
  // side by side on desktop and stacked on mobile, and the stickers are dealt to
  // wherever they like down the margins. A piece's own getBoundingClientRect is
  // no use here — it includes the animation's starting transform, which would
  // feed back into the measurement — so its layout position is taken from
  // offsetLeft/offsetTop (which ignore transforms) and converted to viewport
  // coordinates through its offset parent: for the cards the group, for a
  // sticker its own placement wrapper, neither of which is ever animated.
  const groupRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = cardRef.current;
    if (!root) return;
    // Re-measured per member: these pieces are keyed by index, so navigating
    // remounts them and replays their entrance.
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight * ORIGIN_VH;
    root.querySelectorAll<HTMLElement>("[data-gp-piece]").forEach((el) => {
      const parent = el.offsetParent as HTMLElement | null;
      const box = parent?.getBoundingClientRect();
      const cx = (box?.left ?? 0) + el.offsetLeft + el.offsetWidth / 2;
      const cy = (box?.top ?? 0) + el.offsetTop + el.offsetHeight / 2;
      el.style.setProperty("--from-x", `${originX - cx}px`);
      el.style.setProperty("--from-y", `${originY - cy}px`);
    });
  }, [index, stickers.length]);

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
      } else if (e.key === "ArrowLeft") {
        // EditableText stops its own keydowns, so these never fire mid-edit.
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
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
  }, [requestClose, goPrev, goNext]);

  // The whole viewport takes the gesture — the listeners are on the dialog
  // itself, which is the full screen, so a swipe works wherever the thumb
  // happens to land rather than only on the card.
  //
  // Sideways moves between people: left brings the next person in, following the
  // direction the current pair is swept off, and right goes back. Up opens the
  // profile out; down folds it away again, and down on a folded card closes it.
  // Only clearly one-axis gestures count.
  //
  // Touch events rather than pointer events, and `touch-action: none` on the
  // dialog to go with them (see the root element). A browser watching a pointer
  // stream decides part-way through a drag that it is a pan, takes the gesture
  // for itself and fires pointercancel — which killed every real swipe on a
  // phone while looking perfect against synthetic events, since nothing
  // synthetic ever gets taken away. Touch events plus a declaration that this
  // surface pans nothing leaves the gesture where it belongs.
  //
  // A swipe ends in a click on whatever was under the finger, and most of what
  // is under it here closes the card — so a recognised gesture is remembered and
  // that click swallowed.
  const swipedRef = useRef(false);
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    let start: { x: number; y: number; scrolled: boolean } | null = null;

    const onStart = (e: TouchEvent) => {
      swipedRef.current = false;
      const touch = e.changedTouches[0];
      // Ignore a second finger: a pinch is not a swipe.
      if (!touch || e.touches.length > 1) {
        start = null;
        return;
      }
      // A drag begun on the profile's own text, already scrolled down, is that
      // text being read — not the card being folded away.
      const extra = extraRef.current;
      const inExtra = !!extra?.contains(e.target as Node);
      start = {
        x: touch.clientX,
        y: touch.clientY,
        scrolled: inExtra && (extra?.scrollTop ?? 0) > 0,
      };
    };

    const onEnd = (e: TouchEvent) => {
      const from = start;
      const touch = e.changedTouches[0];
      start = null;
      if (!from || !touch) return;
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const act = (run: () => void) => {
        swipedRef.current = true;
        run();
      };

      if (ax >= SWIPE_MIN_PX && ax >= ay * SWIPE_DOMINANCE) {
        act(dx < 0 ? goNext : goPrev);
        return;
      }
      if (!phone || from.scrolled) return;
      if (ay < SWIPE_MIN_PX || ay < ax * SWIPE_DOMINANCE) return;
      if (dy < 0) act(() => setOpened(true));
      else act(() => (opened ? setOpened(false) : requestClose()));
    };

    const onCancel = () => {
      start = null;
    };

    // Capture, so the click is stopped before it reaches the layers that close
    // the card on a press.
    const onClick = (e: MouseEvent) => {
      if (!swipedRef.current) return;
      swipedRef.current = false;
      e.stopPropagation();
      e.preventDefault();
    };

    card.addEventListener("touchstart", onStart, { passive: true });
    card.addEventListener("touchend", onEnd, { passive: true });
    card.addEventListener("touchcancel", onCancel, { passive: true });
    card.addEventListener("click", onClick, true);
    return () => {
      card.removeEventListener("touchstart", onStart);
      card.removeEventListener("touchend", onEnd);
      card.removeEventListener("touchcancel", onCancel);
      card.removeEventListener("click", onClick, true);
    };
  }, [goNext, goPrev, phone, opened, requestClose]);

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
  const stickersPath = `${base}.stickers`;
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
      // Nothing on this surface pans on a phone — the body is locked and the
      // card is folded or opened rather than scrolled — so say so, and the
      // browser stops competing for the drag. Without it a real swipe is taken
      // for a pan half-way through and the gesture never arrives. From sm up the
      // layer below does scroll, so panning is left alone there.
      style={phone ? { touchAction: "none" } : undefined}
      className="fixed inset-0 z-[60]"
    >
      {/* The member's own backdrop fills the screen behind everything — the same
          picture their tile wipes up on hover, so one upload dresses both. It is
          keyed by member, so navigating cross-fades from one person's room to the
          next. Veiled heavily: this is the surface the cards lie on, and the
          white cards have to keep their contrast against it. With none uploaded
          the plain dim backdrop below is all there is, exactly as before. */}
      <div
        aria-hidden
        onClick={requestClose}
        className={`absolute inset-0 overflow-hidden bg-black/60 ${
          exit?.kind === "close" ? "gp-fade-out" : "gp-fade-in"
        }`}
      >
        {member.hoverImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={index}
              src={resolveImage(member.hoverImage, 1600, 1000)}
              alt=""
              className="gp-fade-in h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-navy/55" />
          </>
        )}
      </div>

      <button
        ref={closeRef}
        type="button"
        onClick={requestClose}
        aria-label={t("Close")}
        className={`absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center bg-navy/80 text-white shadow-lg transition hover:bg-gold hover:text-navy ${
          exit?.kind === "close" ? "gp-fade-out" : ""
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
        // On a phone nothing scrolls out here: the card is either folded or
        // opened out, and what runs past the screen scrolls inside the card.
        className={`absolute inset-0 ${
          phone ? "overflow-hidden" : landed ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {/* min-h-full + centering keeps a card pair taller than the screen
            fully reachable once scrolling is on, instead of overflowing off
            the top where it can't be scrolled to. On a phone the stack is
            exactly one screen tall and stands on the bottom edge, so opening it
            out pushes the photograph off the *top* — not past the bottom, where
            it would take the card's own foot out of sight behind the nav. */}
        {/* Extra bottom room so a card never sits under the nav bar. */}
        <div
          className={`flex justify-center p-4 pb-24 sm:p-8 sm:pb-28 ${
            phone ? "h-full items-end" : "min-h-full items-center"
          }`}
        >
          {/* Bounded by the site's own body width (--site-max, which widens on
              ultrawide displays) rather than the raw viewport, so the card
              lines up with the page's content column. Height is governed by the
              polaroid, which takes whichever of width or height binds first. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md sm:max-w-site"
          >
            {/* Keyed by member: navigating remounts the pieces, so their
                entrance keyframes run again for the incoming person. */}
            <div
              key={index}
              ref={groupRef}
              // Centred, because the details card stops widening before the
              // body does — the slack is split either side rather than left.
              // Stacked on a phone with no gap: there the details card is pulled
              // up over the foot of the polaroid instead (see below).
              className="relative flex flex-col items-center sm:flex-row sm:items-stretch sm:justify-center sm:gap-10 xl:gap-14"
            >
              {/* Polaroid photo card — the picture stands on its own, with the
                  tape strip, emoji sticker and glyph initial, plus the classic
                  thick polaroid bottom margin. The sweep takes the rightmost
                  card first, the way an arm crossing the table reaches it. */}
              <div
                data-gp-piece
                style={piece("-2.5deg", "-14deg", 90, { left: 70, right: 0 }, exiting, sweepDir)}
                // On a phone it takes nearly the full width — the two cards are
                // stacked there, so the picture has the whole column to itself
                // and the details card covers its foot. From sm it grows with
                // the viewport but takes whichever of width or height binds
                // first: its photo is 5:6, so sizing on width alone would push
                // it past the bottom of a wide but short screen.
                className={`relative w-[min(20rem,82vw)] shrink-0 self-center bg-white pb-14 shadow-2xl sm:w-80 sm:pb-14 xl:w-[max(20rem,min(26vw,46vh))] ${
                  exiting ? "gp-sweep" : "gp-emerge"
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
                    style={piece("-12deg", "-60deg", 260, { left: 0, right: 0 }, false, sweepDir)}
                    className="gp-emerge absolute -left-3 top-6 z-20 text-5xl drop-shadow-md sm:-left-5 sm:text-6xl"
                  />
                )}
              </div>

              {/* Details card — a separate horizontal card carrying the name,
                  role, the chosen questions and the motto. */}
              <div
                data-gp-piece
                style={piece("1.2deg", "12deg", 0, { left: 0, right: 70 }, exiting, sweepDir)}
                // Capped so the card stops growing before its lines get too
                // long to read, however wide the body gets.
                //
                // On a phone it is pulled up over the foot of the polaroid, so
                // the picture runs behind it and is cut off there rather than
                // sitting in its own box — it comes later in the group, and both
                // are positioned, so it covers rather than is covered.
                className={`relative -mt-14 w-full min-w-0 flex-1 self-center border-b-4 border-gold bg-white px-6 py-6 shadow-2xl sm:mt-0 sm:max-w-[56rem] sm:px-10 sm:py-9 xl:px-14 xl:py-12 ${
                  exiting ? "gp-sweep" : "gp-emerge"
                }`}
              >
                {/* Name and role sit at the left, their social links pushed
                    out to the right edge of the same block. */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2
                      id={titleId}
                      className="font-heading text-3xl tracking-tight text-navy sm:text-4xl"
                    >
                      {member.name}
                    </h2>
                    {/* 1.5x the base caption sizes (12px / 14px). */}
                    <p className="mt-1 font-display text-[1.125rem] uppercase tracking-wide text-gold sm:text-[1.3125rem]">
                      {tv(member.role)}
                    </p>
                  </div>
                  {(member.socials?.length || editMode) && (
                    <div className="flex shrink-0 items-center gap-2">
                      <SocialIcons
                        socials={member.socials ?? []}
                        editPathBase={`${base}.socials`}
                        linkClassName="text-navy/70 hover:text-gold"
                        className="!gap-3"
                        iconClassName="h-5 w-5"
                      />
                      {editMode && (member.socials?.length ?? 0) === 0 && (
                        <AddChip
                          listPath={`${base}.socials`}
                          label="social link"
                          className="!px-2.5 !py-1 !text-xs"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* The blurb: a few sentences on the person and their role.
                    Held to a readable measure rather than the card's full
                    width, and multiline so paragraph breaks can be typed. Part of
                    the card at rest on every screen — it is what the profile is
                    for, and a card that opens on a name and a job title says
                    nothing about the person. */}
                {(editMode || member.bio) && (
                  <p className="mt-5 max-w-prose font-body text-base leading-relaxed text-navy/75 sm:text-lg">
                    <EditableText
                      path={`${base}.bio`}
                      value={
                        member.bio
                          ? tv(member.bio)
                          : "Add a few sentences about this person and their role."
                      }
                      as="span"
                      label="blurb"
                      multiline
                      className={member.bio ? undefined : "italic text-navy/40"}
                    />
                  </p>
                )}

                {/* The short answers and the motto — the small print of the
                    profile — are what a swipe up brings in. Folded away they are
                    clipped to nothing, so the card reads as finished rather than
                    cut off: no torn edge, no handle, no caption inviting the
                    gesture. Opened out this takes as much of the screen as it can
                    without burying the photograph, and scrolls within itself past
                    that (hence pan-y here, against the dialog's touch-action:
                    none).
                    Focus moving into it opens it: without a visible control,
                    that is what keeps the contents reachable from a keyboard.
                    On a wider screen the whole thing simply shows. */}
                <div
                  ref={extraRef}
                  onFocusCapture={phone ? () => setOpened(true) : undefined}
                  style={phone ? { touchAction: "pan-y" } : undefined}
                  className={
                    phone
                      ? `transition-[max-height] duration-300 ease-out motion-reduce:transition-none ${
                          opened
                            ? "max-h-[38dvh] overflow-y-auto overscroll-contain"
                            : "max-h-0 overflow-hidden"
                        }`
                      : undefined
                  }
                >
                  {(shown.length > 0 || editMode) && (
                    <dl className="mt-6 grid gap-x-10 gap-y-5 border-t border-navy/10 pt-6 sm:grid-cols-2">
                      {shown.map((fact, fi) => (
                        <div key={fi}>
                          {/* 1.2x the base 11px. */}
                          <dt className="font-display text-[13.2px] uppercase tracking-[0.15em] text-gold">
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
                  {editMode && (
                    <div className="relative z-40 mt-5 flex justify-center border-t border-navy/10 pt-4">
                      <AddChip
                        listPath={stickersPath}
                        label="sticker"
                        className="!px-3 !py-1.5 !text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Softens the opened-out card's bottom edge, where a long
                    profile runs on past it. Only there while it is open — folded
                    away there is nothing under it to fade. */}
                {phone && opened && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-6 h-10 bg-gradient-to-t from-white via-white/85 to-transparent"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The member's stickers, scattered down the margins either side of the
          card. Keyed by member so each one's set is dealt afresh and rises with
          their cards. Outside the scrolling layer, since they belong to the
          screen's edges rather than to the cards. */}
      <SideStickers
        key={index}
        stickers={stickers}
        listPath={stickersPath}
        exiting={exiting}
        sweepDir={sweepDir}
      />

      {/* Person-to-person navigation, pinned across the bottom of the viewport
          with the previous member at one end and the next at the other (both
          wrap around the list). The bar itself holds still while the cards
          sweep out and the next set rises in, so it stays clickable through a
          run of navigations; it only fades when the whole card closes. The
          wrapper is click-through so it never swallows backdrop presses. */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-stretch justify-between gap-3 px-4 pb-5 sm:px-8 sm:pb-7 ${
          exit?.kind === "close" ? "gp-fade-out" : ""
        }`}
      >
        <NavButton
          dir="prev"
          name={memberNameAt(prevIndex)}
          label={t("Previous")}
          disabled={exiting}
          compact={phone && opened}
          onClick={goPrev}
        />
        <NavButton
          dir="next"
          name={memberNameAt(nextIndex)}
          label={t("Next")}
          disabled={exiting}
          compact={phone && opened}
          onClick={goNext}
        />
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
