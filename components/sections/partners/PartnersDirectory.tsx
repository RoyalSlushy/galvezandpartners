"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { useInView } from "@/components/ui/useInView";
import { useMinWidth } from "@/components/ui/useMinWidth";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { useCmsValue } from "@/components/admin/AdminProvider";
import { useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import { PARTNERS, type PartnerLogo, type PartnersContent } from "@/content/partners";
import { logoSrc } from "./PartnerMarquee";

/** Seconds between one grid row's reveal and the next, when several rows come
 * into view together (the first screenful, or a fast scroll). */
const ROW_STAGGER = 0.14;
/** Seconds between neighbouring tiles within a row. */
const CELL_STAGGER = 0.06;
/** Rows that enter within this long of each other (ms) count as arriving
 * together and are staggered; a row entering later starts straight away. */
const TOGETHER_MS = 250;

/**
 * The directory under the Our Partners lander, in two sections, drawn from the
 * same `partners.logos` list the marquee runs (logo, name, industry):
 *
 * - the roster: every partner as a tile in a grid, each row revealed as it
 *   comes into view, its tiles following one another across the row, and rows
 *   that arrive together following one another down the grid;
 * - by industry: a horizontally scrolling row of cards with a chip per
 *   industry above it to filter the row down to one field.
 *
 * Industries are grouped regardless of case or stray spaces, keeping the first
 * spelling met. A partner with no industry is listed under "All" only. A
 * partner without a logo still gets a tile, with its name set in its place.
 * With no partners in the CMS neither section renders.
 */
export default function PartnersDirectory({ partners: serverPartners }: { partners: PartnersContent }) {
  const partners = useCmsValue("partners", serverPartners);
  const dir = { ...PARTNERS.directory, ...(partners.directory ?? {}) };
  const list = (partners.logos ?? []).filter((p) => p && (p.img || p.name?.trim()));
  if (list.length === 0) return null;
  return (
    <>
      <PartnersGrid list={list} dir={dir} />
      <PartnersByIndustry list={list} dir={dir} />
    </>
  );
}

type Dir = PartnersContent["directory"];

function SectionHeader({
  eyebrowPath,
  eyebrow,
  headingPath,
  heading,
}: {
  eyebrowPath: string;
  eyebrow: string;
  headingPath: string;
  heading: string;
}) {
  const tv = useEditableT();
  return (
    <RevealOnScroll>
      <EditableText
        path={eyebrowPath}
        value={tv(eyebrow)}
        as="p"
        className="font-display text-f6 lowercase text-gold"
      />
      <EditableText
        path={headingPath}
        value={tv(heading)}
        as="h2"
        className="mt-2 max-w-3xl font-heading text-f3 leading-none text-white [text-wrap:balance]"
      />
    </RevealOnScroll>
  );
}

/** A partner's mark: the logo, whole, or its name set in its place. */
function PartnerMark({ partner, nameClassName }: { partner: PartnerLogo; nameClassName: string }) {
  return partner.img ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc(partner.img)}
      alt={partner.name}
      loading="lazy"
      draggable={false}
      className="max-h-[52%] max-w-[70%] object-contain"
    />
  ) : (
    <span className={`px-4 text-center font-display leading-tight text-white/70 ${nameClassName}`}>
      {partner.name}
    </span>
  );
}

/* ------------------------------ the roster ------------------------------ */

