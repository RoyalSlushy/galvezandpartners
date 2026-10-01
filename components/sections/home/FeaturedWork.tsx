"use client";

import { useEffect, useRef, useState } from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import NextChevron from "@/components/ui/NextChevron";
import CtaGrid from "@/components/sections/home/CtaGrid";
import CaseCarousel from "@/components/sections/work/CaseCarousel";
import type { Work } from "@/content/work";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import { AddChip } from "@/components/admin/editable/ListControls";

type FeaturedCopy = {
  eyebrow: string;
  heading: string;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * "Featured work" — the shared work.items portfolio (the same list that
 * powers /our-works, so CMS edits propagate) as the case carousel the Our Works
 * page opens on too (see CaseCarousel: the hand-snapped row whose snapped case
 * opens to 4:3 on desktop and plays its video, with arrows and a progress line
 * under it). A closing card carries the CTA to the Our Works page.
 *
 * The section fills the visible screen (.mc-screen, as the manifesto above it
 * does), with the heading and the row stacked close as one block, centred in
 * it. It is the manifesto's second snap stop (see MulticulturalReveal). A
 * chevron at its foot glides on to the next section — shown only where the
 * block leaves room for it under the row, so it never lands on a card.
 *
 * Edit mode shares the same row (every card 4:5, CSS snapping); all edit
 * affordances live there, including a chip on each card for its video.
 */
export default function FeaturedWork({
  featured: serverFeatured,
  items: serverItems,
}: {
  featured: FeaturedCopy;
  items: Work[];
}) {
  const featured = useCmsValue("home.featuredWork", serverFeatured);
  const items = useCmsValue("work.items", serverItems);
  const editMode = useEditMode();
  const t = useT();
  // Only the section heading is translated; work titles are brand names.
  const tv = useEditableT();
  const sectionRef = useRef<HTMLElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLDivElement>(null);
  const [chevronFits, setChevronFits] = useState(false);

  // Whether the chevron has room under the block: its top has to clear the
  // block's foot. Re-measured whenever the section or the block changes size.
  useEffect(() => {
    if (editMode) return;
    const section = sectionRef.current;
    const block = blockRef.current;
    const chevron = chevronRef.current;
    if (!section || !block || !chevron) return;
    const measure = () => {
      const gap =
        chevron.getBoundingClientRect().top - block.getBoundingClientRect().bottom;
      setChevronFits(gap >= 8);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    ro.observe(block);
    measure();
    return () => ro.disconnect();
  }, [editMode, items.length]);

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <EditableText
          path="home.featuredWork.eyebrow"
          value={tv(featured.eyebrow)}
          as="p"
          className="font-display text-f6 lowercase text-gold"
        />
        <EditableText
          path="home.featuredWork.heading"
          value={tv(featured.heading)}
          as="h2"
          className="mt-2 font-heading text-f3 leading-none text-white"
        />
      </div>
      <EditableText
        path="home.featuredWork.blurb"
        value={tv(featured.blurb)}
        as="p"
        multiline
        className="max-w-md whitespace-pre-line pb-2 font-body text-base leading-relaxed text-white/60 sm:text-lg"
      />
    </div>
  );

  const endCard = (
    <div className="fw-end flex snap-start items-center">
      <div className="relative flex aspect-[4/5] w-full flex-col items-start justify-center overflow-hidden border border-gold/25 bg-gradient-to-br from-navy-soft to-navy p-8">
        <CtaGrid className="glyph-grid-fade-left" glyphClassName="bg-gold" fontClassName="text-gold" />
        <p className="relative font-display text-f5 lowercase leading-[0.95] text-white">
          {t("there's")}{" "}
          <span className="text-gold">{t("more")}</span>
        </p>
        <p className="relative mt-3 font-body text-base text-white/60">
          {t("Every story on one page.")}
        </p>
        <Button href={featured.ctaHref} variant="gold" className="relative mt-8">
          {editMode ? (
            <EditableText
              path="home.featuredWork.ctaLabel"
              value={featured.ctaLabel}
              link={{ path: "home.featuredWork.ctaHref", value: featured.ctaHref }}
            />
          ) : (
            t(featured.ctaLabel)
          )}
        </Button>
      </div>
    </div>
  );

  return (
    // One screen, the block centred in it: reaching the section puts the whole
    // of it — header, cards, progress line — on view, with nothing of the row
    // left below the fold. A minimum (not a fixed height) so a short or narrow
    // screen grows the section rather than clipping it. On a phone the bottom
    // padding is the larger by the floating menu bar's height, so the block
    // centres in the part of the screen that is not under the bar. Edit mode
    // grows freely instead.
    <section
      ref={sectionRef}
      className={`relative w-full overflow-hidden bg-navy ${
        editMode ? "py-20 sm:py-28" : "mc-screen flex flex-col justify-center pb-24 pt-8 sm:py-12"
      }`}
    >
      <div ref={blockRef}>
        <Container>
          <RevealOnScroll>{header}</RevealOnScroll>
        </Container>
        {/* Close under the header, so the two read as one block. */}
        <CaseCarousel
          items={items}
          endCard={endCard}
          rowClassName={editMode ? "mt-16 pb-6" : "mt-2 pb-4 sm:mt-3"}
        />
        {editMode && (
          <Container className="mt-6">
            <AddChip listPath="work.items" label="work item" />
          </Container>
        )}
      </div>

      {/* A way on, when there is room for it under the row (see above). Kept
          in the layout either way so it can be measured. */}
      {!editMode && (
        <NextChevron
          ref={chevronRef}
          sectionRef={sectionRef}
          className={`bottom-[4.5rem] sm:bottom-4 ${chevronFits ? "" : "invisible"}`}
        />
      )}
    </section>
  );
}
