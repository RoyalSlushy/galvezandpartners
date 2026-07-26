"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import useFitText from "@/components/ui/useFitText";
import CtaGrid from "@/components/sections/home/CtaGrid";
import { GlyphNumber } from "@/components/ui/Glyph";
import type { Work } from "@/content/work";
import { focusPosition } from "@/lib/wix";
import { PLACEHOLDER_IMG, resolveImage } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

// Card width doubly capped by viewport height (cards are 4:5) so heading +
// track + progress line always fit inside one viewport under the header.
// CARD_W/END_CARD_W are the edit-mode sizes (width-driven at every breakpoint);
// visitors get CARD_FIT/END_CARD_FIT, where the phone card instead derives its
// width from the row height (still 4:5) so header + heading + card + blurb all
// fit inside one viewport.
const CARD_W = "w-[72vw] max-w-[420px] shrink-0 sm:w-[min(34vw,38vh)] md:w-[min(27vw,38vh)]";
const END_CARD_W = "w-[72vw] max-w-[420px] shrink-0 sm:w-[min(30vw,34vh)] md:w-[min(24vw,34vh)]";
const CARD_FIT =
  "h-full w-auto shrink-0 sm:h-auto sm:w-[min(34vw,38vh)] sm:max-w-[420px] md:w-[min(27vw,38vh)]";
const END_CARD_FIT =
  "h-full w-auto shrink-0 sm:h-auto sm:w-[min(30vw,34vh)] sm:max-w-[420px] md:w-[min(24vw,34vh)]";

/**
 * Live min-width media-query flag. Defaults to true (desktop-first) so SSR and
 * the first paint match the wide layout, correcting on mount for narrow screens.
 */
function useMinWidth(px: number): boolean {
  const [match, setMatch] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [px]);
  return match;
}

/**
 * /our-works hero: everything fits in one viewport. The section pins while
 * vertical scroll drives a left-anchored accordion — the widest case sits at a
 * 5:4 ratio stuck to the body's left edge, with upcoming cases queued to its
 * right as 2:5 slivers and passed cases collapsing to narrower 1:5 slivers on
 * the left, fading out of frame. Scrolling down pushes
 * the current widest case out to the left as the next widens into the left slot,
 * on through the cases to a closing gallery panel. Scroll settles snap to
 * whichever case is fully 5:4. A gold progress line tracks the journey. The site header
 * stays pinned at the top for the whole section and slides away only as the
 * gallery scrolls in (see the body[data-gp-pinned-header] rule). The heading is
 * centered and fit to a single line at any width, with the word "speaks"
 * accented in gold under a pulsing halo. A masonry-grid icon rail on the left
 * jumps to the #work-gallery section below the cases.
 *
 * Edit mode and reduced motion swap in a native snap-scroll row (all edit
 * affordances live there), which is also the graceful no-pin fallback.
 */
