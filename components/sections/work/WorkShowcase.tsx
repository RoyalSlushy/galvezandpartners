"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import useFitText from "@/components/ui/useFitText";
import GutterRail from "@/components/ui/GutterRail";
import CtaGrid from "@/components/sections/home/CtaGrid";
import CaseCarousel from "@/components/sections/work/CaseCarousel";
import type { Work } from "@/content/work";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import { AddChip } from "@/components/admin/editable/ListControls";
import { useRevealPhase } from "@/components/motion/useRevealPhase";

/**
 * /our-works hero: the cases as the same carousel the homepage's featured work
 * is (see CaseCarousel) — the row hugging the body's left edge, the snapped
 * case opening to 4:3 on desktop and playing its video, arrows and a gold
 * progress line under it. The progress line hands off to the gallery band
 * below (see WorkGallery); a masonry-grid icon rail on the left jumps to that
 * #work-gallery section directly.
 *
 * Here the carousel is fit to the screen: the section is the first screen
 * under the masthead, the heading takes what it needs, and the cards size
 * themselves to the room left (`fit`), so heading, cards, description, arrows
 * and line all land inside the viewport at any size. Only the snapped case —
 * the one playing — shows its description, under its card (`describe`).
 *
 * The heading is centered and fit to a single line at any width, with the word
 * "speaks" accented in gold under a pulsing halo.
 *
 * Edit mode lets the section grow and keeps every affordance in the row.
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
  const phase = useRevealPhase();
  // Case-study titles are brand names and stay untranslated.
  const tv = useEditableT();

  // Closing card carries the hand-off to the gallery wall below.
  const endCard = (
    <a href="#work-gallery" className="fw-end flex snap-start items-start">
      <div className="relative flex aspect-[4/5] w-full min-w-0 flex-col items-start justify-center overflow-hidden border border-gold/25 bg-gradient-to-br from-navy-soft to-navy p-5 sm:p-7">
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

  // Visitors get the section as the first screen under the masthead: heading,
  // then the carousel taking the rest (its cards sized to fit it). On a phone
  // the arrows' row stops short of the floating menu button in the corner (a
  // w-12 square inset right-4 / bottom-3 — see MobileMenu) rather than the
  // whole section rising above it. Edit mode lets the section grow instead.
  return (
    <section
      data-gp-hero={phase ?? undefined}
      id="work-cases"
      className={`relative w-full overflow-hidden bg-navy ${
        editMode
          ? "py-16 sm:py-20"
          : "flex h-[calc(100svh-var(--header-h))] flex-col pb-4 pt-3 sm:pb-6 sm:pt-4"
      }`}
    >
      <GalleryRail label={tv("gallery")} />
      <Container>
        <div data-hero-rise>
          <ShowcaseHeading heading={heading} display={tv(heading)} editMode={editMode} />
        </div>
      </Container>
      <CaseCarousel
        items={items}
        endCard={endCard}
        fit
        describe
        rowClassName={editMode ? "mt-10 pb-6" : "mt-1 pb-2 sm:mt-2"}
        controlsClassName={editMode ? "mt-6" : "mt-2 max-sm:pr-[4.5rem] sm:mt-3"}
      />
      {editMode && (
        <Container className="mt-6">
          <AddChip listPath="work.items" label="work item" />
        </Container>
      )}
    </section>
  );
}

/**
 * Live viewport height in px, for type that has to be sized against the screen
 * rather than its container. Starts at a desktop-ish height so the server and
 * the first client paint agree, then corrects on mount.
 */
function useViewportHeight() {
  const [vh, setVh] = useState(900);
  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vh;
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
  // The section is one screen tall, and whatever the heading takes of it comes
  // out of the cards below — so the type is capped by the viewport's height as
  // well as fitted to the container's width, and a short screen gets a smaller
  // heading rather than cards pushed under the fold. (The cap can't be a
  // max-height on the box: the accent word's halo rings spill outside the text,
  // and the fit measures scrollHeight, which would count them.)
  const vh = useViewportHeight();

  const { ref } = useFitText<HTMLDivElement>({
    max: Math.min(150, vh * 0.095),
    min: 16,
    singleLine: true,
    deps: [display, editMode, vh],
  });
  // Separate fit for the phone treatment: singleLine only constrains width, so
  // with each line kept nowrap it sizes the block until the widest of the three
  // lines spans the container. Its cap is per-line, and the stack is ~3.15em
  // tall, so it lands near a sixth of the screen.
  const { ref: mobileRef } = useFitText<HTMLDivElement>({
    max: Math.min(110, vh * 0.058),
    min: 14,
    singleLine: true,
    deps: [display, editMode, vh],
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

/** The cases' rail down to the gallery wall (the wall carries the mirror of it
 * back up — see WorkGallery). */
function GalleryRail({ label }: { label: string }) {
  return (
    <GutterRail
      href="#work-gallery"
      title="Jump to the gallery"
      label={label}
      icon={<MasonryIcon className="h-5 w-5" />}
      className="absolute top-1/2 -translate-y-1/2"
    />
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
