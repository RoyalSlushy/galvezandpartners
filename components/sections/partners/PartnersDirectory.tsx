"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import GutterRail, { GUTTER_LEFT } from "@/components/ui/GutterRail";
import { useInView } from "@/components/ui/useInView";
import { useMinWidth } from "@/components/ui/useMinWidth";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { useCmsValue } from "@/components/admin/AdminProvider";
import { useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import { PARTNERS, type PartnerLogo, type PartnersContent } from "@/content/partners";
import CtaGrid from "@/components/sections/home/CtaGrid";
import { logoSrc } from "./PartnerMarquee";
import { useTrimmedLogo } from "./useTrimmedLogo";

/** Seconds between one grid row's reveal and the next, when several rows come
 * into view together (the first screenful, a fast scroll, a new filter). */
const ROW_STAGGER = 0.14;
/** Seconds between neighbouring tiles within a row. */
const CELL_STAGGER = 0.06;
/** Rows that enter within this long of each other (ms) count as arriving
 * together and are staggered; a row entering later starts straight away. */
const TOGETHER_MS = 250;
/** How long the rail's label stays up after the roster arrives (ms). */
const LABEL_MS = 2600;

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();

/** Where a partner's card goes, or null for a card that is not a link. Site
 * paths and full URLs pass through; a bare domain ("acme.com") is taken to be a
 * website and given https://; anything else (a blank, the editor's
 * placeholder) is no link at all. */
export function partnerHref(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (/^(https?:|mailto:|tel:)/i.test(v) || v.startsWith("/") || v.startsWith("#")) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;
  return null;
}

/**
 * The roster under the Our Partners lander (and /o): every partner in the
 * `partners.logos` list as a logo tile in a grid — the logo alone, no name or
 * industry under it (a partner without a logo has its name set in the tile in
 * its place). Each row is revealed as it comes into view, its tiles following
 * one another across the row, and rows that arrive together following one
 * another down the grid.
 *
 * Rows are revealed afresh each time: a row that leaves the viewport drops back
 * to hidden, and plays its reveal again when it comes back.
 *
 * The industry filter is a rail in the gutter left of the grid, built like the
 * Our Works page's rail to the gallery (see GutterRail) — but held at the foot
 * of the screen for as long as the roster is in view, its label stacked above
 * the icon and shown only briefly each time the roster comes into view (hover,
 * focus or an open panel bring it back). It is a button rather than a link: it
 * opens a panel of industry tags beside it, and picking one filters the grid
 * (and closes the panel; Escape or a click elsewhere closes it too). The
 * rail's label shows the industry in force.
 *
 * The drifting letterform grid from the Our Team section closes the roster,
 * gathered into its bottom-right corner the same way. Industries are grouped regardless of case or stray spaces,
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

  // The rail turns up once the roster has arrived at its snap point — its top
  // at the top of the screen — rather than as soon as the roster peeks in, and
  // then stays for as long as the roster is being read. Scrolling back up to
  // the lander (the roster's top back below the middle of the screen) puts it
  // away again, so the next arrival brings it in afresh. Each arrival shows
  // the rail's label for a moment, then leaves it to hover and focus.
  const sectionRef = useRef<HTMLElement>(null);
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setArrived((was) => (was ? top < window.innerHeight / 2 : top <= 2));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  const [labelShown, setLabelShown] = useState(false);
  useEffect(() => {
    if (!arrived) {
      setLabelShown(false);
      setOpen(false);
      return;
    }
    setLabelShown(true);
    const id = window.setTimeout(() => setLabelShown(false), LABEL_MS);
    return () => window.clearTimeout(id);
  }, [arrived]);

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
    <section
      ref={sectionRef}
      id="partners-roster"
      className="relative w-full snap-start border-t border-white/5 bg-navy py-20 sm:py-28"
    >
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

      <Container>
        <div
          ref={gridRef}
          aria-live="polite"
          className="mt-10 flex flex-col gap-3 sm:mt-14 sm:gap-4"
        >
          {rows.map((row, r) => (
            <GridRow key={`${filter ?? ""}:${cols}:${r}`} row={row} nextDelay={nextDelay} />
          ))}
        </div>
        {/* With an industry in force, a way back to everyone at the grid's
            foot, where a reader who has gone through the filtered list ends
            up. It clears the filter and brings the grid's top back into view
            (see pick). Above the letterform grid, which paints after this. */}
        {filter && (
          <div className="relative z-[1] mt-10 flex justify-center sm:mt-14">
            <Button variant="outline" onClick={() => pick(null)}>
              {tv(dir.seeAllLabel)}
            </Button>
          </div>
        )}
      </Container>

      {/* Drifting letterform grid gathered into the bottom-right corner, as on
          the Our Team section (same size tiers, same .team-glyph-grid fade).
          CtaGrid contains its own paint, so the letters can't spill out. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-[22rem] w-[34rem] max-w-full wide:h-[32rem] wide:w-[min(58vw,72rem)] ultra:h-[40rem] ultra:w-[min(64vw,90rem)]"
      >
        <CtaGrid
          className="team-glyph-grid"
          glyphClassName="bg-white"
          fontClassName="text-white"
          scale={1.5}
        />
      </div>

      {/* The industry rail, just left of the body column as on the Our Works
          gallery, but held at the foot of the screen: the zero-height wrapper
          sits at the end of the grid and sticks a little above the viewport's
          bottom edge, so from the moment the roster comes up until its end
          scrolls past, the rail stands in the bottom-left corner. The section
          (not the site column) is its containing block, so the rail's left
          offset — measured from the viewport — lands in the gutter. */}
      {industries.length > 0 && (
        // On a phone it clears the floating bar along the screen's foot.
        <div className="pointer-events-none sticky bottom-[5.5rem] z-20 h-0 sm:bottom-6">
          <div
            ref={railBoxRef}
            aria-hidden={!arrived || undefined}
            // Held out of sight (and out of reach) until the roster arrives.
            className={`transition-[opacity,transform] duration-500 ease-out ${
              arrived ? "pointer-events-auto opacity-100" : "pointer-events-none translate-y-3 opacity-0"
            }`}
          >
            <GutterRail
              ref={railRef}
              tabIndex={arrived ? undefined : -1}
              onClick={() => setOpen((o) => !o)}
              expanded={open}
              labelAbove
              labelShown={labelShown}
              labelOnPhones
              labelFlipped
              title={tv("Filter partners by industry")}
              label={activeLabel ? tv(activeLabel) : tv(dir.filterLabel)}
              icon={<TagsIcon className="h-5 w-5" />}
              align="body"
              className="absolute bottom-0"
            />
            {open && (
              <div
                role="group"
                aria-label={tv("Filter partners by industry")}
                style={{ left: `calc(${GUTTER_LEFT.body} + 3.5rem)` }}
                className={`absolute bottom-0 flex max-h-[70vh] w-56 flex-col gap-2 overflow-y-auto border border-white/10 bg-navy/95 p-3 shadow-2xl backdrop-blur ${
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
    </section>
  );
}

function GridRow({ row, nextDelay }: { row: PartnerLogo[]; nextDelay: () => number }) {
  const { ref, inView } = useInView<HTMLUListElement>({ once: false });
  const [shown, setShown] = useState(false);
  const [delay, setDelay] = useState(0);
  // The delay and the reveal land in the same render, so the tiles never start
  // moving on a delay of 0 before their real one arrives. Leaving the viewport
  // drops the row straight back to hidden (no stagger on the way out), ready
  // to play its reveal again on the way back in.
  useEffect(() => {
    if (inView && !shown) {
      setDelay(nextDelay());
      setShown(true);
    } else if (!inView && shown) {
      setDelay(0);
      setShown(false);
    }
  }, [inView, shown, nextDelay]);

  return (
    <ul ref={ref} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
      {row.map((p, c) => (
        <RevealOnScroll key={c} as="li" shown={shown} delay={delay + c * CELL_STAGGER}>
          <PartnerCard href={partnerHref(p.href)} name={p.name}>
            {p.img ? (
              <RosterLogo src={logoSrc(p.img)} alt={p.name} />
            ) : (
              <span className="px-4 text-center font-display text-xl leading-tight text-white/70 sm:text-2xl">
                {p.name}
              </span>
            )}
          </PartnerCard>
        </RevealOnScroll>
      ))}
    </ul>
  );
}

/** A roster logo, trimmed of any empty margin in its file (see useTrimmedLogo)
 * and given a box of its own inside the tile's padding: it scales up to meet
 * that padding however small the file, and object-contain keeps it whole. */
function RosterLogo({ src, alt }: { src: string; alt: string }) {
  const trimmed = useTrimmedLogo(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt={alt}
      loading="lazy"
      draggable={false}
      className="h-[52%] w-[70%] object-contain"
    />
  );
}

/**
 * A roster tile, as a link when the partner has one: another site opens in a
 * new tab, a path on this one in place. A linked tile lifts its border to gold
 * and brightens on hover or focus, so it reads as pressable.
 */
function PartnerCard({
  href,
  name,
  children,
}: {
  href: string | null;
  name: string;
  children: React.ReactNode;
}) {
  const box =
    "flex aspect-[4/3] items-center justify-center border border-white/10 bg-white/[0.03]";
  if (!href) return <div className={box}>{children}</div>;
  const external = /^(https?:)?\/\//i.test(href);
  return (
    <a
      href={href}
      aria-label={name}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${box} transition-colors duration-300 hover:border-gold/60 hover:bg-white/[0.06] focus-visible:border-gold focus-visible:outline-none`}
    >
      {children}
    </a>
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
