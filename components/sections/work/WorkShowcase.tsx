"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import useFitText from "@/components/ui/useFitText";
import { GlyphNumber } from "@/components/ui/Glyph";
import type { Work } from "@/content/work";
import { wixImage } from "@/lib/wix";
import { PLACEHOLDER_IMG } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

// Card width doubly capped by viewport height (cards are 4:5) so heading +
// track + progress line always fit inside one viewport under the header.
const CARD_W = "w-[72vw] max-w-[420px] shrink-0 sm:w-[min(34vw,38vh)] md:w-[min(27vw,38vh)]";
const END_CARD_W = "w-[72vw] max-w-[420px] shrink-0 sm:w-[min(30vw,34vh)] md:w-[min(24vw,34vh)]";

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
 * the left, fading out of frame (all rounder-cornered). Scrolling down pushes
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
  // widens in from the right. Corner radius eases from R_ACTIVE (widest) to
  // R_SLIVER (fully collapsed).
  const ACTIVE = 1.25; // 5:4
  const RIGHT_COLLAPSED = 0.4; // 2:5, upcoming cases (right of the widest)
  const LEFT_COLLAPSED = 0.2; // 1:5, passed cases (left of the widest), faded
  const GAP = 8; // px, matches the row's gap-2
  const R_ACTIVE = 16;
  const R_SLIVER = 40;

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
    let raf = 0;
    let ticking = false;
    let lastActive = -1;

    const measure = () => {
      headerH = header ? header.offsetHeight : 0;
      // rowWrap spans from the body's left edge to the viewport's right edge.
      const availW = rowWrap.clientWidth;
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
      // Prefix left edges, then translate the whole row so the active panel's
      // left edge sits at the row's start (x=0) — earlier panels are pushed off
      // to the left. The front edge interpolates between neighbours mid-scroll.
      const L: number[] = new Array(N);
      let left = 0;
      for (let i = 0; i < N; i++) {
        L[i] = left;
        left += widths[i] + GAP;
      }
      const k = Math.max(0, Math.min(Math.floor(a), N - 2));
      const frontLeft = N >= 2 ? L[k] + (a - k) * (widths[k] + GAP) : 0;
      row.style.transform = `translate3d(${-frontLeft}px,0,0)`;

      for (let i = 0; i < N; i++) {
        const el = panelRefs.current[i];
        if (!el) continue;
        el.style.width = `${widths[i]}px`;
        el.style.setProperty("--exp", exps[i].toFixed(3));
        // Panels left of the active one fade as they're pushed out of frame.
        el.style.opacity = String(1 - Math.max(0, Math.min(1, a - i)));
        // Rounder corners the more collapsed the panel is.
        el.style.borderRadius = `${R_ACTIVE + (1 - exps[i]) * (R_SLIVER - R_ACTIVE)}px`;
      }
    };

    const update = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      // Header release: pinned (top:0) while the section's bottom is more than a
      // header-height below the viewport top; over the final header-height of
      // travel it slides up to -headerH so it clears the frame exactly as the
      // gallery reaches the top.
      const shift = Math.max(0, Math.min(headerH, headerH - rect.bottom));
      root.style.setProperty("--gp-header-top", `${-shift}px`);

      const p = scrollable > 0 ? Math.max(0, Math.min(1, -rect.top / scrollable)) : 0;
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
    // Snap: once scrolling settles, ease to the nearest integer active index so a
    // case rests fully 5:4 (never mid-squeeze). Uses a custom eased rAF animation
    // with `behavior:"instant"` steps — never the browser's own smooth scroll —
    // so the two can't fight (the source of the earlier jank). A user scroll
    // mid-ease (the position diverging from what we set) cancels it. The very
    // ends are left alone — the page-top rest and the gallery hand-off.
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let snapRaf = 0;
    let snapProgY: number | null = null;
    const cancelSnap = () => {
      if (snapRaf) cancelAnimationFrame(snapRaf);
      snapRaf = 0;
      snapProgY = null;
    };
    const runSnap = () => {
      if (scrollable <= 0) return;
      const rect = section.getBoundingClientRect();
      const p = -rect.top / scrollable;
      if (p <= 0.015 || p >= 0.985) return;
      const targetP = Math.round(p * (N - 1)) / (N - 1);
      const startY = window.scrollY;
      const dist = rect.top + targetP * scrollable; // scroll delta to the target
      if (Math.abs(dist) < 1.5) return;
      const dur = Math.min(420, Math.max(200, Math.abs(dist) * 0.9));
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      let startT: number | null = null;
      const frame = (now: number) => {
        if (startT === null) startT = now;
        const t = Math.min(1, (now - startT) / dur);
        const y = startY + dist * ease(t);
        snapProgY = y;
        window.scrollTo({ top: y, behavior: "instant" });
        if (t < 1) snapRaf = requestAnimationFrame(frame);
        else cancelSnap();
      };
      cancelSnap();
      snapRaf = requestAnimationFrame(frame);
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
        idleTimer = setTimeout(runSnap, 120);
      }
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    // Keyboard users tabbing into a collapsed sliver: drive the page scroll so
    // that panel becomes the active (4:5) one, bringing it into full view.
    const onFocusIn = (e: Event) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
      if (!target || scrollable <= 0) return;
      const i = Number(target.getAttribute("data-index"));
      if (Number.isNaN(i)) return;
      const rect = section.getBoundingClientRect();
      const targetTop = (-scrollable * i) / (N - 1);
      const delta = rect.top - targetTop;
      if (Math.abs(delta) > 4) window.scrollBy({ top: delta });
    };

    measure();
    update();
    setReady(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    row.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idleTimer);
      cancelSnap();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      row.removeEventListener("focusin", onFocusIn);
      // The static branch may reuse these nodes — leave no stale styles behind.
      section.style.height = "";
      row.style.height = "";
      row.style.transform = "";
      bar.style.transform = "";
      for (const el of panelRefs.current) {
        if (el) {
          el.style.width = "";
          el.style.opacity = "";
          el.style.borderRadius = "";
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

  const cards = items.map((w, i) => {
    const inner = (
      <div className="relative">
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
        <div className="group relative overflow-hidden rounded-2xl bg-navy-soft">
          <div data-parallax className="will-change-transform" style={{ transform: "scale(1.12)" }}>
            <EditableImage
              path={`work.items.${i}.img`}
              raw={w.img}
              src={
                w.img
                  ? w.img.startsWith("http")
                    ? w.img
                    : wixImage(w.img, 700, 875)
                  : PLACEHOLDER_IMG
              }
              alt={w.title}
              className="aspect-[4/5] w-full object-cover"
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
                  className="mb-1 flex h-10 w-10 shrink-0 translate-y-3 items-center justify-center rounded-full bg-gold text-navy opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </div>
            <EditableText
              path={`work.items.${i}.description`}
              value={w.description}
              as="p"
              multiline
              className="mt-1.5 line-clamp-2 whitespace-pre-line font-body text-sm text-white/70"
            />
          </div>
        </div>
      </div>
    );
    const offset = i % 2 === 1 ? "sm:mt-6" : "";
    return w.slug && !editMode ? (
      <Link
        key={i}
        href={`/case-study/${w.slug}`}
        aria-label={w.title}
        className={`${CARD_W} ${offset} snap-start`}
      >
        {inner}
      </Link>
    ) : (
      <div key={i} className={`${CARD_W} ${offset} snap-start`}>
        {inner}
      </div>
    );
  });

  // Closing card carries the hand-off to the gallery wall below.
  const endCard = (
    <a href="#work-gallery" className={`flex ${END_CARD_W} snap-start items-center`}>
      <div className="flex aspect-[4/5] w-full flex-col items-start justify-center rounded-2xl border border-gold/25 bg-gradient-to-br from-navy-soft to-navy p-7">
        <p className="font-display text-f5 lowercase leading-[0.95] text-gold">{tv("the gallery")}</p>
        <p className="mt-3 font-body text-base text-white/60">
          {tv("Every frame on one wall — sort it, filter it, tag it.")}
        </p>
        <span className="btn-outline mt-7">{tv("explore")}</span>
      </div>
    </a>
  );

  if (!pinned) {
    return (
      <section key="ws-static" className="relative w-full overflow-hidden bg-navy py-16 sm:py-20">
        <GalleryRail label={tv("gallery")} />
        <Container>
          <RevealOnScroll>
            <ShowcaseHeading heading={heading} display={tv(heading)} editMode={editMode} />
          </RevealOnScroll>
        </Container>
        <div className="gallery-scroll mt-10 snap-x snap-mandatory overflow-x-auto pb-6 pt-10">
          <div className="gallery-pad flex w-max items-start gap-6 sm:gap-8">
            {cards}
            {endCard}
          </div>
        </div>
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
        <div className="flex h-full flex-col justify-center">
          <GalleryRail label={tv("gallery")} />
          <Container>
            <ShowcaseHeading heading={heading} display={tv(heading)} editMode={editMode} />
          </Container>
          {/* Accordion row: the active panel is 5:4 and stuck to the body's left
              edge (aligned with the heading and the gallery below); the upcoming
              cases queue to its right as 2:5 slivers and are free to overflow the
              body to the right, clipping at the viewport edge. Passed cases exit
              left and clip at the body edge. The box's left margin is the body's
              left edge and it stretches to the viewport right, so overflow-hidden
              clips the left at the body edge and the right at the viewport.
              Widths, the row's translate, per-panel fade, corner radius, and the
              label cross-fade are all driven imperatively (see the effect). */}
          <div
            ref={rowWrapRef}
            className="mt-6 flex min-h-0 flex-1 items-center overflow-hidden"
            style={{
              marginLeft: "calc((100vw - min(100vw, var(--site-max, 1200px))) / 2 + 2rem)",
            }}
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
                    src={
                      w.img
                        ? w.img.startsWith("http")
                          ? w.img
                          : wixImage(w.img, 900, 900)
                        : PLACEHOLDER_IMG
                    }
                    alt={w.title}
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
                        className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-navy"
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
                  style={{ opacity: "var(--exp, 0)" }}
                >
                  <p className="font-display text-f5 lowercase leading-[0.95] text-gold">
                    {tv("the gallery")}
                  </p>
                  <p className="mt-3 font-body text-sm text-white/60">
                    {tv("Every frame on one wall — sort it, filter it, tag it.")}
                  </p>
                  <span className="btn-outline mt-6 w-fit">{tv("explore")}</span>
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
 * radius are driven imperatively (--exp, 0→1) between a rounder sliver (2:5 when
 * upcoming, 1:5 once passed) and a 5:4 active card. The vertical label shows
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
      ? "group relative h-full shrink-0 overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-navy-soft to-navy"
      : "group relative h-full shrink-0 overflow-hidden rounded-2xl bg-navy-soft";
  const inner = (
    <>
      {children}
      {/* Vertical label shown while the panel is a collapsed sliver. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-2"
        style={{ opacity: "calc(1 - var(--exp, 0))" }}
      >
        <span
          className={`font-heading text-sm uppercase tracking-wide ${
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
 * Centered heading, binary-search-fitted to exactly one line at any viewport
 * width (it never wraps). The verb of the default heading is accented in gold
 * with a pulsing halo — matched on the "speak"/"habla" stem so it lands on the
 * right word in both the English source and its Spanish translation. Edit mode
 * falls back to the plain editable field (bound to the untranslated source).
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

  let accented = false;
  const tokens = display.split(/(\s+)/).map((token, i) => {
    if (!accented && /speak|habla/i.test(token)) {
      accented = true;
      return (
        <span key={i} className="halo-word">
          <span aria-hidden className="halo-ring" />
          <span aria-hidden className="halo-ring halo-ring-late" />
          <span className="relative">{token}</span>
        </span>
      );
    }
    return token;
  });

  return (
    // The fitted size lives on this box; the h1 inherits it (preflight sets
    // headings to font-size: inherit). overflow-visible lets the "speaks" glow
    // spill past the text box; the fit still measures scrollWidth (the absolute
    // halo rings are out of flow). text-f2 is only the pre-hydration fallback.
    <div ref={ref} className="whitespace-nowrap py-[0.3em] text-center text-f2">
      <h1 className="font-display lowercase leading-none text-white">{tokens}</h1>
    </div>
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
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-navy/75 text-gold shadow-lg backdrop-blur transition group-hover:border-gold group-hover:bg-gold group-hover:text-navy sm:h-12 sm:w-12">
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