export default function WorkShowcase({
  items: serverItems,
  heading: serverHeading,
}: {
  items: Work[];
  heading: string;
}) {
  const items = useCmsValue("work.items", serverItems);
  const heading = useCmsValue("work.heading", serverHeading);
  const editMode = useEditMode();
  const reduced = usePrefersReducedMotion();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode
  // (matches WorkGrid). Case-study titles are brand names and stay untranslated.
  const tv = (s: string) => (editMode ? s : t(s));

  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const rowWrapRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const [ready, setReady] = useState(false);

  // The accordion needs room to breathe, so it runs on tablet/desktop (>= the
  // `sm` breakpoint); phones fall back to the native swipe row below.
  const wideEnough = useMinWidth(751);
  // The server and the first client paint both render the static row, so
  // hydration can never mismatch; the scroll-jack accordion is a client-only
  // enhancement that engages after mount (on wide enough, motion-OK screens).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pinned = mounted && !editMode && !reduced && wideEnough;
  // The accordion panels: every case plus the trailing gallery hand-off panel.
  const panelCount = items.length + 1;
  const setPanelRef = (i: number) => (el: HTMLElement | null) => {
    panelRefs.current[i] = el;
  };
  // Blurb shown under the active card, indexed like the panels. Kept in a ref so
  // the scroll loop can read the current copy without re-subscribing.
  const descTexts = [
    ...items.map((w) => tv(w.description ?? "")),
    tv("Every frame on one wall — sort it, filter it, tag it."),
  ];
  const descTextsRef = useRef<string[]>(descTexts);
  descTextsRef.current = descTexts;

  // Accordion geometry: the widest (active) panel is 5:4 (width = 1.25·height)
  // and sticks to the body's left edge. Upcoming cases queued to its right are
  // 2:5 slivers (0.4·height); cases that have passed to the left collapse to
  // narrower 1:5 slivers (0.2·height) and fade out of frame. As scroll advances
  // the active index, the widest slides left, shrinking + fading, while the next
  // widens in from the right.
  const ACTIVE = 1.25; // 5:4
  const RIGHT_COLLAPSED = 0.4; // 2:5, upcoming cases (right of the widest)
  const LEFT_COLLAPSED = 0.2; // 1:5, passed cases (left of the widest), faded
  const GAP = 8; // px, matches the row's gap-2

  useEffect(() => {
    if (!pinned) return;
    // The hook's first paint predates its matchMedia effect — bail sync too.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const rowWrap = rowWrapRef.current;
    const row = rowRef.current;
    const bar = barRef.current;
    if (!section || !sticky || !rowWrap || !row || !bar) return;

    // Pin the site header at the top for the duration of this section (see the
    // body[data-gp-pinned-header] rule); it slides off as the gallery arrives.
    const header = document.querySelector<HTMLElement>("header");
    const root = document.documentElement;
    document.body.setAttribute("data-gp-pinned-header", "");

    const N = panelCount;
    let scrollable = 0;
    let headerH = 0;
    let rowH = 0;
    let bodyLeftPx = 0;
    let raf = 0;
    let ticking = false;
    let lastActive = -1;
    let lastSettled = 0; // the card the accordion last came to rest on

    const measure = () => {
      headerH = header ? header.offsetHeight : 0;
      // The row spans the full viewport (overflow-hidden clips both edges) so
      // cards can overflow into both gutters. The active card is anchored at the
      // body's left edge — measured from the description below it, which sits in
      // the site column.
      bodyLeftPx = descRef.current ? descRef.current.getBoundingClientRect().left : 0;
      const availW = rowWrap.clientWidth - bodyLeftPx; // body-left → viewport right
      const availH = rowWrap.clientHeight;
      // Fill the available height; the upcoming slivers overflow the body to the
      // right and clip at the viewport. Cap the height only so the widest (5:4)
      // card itself still fits within that visible right span (never cut off).
      rowH = Math.max(0, Math.min(availH, availW / ACTIVE));
      row.style.height = `${rowH}px`;
      // Vertical scroll distance driving the accordion: ~0.6 screens per panel.
      const step = Math.max(280, window.innerHeight * 0.6);
      scrollable = (N - 1) * step;
      section.style.height = `${sticky.offsetHeight + scrollable}px`;
    };

    const applyWidths = (a: number) => {
      // Per-panel expansion + width.
      const widths: number[] = new Array(N);
      const exps: number[] = new Array(N);
      for (let i = 0; i < N; i++) {
        const e = Math.max(0, Math.min(1, 1 - Math.abs(a - i)));
        exps[i] = e;
        // Upcoming cases (right of the active index) collapse to a wider 2:5
        // sliver; passed cases (left) collapse to a narrower 1:5 and fade.
        const collapsed = i >= a ? RIGHT_COLLAPSED : LEFT_COLLAPSED;
        widths[i] = rowH * (collapsed + e * (ACTIVE - collapsed));
      }
      // Prefix left edges, then translate the row so the active panel's left edge
      // sits at the body's left edge — passed panels slide off into the left
      // gutter (faded), upcoming ones overflow into the right gutter. The front
      // edge interpolates between neighbours mid-scroll.
      const L: number[] = new Array(N);
      let left = 0;
      for (let i = 0; i < N; i++) {
        L[i] = left;
        left += widths[i] + GAP;
      }
      const k = Math.max(0, Math.min(Math.floor(a), N - 2));
      const frontLeft = N >= 2 ? L[k] + (a - k) * (widths[k] + GAP) : 0;
      row.style.transform = `translate3d(${bodyLeftPx - frontLeft}px,0,0)`;

      for (let i = 0; i < N; i++) {
        const el = panelRefs.current[i];
        if (!el) continue;
        el.style.width = `${widths[i]}px`;
        el.style.setProperty("--exp", exps[i].toFixed(3));
        // Passed panels fade as they overflow into the left gutter (gentle so a
        // faded trail lingers rather than cutting out at once).
        el.style.opacity = String(1 - Math.max(0, Math.min(1, (a - i) / 1.5)));
      }
    };

    // Scroll progress 0→1 across the pinned section. Offset by the header height
    // so the accordion is at a=0 the moment the section pins under the header —
    // no dead zone where scrolling doesn't yet advance a card.
    const progressAt = (rectTop: number) =>
      scrollable > 0 ? Math.max(0, Math.min(1, (headerH - rectTop) / scrollable)) : 0;

    const update = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      // Header release: pinned (top:0) while the section's bottom is more than a
      // header-height below the viewport top; over the final header-height of
      // travel it slides up to -headerH so it clears the frame exactly as the
      // gallery reaches the top.
      const shift = Math.max(0, Math.min(headerH, headerH - rect.bottom));
      root.style.setProperty("--gp-header-top", `${-shift}px`);

      const p = progressAt(rect.top);
      bar.style.transform = `scaleX(${p})`;
      const a = p * (N - 1);
      applyWidths(a);

      // Active-card blurb: swap the text at the (hidden) handoff midpoint, and
      // fade it in as the case settles fully open / out as it hands off.
      const active = Math.max(0, Math.min(N - 1, Math.round(a)));
      const settled = 1 - Math.abs(a - active); // 0.5 mid-handoff … 1 fully open
      const desc = descRef.current;
      if (desc) {
        if (active !== lastActive) {
          lastActive = active;
          desc.textContent = descTextsRef.current[active] ?? "";
        }
        desc.style.opacity = String(Math.max(0, Math.min(1, (settled - 0.5) * 2)));
      }
    };
    // Snap: once scrolling settles, ease to the nearest detent so a case rests
    // fully 5:4 (never mid-squeeze). Uses a custom eased rAF animation with
    // `behavior:"instant"` steps — never the browser's own smooth scroll — so
    // the two can't fight (the source of the earlier jank). A user scroll
    // mid-ease (the position diverging from what we set) cancels it. Only the
    // page-top rest is left alone.
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let snapRaf = 0;
    let snapProgY: number | null = null;
    const cancelSnap = () => {
      if (snapRaf) cancelAnimationFrame(snapRaf);
      snapRaf = 0;
      snapProgY = null;
    };
    // Page Y of the gallery wall's top edge (null before it mounts).
    const galleryTopY = () => {
      const wall = document.getElementById("work-gallery");
      return wall ? window.scrollY + wall.getBoundingClientRect().top : null;
    };
    // Page Y of a detent. 0…N-1 are the accordion's panels (N-1 being the
    // gallery hand-off card); the virtual index N is the gallery wall's own top
    // edge, so the stretch between the last case and the wall — previously a
    // free-scrolling gap — comes to rest at one end or the other.
    const detentY = (i: number) => {
      if (i >= N) return galleryTopY();
      const a = Math.max(0, Math.min(N - 1, i));
      const rect = section.getBoundingClientRect();
      return window.scrollY + rect.top - headerH + (a / (N - 1)) * scrollable;
    };
    // Where the journey currently stands, in that same detent space.
    const currentIndex = () => {
      const p = progressAt(section.getBoundingClientRect().top);
      if (p < 1) return p * (N - 1);
      const end = detentY(N - 1) ?? 0;
      const wall = galleryTopY();
      if (wall == null || wall <= end) return N - 1;
      return N - 1 + Math.max(0, Math.min(1, (window.scrollY - end) / (wall - end)));
    };
    // Ease the page scroll to the detent `targetA`.
    const easeToA = (targetA: number) => {
      const clamped = Math.max(0, Math.min(N, targetA));
      lastSettled = Math.round(clamped);
      if (scrollable <= 0) return;
      const y = detentY(clamped);
      if (y == null) return;
      const startY = window.scrollY;
      const dist = y - startY;
      if (Math.abs(dist) < 1.5) return;
      // Short and decisive: the accordion should read as clicking into place
      // rather than drifting there.
      const dur = Math.min(300, Math.max(130, Math.abs(dist) * 0.5));
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      let startT: number | null = null;
      const frame = (now: number) => {
        if (startT === null) startT = now;
        const t = Math.min(1, (now - startT) / dur);
        const y2 = startY + dist * ease(t);
        snapProgY = y2;
        window.scrollTo({ top: y2, behavior: "instant" });
        if (t < 1) snapRaf = requestAnimationFrame(frame);
        else cancelSnap();
      };
      cancelSnap();
      snapRaf = requestAnimationFrame(frame);
    };
    // Detent snap: once scrolling settles, a nudge in either direction advances a
    // whole card that way (a small scroll means "go to the next card"); a larger
    // move lands on the nearest. The page-top rest is left alone, as is anything
    // past the gallery wall's top edge — the wall itself scrolls freely.
    const runSnap = () => {
      if (scrollable <= 0) return;
      const wall = galleryTopY();
      if (wall != null && window.scrollY > wall + 4) return;
      const current = currentIndex();
      if (current <= 0.015 * (N - 1)) return;
      const d = current - lastSettled;
      let target: number;
      if (Math.abs(d) < 0.05) target = lastSettled; // barely moved → stay put
      else if (Math.abs(d) <= 1) target = lastSettled + Math.sign(d); // nudge → next/prev
      else target = Math.round(current); // larger move → nearest detent
      easeToA(target);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(update);
      }
      // A user scroll during the ease (position diverges from what we set)
      // cancels the snap so the user stays in control.
      if (snapRaf && (snapProgY === null || Math.abs(window.scrollY - snapProgY) > 3)) {
        cancelSnap();
      }
      if (!snapRaf) {
        clearTimeout(idleTimer);
        // Short idle window so a settled scroll is taken into its detent
        // promptly rather than lingering between two cards.
        idleTimer = setTimeout(runSnap, 60);
      }
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    // Keyboard users tabbing into a sliver, or clicking a non-widest card: ease
    // that card into the active (5:4) slot instead of navigating.
    const onFocusIn = (e: Event) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
      if (!target || scrollable <= 0) return;
      const i = Number(target.getAttribute("data-index"));
      if (!Number.isNaN(i)) easeToA(i);
    };
    const onClickCapture = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
      if (!target || scrollable <= 0) return;
      const i = Number(target.getAttribute("data-index"));
      if (Number.isNaN(i)) return;
      const rect = section.getBoundingClientRect();
      const active = Math.round((N - 1) * progressAt(rect.top));
      // Tapping a card that isn't the widest snaps to it rather than opening it.
      if (i !== active) {
        e.preventDefault();
        e.stopPropagation();
        // ...so the page transition must call off the push it just started.
        window.dispatchEvent(new Event("gp:nav-cancel"));
        easeToA(i);
      }
    };

    // Horizontal input also scrolls through the cases: a horizontally-dominant
    // trackpad/wheel gesture (or a horizontal drag) is mapped onto the vertical
    // scroll that drives the accordion.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX !== 0) {
        e.preventDefault();
        cancelSnap();
        window.scrollBy({ top: e.deltaX, behavior: "instant" });
      }
    };
    let touchX = 0;
    let touchY = 0;
    let touchAxis: "" | "x" | "y" = "";
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
      touchAxis = "";
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - touchX;
      const dy = y - touchY;
      if (touchAxis === "") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        touchAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (touchAxis === "x") {
        // Drag left → advance forward (scroll down).
        e.preventDefault();
        cancelSnap();
        window.scrollBy({ top: -dx, behavior: "instant" });
      }
      touchX = x;
      touchY = y;
    };

    // Mouse users can grab the row and drag through the cases the same way —
    // a horizontal pointer drag maps onto the vertical scroll driving the
    // accordion. A real drag (past the threshold) swallows the click on
    // release so the card under the cursor doesn't open.
    let mouseDown = false;
    let mouseDragged = false;
    let mouseX = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      mouseDown = true;
      mouseDragged = false;
      mouseX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!mouseDown) return;
      const dx = e.clientX - mouseX;
      if (!mouseDragged && Math.abs(dx) < 4) return;
      mouseDragged = true;
      mouseX = e.clientX;
      cancelSnap();
      window.scrollBy({ top: -dx, behavior: "instant" });
    };
    const onPointerUp = () => {
      mouseDown = false;
    };
    // Ancestor capture fires before the row's own click handler, so a drag
    // release never opens a card or snap-focuses a sliver.
    const onDragClick = (e: MouseEvent) => {
      if (!mouseDragged) return;
      mouseDragged = false;
      e.preventDefault();
      e.stopPropagation();
      // The page transition starts its outgoing push on any link press, so tell
      // it this one is going nowhere (see PageReveal).
      window.dispatchEvent(new Event("gp:nav-cancel"));
    };
    // Native image drag would hijack the gesture mid-pull.
    const onDragStart = (e: Event) => e.preventDefault();

    measure();
    update();
    lastSettled = Math.round(currentIndex());
    setReady(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    row.addEventListener("focusin", onFocusIn);
    row.addEventListener("click", onClickCapture, true);
    section.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchmove", onTouchMove, { passive: false });
    rowWrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    rowWrap.addEventListener("click", onDragClick, true);
    rowWrap.addEventListener("dragstart", onDragStart);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idleTimer);
      cancelSnap();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      row.removeEventListener("focusin", onFocusIn);
      row.removeEventListener("click", onClickCapture, true);
      section.removeEventListener("wheel", onWheel);
      section.removeEventListener("touchstart", onTouchStart);
      section.removeEventListener("touchmove", onTouchMove);
      rowWrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      rowWrap.removeEventListener("click", onDragClick, true);
      rowWrap.removeEventListener("dragstart", onDragStart);
      // The static branch may reuse these nodes — leave no stale styles behind.
      section.style.height = "";
      row.style.height = "";
      row.style.transform = "";
      bar.style.transform = "";
      for (const el of panelRefs.current) {
        if (el) {
          el.style.width = "";
          el.style.opacity = "";
          el.style.removeProperty("--exp");
        }
      }
      setReady(false);
      // Release the header pin (and its scroll-driven offset).
      document.body.removeAttribute("data-gp-pinned-header");
      root.style.removeProperty("--gp-header-top");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned, panelCount]);

  // Static row: mouse users can grab the row and drag it sideways (touch
  // already scrolls natively). Scroll snap is parked during the drag so the
  // row follows the cursor instead of fighting the detents, and a real drag
  // swallows the release click so the card under the cursor doesn't open.
  const scrollRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pinned) return;
    const scroller = scrollRowRef.current;
    if (!scroller) return;
    let down = false;
    let dragged = false;
    let lastX = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      dragged = false;
      lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      if (!dragged && Math.abs(dx) < 4) return;
      if (!dragged) scroller.style.scrollSnapType = "none";
      dragged = true;
      lastX = e.clientX;
      scroller.scrollLeft -= dx;
    };
    const onUp = () => {
      down = false;
      if (dragged) scroller.style.scrollSnapType = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
      // The page transition starts its outgoing push on any link press, so tell
      // it this one is going nowhere (see PageReveal).
      window.dispatchEvent(new Event("gp:nav-cancel"));
    };
    const onDragStart = (e: Event) => e.preventDefault();
    scroller.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    scroller.addEventListener("click", onClick, true);
    scroller.addEventListener("dragstart", onDragStart);
    return () => {
      scroller.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      scroller.removeEventListener("click", onClick, true);
      scroller.removeEventListener("dragstart", onDragStart);
      scroller.style.scrollSnapType = "";
    };
  }, [pinned, mounted, editMode]);

  // Phone (static row): the cards carry no blurb — a single shared blurb under
  // the row swaps to whichever card sits on the snap anchor, fading between
  // texts (mirrors the pinned accordion's active-card blurb).
  const mobileDescRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!mounted || editMode || wideEnough) return;
    const scroller = scrollRowRef.current;
    const desc = mobileDescRef.current;
    const track = (scroller?.firstElementChild as HTMLElement | null) ?? null;
    if (!scroller || !desc || !track) return;
    let last = 0;
    let raf = 0;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const pick = () => {
      raf = 0;
      const kids = Array.from(track.children) as HTMLElement[];
      if (!kids.length) return;
      // Snap anchor = the scroller's left edge inset by the row's gutter
      // (.gallery-scroll mirrors the same inset as scroll-padding-left).
      const anchor =
        scroller.getBoundingClientRect().left +
        (parseFloat(getComputedStyle(track).paddingLeft) || 0);
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < kids.length; i++) {
        const d = Math.abs(kids[i].getBoundingClientRect().left - anchor);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best === last) return;
      last = best;
      desc.style.opacity = "0";
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => {
        desc.textContent = descTextsRef.current[last] ?? "";
        desc.style.opacity = "1";
      }, 160);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      desc.style.opacity = "";
    };
  }, [mounted, editMode, wideEnough]);

  const cards = items.map((w, i) => {
    const inner = (
      <div className={editMode ? "relative" : "relative h-full sm:h-auto"}>
        {/* Outlined index overlapping the card */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-7 left-2 z-10 font-display text-[4.5rem] leading-none text-stroke-white opacity-60 sm:-top-9 sm:text-[5.5rem]"
        >
          <GlyphNumber value={String(i + 1).padStart(2, "0")} tintClassName="bg-white" />
        </span>
        {editMode && (
          <ListControls
            listPath="work.items"
            index={i}
            count={items.length}
            label="work item"
            className="right-2 top-2"
          />
        )}
        <div
          className={`group relative overflow-hidden bg-navy-soft${
            editMode ? "" : " aspect-[4/5] h-full max-w-[85vw] sm:h-auto sm:max-w-none"
          }`}
        >
          <div
            data-parallax
            className={`will-change-transform${editMode ? "" : " h-full"}`}
            style={{ transform: "scale(1.12)" }}
          >
            <EditableImage
              path={`work.items.${i}.img`}
              raw={w.img}
              src={w.img ? resolveImage(w.img, 700, 875) : PLACEHOLDER_IMG}
              // The CMS focal point keeps the important part of the frame in
              // view under the crop (defaults to centre when unset).
              style={{ objectPosition: focusPosition(w.img) }}
              alt={w.title}
              className={editMode ? "aspect-[4/5] w-full object-cover" : "h-full w-full object-cover"}
            />
          </div>
          <div
            className={`absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/15 to-transparent transition-opacity duration-500${
              editMode ? " pointer-events-none" : ""
            }`}
          />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="flex items-end justify-between gap-3">
              <EditableText
                path={`work.items.${i}.title`}
                value={w.title}
                as="h2"
                className="font-heading text-f8 leading-tight text-white"
                link={{
                  path: `work.items.${i}.slug`,
                  value: w.slug ?? "",
                  kind: "slug",
                  createCaseStudy: true,
                }}
              />
              {w.slug && (
                <span
                  aria-hidden
                  className="mb-1 flex h-10 w-10 shrink-0 translate-y-3 items-center justify-center bg-gold text-navy opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Description sits under the card (out of the image), matching the
            desktop accordion's blurb. Phones move it out of the row entirely —
            into the shared blurb under the track — so it hides here (edit mode
            keeps it in place so each case stays editable). */}
        <EditableText
          path={`work.items.${i}.description`}
          value={w.description}
          as="p"
          multiline
          className={`mt-3 line-clamp-2 whitespace-pre-line font-body text-sm text-white/70${
            editMode ? "" : " hidden sm:block"
          }`}
        />
      </div>
    );
    const rootW = editMode ? CARD_W : CARD_FIT;
    const offset = i % 2 === 1 ? "sm:mt-6" : "";
    return w.slug && !editMode ? (
      <Link
        key={i}
        href={`/case-study/${w.slug}`}
        aria-label={w.title}
        className={`${rootW} ${offset} snap-start`}
      >
        {inner}
      </Link>
    ) : (
      <div key={i} className={`${rootW} ${offset} snap-start`}>
        {inner}
      </div>
    );
  });

  // Closing card carries the hand-off to the gallery wall below.
  const endCard = (
    <a
      href="#work-gallery"
      className={`flex ${editMode ? END_CARD_W : END_CARD_FIT} snap-start items-center`}
    >
      <div
        className={`relative flex aspect-[4/5] flex-col items-start justify-center overflow-hidden border border-gold/25 bg-gradient-to-br from-navy-soft to-navy p-5 sm:p-7 ${
          editMode ? "w-full" : "h-full max-w-[85vw] sm:h-auto sm:w-full sm:max-w-none"
        }`}
      >
        <CtaGrid
          className="glyph-grid-fade-left"
          glyphClassName="bg-gold"
          fontClassName="text-gold"
          scale={1.25}
        />
        <p className="relative font-display text-f5 lowercase leading-[0.95] text-gold">{tv("the gallery")}</p>
        <p className="relative mt-2 font-body text-base text-white/60 sm:mt-3">
          {tv("Every frame on one wall — sort it, filter it, tag it.")}
        </p>
        <span className="btn-outline relative mt-5 sm:mt-7">{tv("explore")}</span>
      </div>
    </a>
  );

  if (!pinned) {
    // Visitors' phones get a one-viewport layout: the section fills the screen
    // under the site header as a column — heading, then the card row (which
    // flexes and sizes the 4:5 cards from its height), then the shared blurb —
    // so header + heading + case + description all fit with no vertical scroll.
    // sm+ (edit mode, reduced motion) keeps the width-driven static row.
    return (
      <section
        key="ws-static"
        className={`relative w-full overflow-hidden bg-navy ${
          editMode
            ? "py-16 sm:py-20"
            : "flex h-[calc(100svh-var(--header-h))] flex-col pb-4 pt-3 sm:block sm:h-auto sm:py-20"
        }`}
      >
        <GalleryRail label={tv("gallery")} />
        <Container>
          <RevealOnScroll>
            <ShowcaseHeading heading={heading} display={tv(heading)} editMode={editMode} />
          </RevealOnScroll>
        </Container>
        <div
          ref={scrollRowRef}
          className={`gallery-scroll cursor-grab snap-x snap-mandatory overflow-x-auto active:cursor-grabbing ${
            editMode ? "mt-10 pb-6 pt-10" : "mt-2 min-h-0 flex-1 pb-2 pt-8 sm:mt-10 sm:flex-none sm:pb-6 sm:pt-10"
          }`}
        >
          <div
            className={`gallery-pad flex w-max items-start gap-6 sm:gap-8 ${
              editMode ? "" : "h-full sm:h-auto"
            }`}
          >
            {cards}
            {endCard}
          </div>
        </div>
        {!editMode && (
          // Left-aligned to the site gutter (matching the cards/heading) but its
          // right edge stops short of the floating nav icon at the bottom-right
          // (a w-12 / 3rem circle inset right-4 / 1rem — see MobileMenu), so the
          // blurb never runs underneath it. Width ≈ 100vw − that icon column.
          <div className="mt-3 pl-5 pr-[4.75rem] sm:hidden">
            <p
              ref={mobileDescRef}
              className="line-clamp-3 h-[4.3rem] font-body text-sm leading-relaxed text-white/70 transition-opacity duration-300"
            >
              {descTexts[0]}
            </p>
          </div>
        )}
        {editMode && (
          <Container className="mt-6">
            <AddChip listPath="work.items" label="work item" />
          </Container>
        )}
      </section>
    );
  }

  return (
    <section key="ws-pinned" ref={sectionRef} className="relative w-full bg-navy">
      {/* Pinned below the sticky site header (top = --header-h) and sized to the
          remaining viewport, so the header and this content together fill the
          screen with nothing cut off. The header slides away as the section
          ends (see the effect). */}
      <div
        ref={stickyRef}
        className="sticky top-[var(--header-h)] overflow-hidden"
        style={{ height: "calc(100svh - var(--header-h))" }}
      >
        <div className="flex h-full flex-col justify-center pt-2 pb-6">
          <GalleryRail label={tv("gallery")} />
          <Container>
            <ShowcaseHeading heading={heading} display={tv(heading)} editMode={editMode} />
          </Container>
          {/* Accordion row: the active panel is 5:4 and anchored to the body's
              left edge (aligned with the heading and the gallery below). The row
              spans the full viewport (overflow-hidden), so upcoming cases overflow
              into the right gutter and passed cases overflow into the left gutter,
              faded — both clipping at the viewport edges. Widths, the row's
              translate, per-panel fade, corner radius, and the label cross-fade
              are all driven imperatively (see the effect). */}
          <div
            ref={rowWrapRef}
            className="mt-6 flex min-h-0 w-full flex-1 cursor-grab items-center overflow-hidden active:cursor-grabbing"
          >
            <div
              ref={rowRef}
              className="flex shrink-0 items-stretch gap-2 transition-opacity duration-500 will-change-transform"
              style={{ opacity: ready ? 1 : 0 }}
            >
              {items.map((w, i) => (
                <AccordionPanel
                  key={i}
                  refCb={setPanelRef(i)}
                  index={i}
                  href={w.slug ? `/case-study/${w.slug}` : undefined}
                  label={w.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={w.img ? resolveImage(w.img, 900, 900) : PLACEHOLDER_IMG}
                    alt={w.title}
                    style={{ objectPosition: focusPosition(w.img) }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/15 to-transparent" />
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 overflow-hidden p-4 sm:p-5"
                    style={{ opacity: "var(--exp, 0)" }}
                  >
                    <div className="min-w-0">
                      <span aria-hidden className="block font-display text-f7 leading-none text-gold/70">
                        <GlyphNumber value={String(i + 1).padStart(2, "0")} tintClassName="bg-gold/70" />
                      </span>
                      <span className="mt-1 block truncate font-heading text-f8 leading-tight text-white">
                        {w.title}
                      </span>
                    </div>
                    {w.slug && (
                      <span
                        aria-hidden
                        className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center bg-gold text-navy"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                          <path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </div>
                </AccordionPanel>
              ))}
              <AccordionPanel
                refCb={setPanelRef(items.length)}
                index={items.length}
                href="#work-gallery"
                label={tv("the gallery")}
                variant="gallery"
              >
                <div
                  className="absolute inset-0 flex flex-col justify-center overflow-hidden p-5 sm:p-6"
                  // The accordion rewrites this opacity every frame as the card
                  // expands; the hint keeps that on the compositor instead of
                  // repainting the letter grid behind the copy each time.
                  style={{ opacity: "var(--exp, 0)", willChange: "opacity" }}
                >
                  {/* coverAspect: this card's width animates from a sliver to
                      5:4, so the grid is built once at its widest and clipped
                      until then — the expansion never re-renders it. */}
                  <CtaGrid
                    className="glyph-grid-fade-left"
                    glyphClassName="bg-gold"
                    fontClassName="text-gold"
                    scale={1.25}
                    coverAspect={1.35}
                  />
                  <p className="relative font-display text-f5 lowercase leading-[0.95] text-gold">
                    {tv("the gallery")}
                  </p>
                  <p className="relative mt-3 font-body text-sm text-white/60">
                    {tv("Every frame on one wall — sort it, filter it, tag it.")}
                  </p>
                  <span className="btn-outline relative mt-6 w-fit">{tv("explore")}</span>
                </div>
              </AccordionPanel>
            </div>
          </div>
          {/* Blurb for the active (widest) card — text + fade driven by the
              effect as the accordion settles. */}
          <Container className="mt-4">
            <p
              ref={descRef}
              className="line-clamp-2 max-w-xl font-body text-sm leading-relaxed text-white/70 transition-opacity duration-300"
            >
              {tv(items[0]?.description ?? "")}
            </p>
          </Container>
          {/* Progress line for the journey through the cases. It runs full width
              as the last of them lands, where the gallery section below picks it
              up and opens it into its own band (see WorkGallery). */}
          <Container className="mt-4">
            <div className="h-px w-full bg-white/10">
              <div ref={barRef} className="h-full origin-left scale-x-0 bg-gold" />
            </div>
          </Container>
        </div>
      </div>
    </section>
  );
}

/**
 * One accordion panel: a fixed-height column whose width, opacity, and corner
 * are driven imperatively (--exp, 0→1) between a sliver (2:5 when upcoming,
 * 1:5 once passed) and a 5:4 active card. The vertical label shows
 * while collapsed and cross-fades out
 * as the panel expands; `children` (image + active overlay) fade in the other
 * way. Links to its case study (or the gallery); non-slug cases render as a
 * plain div.
 */
function AccordionPanel({
  refCb,
  index,
  href,
  label,
  variant = "case",
  children,
}: {
  refCb: (el: HTMLElement | null) => void;
  index: number;
  href?: string;
  label: string;
  variant?: "case" | "gallery";
  children: React.ReactNode;
}) {
  const cls =
    variant === "gallery"
      ? "group relative h-full shrink-0 overflow-hidden border border-gold/25 bg-gradient-to-br from-navy-soft to-navy"
      : "group relative h-full shrink-0 overflow-hidden bg-navy-soft";
  const inner = (
    <>
      {children}
      {/* Vertical label shown while the panel is a collapsed sliver. It clears
          out over the first half of the widening (gone by --exp 0.5, not 1) so
          the card's own copy has the frame to itself well before it settles. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-2"
        style={{ opacity: "calc(1 - 2 * var(--exp, 0))" }}
      >
        <span
          // The light drop shadow lifts the label off whatever frame sits
          // behind the collapsed sliver.
          className={`font-heading text-sm uppercase tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] ${
            variant === "gallery" ? "text-gold" : "text-white/90"
          }`}
          style={{ writingMode: "vertical-rl" }}
        >
          {label}
        </span>
      </span>
    </>
  );
  const style = { "--exp": 0 } as React.CSSProperties;
  if (href?.startsWith("#")) {
    return (
      <a ref={refCb} data-index={index} href={href} aria-label={label} className={cls} style={style}>
        {inner}
      </a>
    );
  }
  if (href) {
    return (
      <Link ref={refCb} data-index={index} href={href} aria-label={label} className={cls} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <div ref={refCb} data-index={index} className={cls} style={style}>
      {inner}
    </div>
  );
}

/**
 * The showcase heading, in two responsive treatments (both skip wrapping and
 * binary-search-fit their type to the container width):
 *
 * - sm+: one centered line. The verb of the default heading is accented in
 *   gold with a pulsing halo — matched on the "speak"/"habla" stem so it lands
 *   on the right word in both the English source and its Spanish translation.
 * - Phones: three stepped lines split around that accent word — "our work"
 *   ranged left, "speaks" centered at 1.5× the size (keeping its halo), "for
 *   itself" ranged right — set on tightened leading. Headings without an
 *   accent word keep the single-line treatment everywhere.
 *
 * Edit mode falls back to the plain editable field (bound to the untranslated
 * source).
 */
function ShowcaseHeading({
  heading,
  display,
  editMode,
}: {
  heading: string;
  display: string;
  editMode: boolean;
}) {
  const { ref } = useFitText<HTMLDivElement>({
    max: 150,
    min: 16,
    singleLine: true,
    deps: [display, editMode],
  });
  // Separate fit for the phone treatment: singleLine only constrains width, so
  // with each line kept nowrap it sizes the block until the widest of the three
  // lines spans the container.
  const { ref: mobileRef } = useFitText<HTMLDivElement>({
    max: 110,
    min: 14,
    singleLine: true,
    deps: [display, editMode],
  });

  if (editMode) {
    return (
      <EditableText
        path="work.heading"
        value={heading}
        as="h1"
        className="text-center font-display text-f2 lowercase text-white"
      />
    );
  }

  const halo = (word: string) => (
    <span className="halo-word">
      <span aria-hidden className="halo-ring" />
      <span aria-hidden className="halo-ring halo-ring-late" />
      <span className="relative">{word}</span>
    </span>
  );

  const words = display.split(/\s+/).filter(Boolean);
  const accentIdx = words.findIndex((w) => /speak|habla/i.test(w));

  let accented = false;
  const tokens = display.split(/(\s+)/).map((token, i) => {
    if (!accented && /speak|habla/i.test(token)) {
      accented = true;
      return <span key={i}>{halo(token)}</span>;
    }
    return token;
  });

  const singleLine = (
    // The fitted size lives on this box; the h1 inherits it (preflight sets
    // headings to font-size: inherit). overflow-visible lets the "speaks" glow
    // spill past the text box; the fit still measures scrollWidth (the absolute
    // halo rings are out of flow). text-f2 is only the pre-hydration fallback.
    <div
      ref={ref}
      className={`whitespace-nowrap py-[0.3em] text-center text-f2${
        accentIdx < 0 ? "" : " hidden sm:block"
      }`}
    >
      <h1 className="font-display lowercase leading-none text-white">{tokens}</h1>
    </div>
  );

  if (accentIdx < 0) return singleLine;

  const pre = words.slice(0, accentIdx).join(" ");
  const accent = words[accentIdx];
  const post = words.slice(accentIdx + 1).join(" ");

  return (
    <>
      <div ref={mobileRef} className="whitespace-nowrap py-[0.3em] text-f2 sm:hidden">
        <h1 className="font-display lowercase leading-[0.85] text-white">
          {pre && <span className="block text-left">{pre}</span>}
          <span className="block text-center text-[1.5em]">{halo(accent)}</span>
          {post && <span className="block text-right">{post}</span>}
        </h1>
      </div>
      {singleLine}
    </>
  );
}

/**
 * Rail centered in the "handle" — the gutter to the left of the site column
 * (which is where the widest case is anchored). A masonry-grid icon plus a
 * vertical label that jump to the #work-gallery wall. Horizontally centered in
 * the space between the viewport edge and the body's left edge; clamped to the
 * viewport edge on narrow screens where the handle runs out.
 */
function GalleryRail({ label }: { label: string }) {
  return (
    <a
      href="#work-gallery"
      aria-label="Jump to the gallery"
      // Body left edge = outer gutter + the column's 2rem padding; centre of the
      // handle is half that, minus half the icon's width (1.5rem).
      style={{
        left: "max(0.25rem, calc(((100vw - min(100vw, var(--site-max, 1200px))) / 2 + 2rem) / 2 - 1.5rem))",
      }}
      className="group absolute top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-3"
    >
      <span className="flex h-11 w-11 items-center justify-center border border-gold/30 bg-navy/75 text-gold shadow-lg backdrop-blur transition group-hover:border-gold group-hover:bg-gold group-hover:text-navy sm:h-12 sm:w-12">
        <MasonryIcon className="h-5 w-5" />
      </span>
      <span
        aria-hidden
        className="hidden font-heading text-[11px] uppercase tracking-[0.3em] text-white/50 transition group-hover:text-gold sm:block"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </span>
    </a>
  );
}

function MasonryIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="8" height="12" rx="1.5" />
      <rect x="13" y="3" width="8" height="7" rx="1.5" />
      <rect x="13" y="12" width="8" height="9" rx="1.5" />
      <rect x="3" y="17" width="8" height="4" rx="1.5" />
    </svg>
  );
}