function PartnersGrid({ list, dir }: { list: PartnerLogo[]; dir: Dir }) {
  // Rows are laid out here rather than left to the grid to wrap, so each can be
  // observed and revealed as a unit. The counts match the grid-cols classes.
  const sm = useMinWidth(751);
  const md = useMinWidth(1001);
  const cols = md ? 4 : sm ? 3 : 2;
  const rows = useMemo(() => {
    const out: PartnerLogo[][] = [];
    for (let i = 0; i < list.length; i += cols) out.push(list.slice(i, i + cols));
    return out;
  }, [list, cols]);

  // Rows that come into view together are handed increasing delays, so the
  // first screenful arrives row by row rather than all at once.
  const chain = useRef({ at: 0, n: 0 });
  const nextDelay = useCallback(() => {
    const now = performance.now();
    if (now - chain.current.at > TOGETHER_MS) chain.current.n = 0;
    chain.current.at = now;
    return chain.current.n++ * ROW_STAGGER;
  }, []);

  return (
    <section className="w-full border-t border-white/5 bg-navy py-20 sm:py-28">
      <Container>
        <SectionHeader
          eyebrowPath="partners.directory.eyebrow"
          eyebrow={dir.eyebrow}
          headingPath="partners.directory.heading"
          heading={dir.heading}
        />
        <div className="mt-10 flex flex-col gap-3 sm:mt-14 sm:gap-4">
          {rows.map((row, r) => (
            <GridRow key={`${cols}:${r}`} row={row} nextDelay={nextDelay} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function GridRow({ row, nextDelay }: { row: PartnerLogo[]; nextDelay: () => number }) {
  const tv = useEditableT();
  const { ref, inView } = useInView<HTMLUListElement>();
  const [shown, setShown] = useState(false);
  const [delay, setDelay] = useState(0);
  // The delay and the reveal land in the same render, so the tiles never start
  // moving on a delay of 0 before their real one arrives.
  useEffect(() => {
    if (!inView || shown) return;
    setDelay(nextDelay());
    setShown(true);
  }, [inView, shown, nextDelay]);

  return (
    <ul ref={ref} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
      {row.map((p, c) => (
        <RevealOnScroll key={c} as="li" shown={shown} delay={delay + c * CELL_STAGGER}>
          <div className="flex aspect-[4/3] items-center justify-center border border-white/10 bg-white/[0.03]">
            <PartnerMark partner={p} nameClassName="text-xl sm:text-2xl" />
          </div>
          <p className="mt-3 truncate font-heading text-base text-white sm:text-lg">{p.name}</p>
          {p.industry?.trim() && (
            <p className="mt-0.5 truncate font-din text-[10px] uppercase tracking-[0.25em] text-gold/80 sm:text-xs">
              {tv(p.industry.trim())}
            </p>
          )}
        </RevealOnScroll>
      ))}
    </ul>
  );
}

/* ----------------------------- by industry ------------------------------ */

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();

function PartnersByIndustry({ list, dir }: { list: PartnerLogo[]; dir: Dir }) {
  const tv = useEditableT();
  const motionOff = useMotionOff();
  const [filter, setFilter] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // One chip per industry, first spelling kept, in the order partners list them.
  const industries = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of list) {
      const key = norm(p.industry);
      if (key && !seen.has(key)) seen.set(key, p.industry.trim());
    }
    return [...seen.entries()].map(([key, label]) => ({ key, label }));
  }, [list]);

  // A filter whose last partner was removed (or renamed) falls back to All.
  useEffect(() => {
    if (filter && !industries.some((i) => i.key === filter)) setFilter(null);
  }, [filter, industries]);

  const shown = filter ? list.filter((p) => norm(p.industry) === filter) : list;

  // A new filter starts the row from its beginning.
  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [filter]);

  const chip = (key: string | null, label: string) => {
    const active = filter === key;
    return (
      <button
        key={key ?? "__all"}
        type="button"
        aria-pressed={active}
        onClick={() => setFilter(key)}
        className={`border px-4 py-2 font-din text-xs uppercase tracking-[0.2em] transition-colors duration-300 ${
          active
            ? "border-gold bg-gold text-navy"
            : "border-white/15 text-white/70 hover:border-gold/60 hover:text-gold"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <section className="w-full overflow-hidden border-t border-white/5 bg-navy py-20 sm:py-28">
      <Container>
        <SectionHeader
          eyebrowPath="partners.directory.filterEyebrow"
          eyebrow={dir.filterEyebrow}
          headingPath="partners.directory.filterHeading"
          heading={dir.filterHeading}
        />
        {industries.length > 0 && (
          <RevealOnScroll delay={0.1}>
            <div role="group" aria-label={tv(dir.filterEyebrow)} className="mt-8 flex flex-wrap gap-2">
              {chip(null, tv(dir.allLabel))}
              {industries.map((i) => chip(i.key, tv(i.label)))}
            </div>
          </RevealOnScroll>
        )}
      </Container>
      <div
        ref={scrollRef}
        className="gallery-scroll mt-8 snap-x snap-mandatory overflow-x-auto pb-4"
      >
        {/* Keyed on the filter so each change plays the row's short fade-in. */}
        <ul
          key={filter ?? "__all"}
          aria-live="polite"
          className={`gallery-pad flex w-max gap-4 sm:gap-6 ${motionOff ? "" : "pd-fade"}`}
        >
          {shown.map((p, i) => (
            <li key={`${i}:${p.name}`} className="w-60 shrink-0 snap-start sm:w-72">
              <div className="flex aspect-[16/10] items-center justify-center border border-white/10 bg-white/[0.03]">
                <PartnerMark partner={p} nameClassName="text-2xl" />
              </div>
              <p className="mt-4 truncate font-heading text-lg text-white sm:text-xl">{p.name}</p>
              {p.industry?.trim() && (
                <p className="mt-1 truncate font-din text-xs uppercase tracking-[0.25em] text-gold/80">
                  {tv(p.industry.trim())}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
