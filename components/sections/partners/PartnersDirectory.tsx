"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import GutterRail, { GUTTER_LEFT } from "@/components/ui/GutterRail";
import { useInView } from "@/components/ui/useInView";
import { useMinWidth } from "@/components/ui/useMinWidth";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { useCmsValue } from "@/components/admin/AdminProvider";
import { useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import { PARTNERS, type PartnerLogo, type PartnersContent } from "@/content/partners";
import { logoSrc } from "./PartnerMarquee";

/** Seconds between one grid row's reveal and the next, when several rows come
 * into view together (the first screenful, a fast scroll, a new filter). */
const ROW_STAGGER = 0.14;
/** Seconds between neighbouring tiles within a row. */
const CELL_STAGGER = 0.06;
/** Rows that enter within this long of each other (ms) count as arriving
 * together and are staggered; a row entering later starts straight away. */
const TOGETHER_MS = 250;

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();

/**
 * The roster under the Our Partners lander (and /o): every partner in the
 * `partners.logos` list as a logo tile in a grid — the logo alone, no name or
 * industry under it (a partner without a logo has its name set in the tile in
 * its place). Each row is revealed as it comes into view, its tiles following
 * one another across the row, and rows that arrive together following one
 * another down the grid.
 *
 * The industry filter is a rail in the gutter left of the grid, built like the
 * Our Works page's rail to the gallery (see GutterRail) and held level with the
 * grid the same way — but a button rather than a link: it opens a panel of
 * industry tags beside it, and picking one filters the grid (and closes the
 * panel; Escape or a click elsewhere closes it too). The rail's label shows the
 * industry in force. Industries are grouped regardless of case or stray spaces,
 * keeping the first spelling met; a partner with no industry is shown under the
 * all tag only. With no industries set there is no rail, and with no partners
 * the section does not render.
 *
 * The section is a gentle scroll-snap stop, as is the lander (see
 * html[data-gp-partners-snap], set by PartnersHero).
 */
export default function PartnersDirectory({ partners: serverPartners }: { partners: PartnersContent }) {
  const partners = useCmsValue("partners", serverPartners);
  const tv = useEditableT();
  const motionOff = useMotionOff();
  const dir = { ...PARTNERS.directory, ...(partners.directory ?? {}) };
  const list = (partners.logos ?? []).filter((p) => p && (p.img || p.name?.trim()));

  // One tag per industry, first spelling kept, in the order partners list them.
  const industries = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of list) {
      const key = norm(p.industry);
      if (key && !seen.has(key)) seen.set(key, p.industry.trim());
    }
    return [...seen.entries()].map(([key, label]) => ({ key, label }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.map((p) => norm(p.industry)).join("|")]);

  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // A filter whose last partner was removed (or re-filed) falls back to all.
  useEffect(() => {
    if (filter && !industries.some((i) => i.key === filter)) setFilter(null);
  }, [filter, industries]);
  const visible = filter ? list.filter((p) => norm(p.industry) === filter) : list;
  const activeLabel = industries.find((i) => i.key === filter)?.label;

  // Rows are laid out here rather than left to the grid to wrap, so each can be
  // observed and revealed as a unit. The counts match the grid-cols classes.
  const sm = useMinWidth(751);
  const md = useMinWidth(1001);
  const cols = md ? 4 : sm ? 3 : 2;
  const rows: PartnerLogo[][] = [];
  for (let i = 0; i < visible.length; i += cols) rows.push(visible.slice(i, i + cols));

  // Rows that come into view together are handed increasing delays, so the
  // first screenful arrives row by row rather than all at once.
  const chain = useRef({ at: 0, n: 0 });
  const nextDelay = useCallback(() => {
    const now = performance.now();
    if (now - chain.current.at > TOGETHER_MS) chain.current.n = 0;
    chain.current.at = now;
    return chain.current.n++ * ROW_STAGGER;
  }, []);

  // The panel closes on Escape (handing focus back to the rail) and on a press
  // anywhere outside the rail and panel.
  const railBoxRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        railRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!railBoxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // Picking a tag brings the top of the grid back into view if it has been
  // scrolled past, so the filtered grid is seen from its first row.
  const gridRef = useRef<HTMLDivElement>(null);
  const pick = (key: string | null) => {
    setFilter(key);
    setOpen(false);
    const grid = gridRef.current;
    if (grid && grid.getBoundingClientRect().top < 0) {
      grid.scrollIntoView({ block: "start", behavior: motionOff ? "auto" : "smooth" });
    }
  };

  if (list.length === 0) return null;

  const tag = (key: string | null, label: string) => {
    const active = filter === key;
    return (
      <button
        key={key ?? "__all"}
        type="button"
        aria-pressed={active}
        onClick={() => pick(key)}
        className={`w-full border px-4 py-2 text-left font-din text-xs uppercase tracking-[0.2em] transition-colors duration-300 ${
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
    <section className="w-full snap-start border-t border-white/5 bg-navy py-20 sm:py-28">
      <Container>
        <RevealOnScroll>
          <EditableText
            path="partners.directory.eyebrow"
            value={tv(dir.eyebrow)}
            as="p"
            className="font-display text-f6 lowercase text-gold"
          />
          <EditableText
            path="partners.directory.heading"
            value={tv(dir.heading)}
            as="h2"
            className="mt-2 max-w-3xl font-heading text-f3 leading-none text-white [text-wrap:balance]"
          />
        </RevealOnScroll>
      </Container>

      {/* The industry rail, just left of the body column as on the Our Works
          gallery: it starts level with the top of the grid and then sticks a
          little below the viewport's top edge for the grid's length. The
          zero-height wrapper keeps it out of the flow; the section (not the site
          column) is its containing block, so the rail's left offset — measured
          from the viewport — lands in the gutter. */}
      {industries.length > 0 && (
        <div className="pointer-events-none sticky top-6 z-20 mt-10 h-0 sm:mt-14">
          <div ref={railBoxRef} className="pointer-events-auto">
            <GutterRail
              ref={railRef}
              onClick={() => setOpen((o) => !o)}
              expanded={open}
              title={tv("Filter partners by industry")}
              label={activeLabel ? tv(activeLabel) : tv(dir.filterLabel)}
              icon={<TagsIcon className="h-5 w-5" />}
              align="body"
              className="absolute top-0"
            />
            {open && (
              <div
                role="group"
                aria-label={tv("Filter partners by industry")}
                style={{ left: `calc(${GUTTER_LEFT.body} + 3.5rem)` }}
                className={`absolute top-0 flex max-h-[70vh] w-56 flex-col gap-2 overflow-y-auto border border-white/10 bg-navy/95 p-3 shadow-2xl backdrop-blur ${
                  motionOff ? "" : "pd-pop"
                }`}
              >
                {tag(null, tv(dir.allLabel))}
                {industries.map((i) => tag(i.key, tv(i.label)))}
              </div>
            )}
          </div>
        </div>
      )}

      <Container>
        <div
          ref={gridRef}
          aria-live="polite"
          className={`flex flex-col gap-3 sm:gap-4 ${industries.length > 0 ? "" : "mt-10 sm:mt-14"}`}
        >
          {rows.map((row, r) => (
            <GridRow key={`${filter ?? ""}:${cols}:${r}`} row={row} nextDelay={nextDelay} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function GridRow({ row, nextDelay }: { row: PartnerLogo[]; nextDelay: () => number }) {
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
            {p.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc(p.img)}
                alt={p.name}
                loading="lazy"
                draggable={false}
                className="max-h-[52%] max-w-[70%] object-contain"
              />
            ) : (
              <span className="px-4 text-center font-display text-xl leading-tight text-white/70 sm:text-2xl">
                {p.name}
              </span>
            )}
          </div>
        </RevealOnScroll>
      ))}
    </ul>
  );
}

function TagsIcon({ className }: { className?: string }) {
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
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}
