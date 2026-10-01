"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Container from "@/components/ui/Container";
import CtaGrid from "@/components/sections/home/CtaGrid";
import GutterRail from "@/components/ui/GutterRail";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { useScrollStops } from "@/components/motion/useScrollStops";
import type { GalleryItem } from "@/content/work";
import { wixImageFit } from "@/lib/wix";
import { isVideoUrl, PLACEHOLDER_IMG } from "@/lib/adminClient";
import { XIcon } from "@/components/admin/icons";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";

type GalleryContent = { heading: string; items: GalleryItem[] };

type SortKey = "curated" | "recent" | "az" | "za";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "curated", label: "curated order" },
  { key: "recent", label: "recently added" },
  { key: "az", label: "title a → z" },
  { key: "za", label: "title z → a" },
];

/** Stacked cards, for the rail back up to the case studies. */
function CasesIcon({ className }: { className?: string }) {
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
      <rect x="3" y="7" width="13" height="14" rx="1.5" />
      <path d="M7 4h11a2 2 0 0 1 2 2v11" />
    </svg>
  );
}

/** Split a comma-separated tag string into clean lowercase tags. */
function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

// Per-card fit bounds cycle through varied heights (keyed by curated index, so a
// card keeps its bound under sort/filter). Images are fit (not cropped) within
// 640×bound and shown object-contain, so each renders whole at its true aspect;
// the varied bounds plus real aspect ratios give the masonry its rhythm.
const CROP_HEIGHTS = [780, 540, 880, 660, 800, 560];

// How many pieces the wall shows at first, and how many more each press of
// "Load More" brings in.
const PAGE = 20;

// Height of the gold title band at the head of the section (px) — deep enough
// to read as the wall's masthead once it has fully unrolled. Its slot is
// reserved at the same height, so unrolling it never moves the wall below.
const BAND_H = 114;

/**
 * "#work-gallery" — the masonry wall after the cases: a vertically scrolling,
 * CMS-managed image grid with search, sort, and a tag filter. The section is
 * headed by a gold band — the far end of the progress line the cases above run
 * on — that unrolls as the wall climbs into frame, carrying the section title
 * over an inset letter grid. Hovering a piece names it; its tags are filters,
 * gathered into one "Filter by Tag" dropdown under the band (every tag in use,
 * once each). Edit mode swaps those controls for inline editing of every
 * image, title, and tag list.
 *
 * The wall shows PAGE pieces at a time: a "Load More" button at the foot of
 * the section brings in the next PAGE, and a change of search, tag or sort
 * starts again from the first PAGE. Edit mode shows every piece.
 *
 * The wall's top is a snap stop, as is the top of the page (the cases) above
 * it — on the way between the two only: past the wall's top the page scrolls
 * freely, so reading on down the wall is never pulled back up to its top.
 */
export default function WorkGallery({ gallery: serverGallery }: { gallery: GalleryContent }) {
  const gallery = useCmsValue("work.gallery", serverGallery);
  const editMode = useEditMode();
  const t = useT();
  // Author-entered tags are CMS content and stay as-is.
  const tv = useEditableT();

  const [query, setQuery] = useState("");
  // The tag the wall is filtered to (null = every piece).
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("curated");
  // How many of the matching pieces are on the wall: PAGE, plus PAGE for each
  // "Load More" pressed since the search, tag or sort last changed. The count
  // is kept with the filters it was loaded under and reset as they change —
  // here, during the render that changes them, so the wall never shows a
  // render's worth of the old count first.
  const filterKey = `${query}\u0000${tag ?? ""}\u0000${sort}`;
  const [paging, setPaging] = useState({ key: filterKey, limit: PAGE });
  if (paging.key !== filterKey) setPaging({ key: filterKey, limit: PAGE });
  const limit = paging.key === filterKey ? paging.limit : PAGE;
  // Which of the band's two controls is open; the other shows as its icon.
  const [pane, setPane] = useState<"sort" | "search">("sort");
  // Curated index of the piece open in the media overlay (null = closed).
  const [lightbox, setLightbox] = useState<number | null>(null);

  const items = gallery.items;

  // The title band unrolls as this section climbs into frame — picking up where
  // the cases' progress line finished, which completes exactly as the wall's top
  // edge reaches the top of the viewport. Edit mode and reduced motion get it
  // open from the start.
  const sectionRef = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLAnchorElement>(null);
  const reduced = useMotionOff();
  useEffect(() => {
    const band = bandRef.current;
    const section = sectionRef.current;
    const rail = railRef.current;
    if (!band || !section) return;
    // The rail back to the cases only turns up once the wall is fully in — it
    // has nothing to say while the section is still arriving.
    const showRail = (on: boolean) => {
      if (!rail) return;
      rail.style.opacity = on ? "1" : "0";
      rail.style.pointerEvents = on ? "auto" : "none";
    };
    if (editMode || reduced) {
      band.style.height = `${BAND_H}px`;
      section.style.setProperty("--band-open", "1");
      showRail(true);
      return;
    }
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const top = section.getBoundingClientRect().top;
      // 0 with the section's top edge at the bottom of the viewport, 1 once it
      // has climbed to the top of it.
      const open = Math.max(0, Math.min(1, (window.innerHeight - top) / window.innerHeight));
      band.style.height = `${open * BAND_H}px`;
      section.style.setProperty("--band-open", open.toFixed(3));
      showRail(open >= 0.995);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      band.style.height = "";
      section.style.removeProperty("--band-open");
      showRail(false);
    };
  }, [editMode, reduced]);

  // Media overlay chrome: lock the page scroll while open, close on Escape.
  useEffect(() => {
    if (lightbox === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  // Snap stops: the top of the page (the cases) and the top of this wall. A
  // scroll that comes to rest between the two is carried on the way it was
  // going (see useScrollStops) — so one push down from the cases lands on the
  // wall's top, and one push up from there lands back on the cases. Past the
  // wall's top the page scrolls freely, so reading on down the wall (and the
  // strip after it) is never pulled back up to its top. Not in edit mode,
  // where the page is a form to work down rather than two screens.
  useScrollStops(
    () => {
      const wall = sectionRef.current;
      if (!wall) return null;
      return { stops: [0, Math.round(wall.getBoundingClientRect().top + window.scrollY)] };
    },
    { enabled: !editMode },
  );

  // Every tag in use, once each (tags are compared lowercased and trimmed — see
  // parseTags), alphabetical, with how many pieces carry it.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const t of new Set(parseTags(item.tags))) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);
  // A tag whose last piece was removed (or re-tagged) falls back to all.
  useEffect(() => {
    if (tag && !allTags.some(([t]) => t === tag)) setTag(null);
  }, [tag, allTags]);

  const clearFilters = () => {
    setQuery("");
    setTag(null);
  };

  // Pair each item with its curated index so CMS paths (and fit bounds) stay
  // stable no matter how the visitor sorts or filters the wall.
  const visible = useMemo(() => {
    let pairs = items.map((item, idx) => ({ item, idx, tags: parseTags(item.tags) }));

    if (!editMode) {
      const q = query.trim().toLowerCase();
      if (q) {
        pairs = pairs.filter(
          ({ item, tags }) =>
            item.title.toLowerCase().includes(q) || tags.some((t) => t.includes(q)),
        );
      }
      if (tag) pairs = pairs.filter(({ tags }) => tags.includes(tag));
      if (sort === "recent") pairs = [...pairs].reverse();
      else if (sort === "az")
        pairs = [...pairs].sort((a, b) => a.item.title.localeCompare(b.item.title));
      else if (sort === "za")
        pairs = [...pairs].sort((a, b) => b.item.title.localeCompare(a.item.title));
    }
    return pairs;
  }, [items, editMode, query, tag, sort]);

  const filtersActive = query.trim() !== "" || tag !== null;
  // The pieces on the wall right now: a page at a time for visitors, all of
  // them while editing.
  const shown = editMode ? visible : visible.slice(0, limit);

  return (
    <section ref={sectionRef} id="work-gallery" className="w-full bg-navy pb-20 sm:pb-24">
      <Container>
        {/* Section head: the gold line the cases' progress bar ends on, opening
            downward into the band that carries this section's title. Its slot is
            the band's full height from the start, so the wall below never
            reflows as it unrolls, and the letter grid inside sits in a
            fixed-height box so the unroll never re-renders it. */}
        <div className="relative w-full" style={{ height: BAND_H }}>
          <div className="absolute inset-x-0 top-0 h-px bg-gold" />
          <div
            ref={bandRef}
            data-gp-gallery-band
            className="absolute inset-x-0 top-0 overflow-hidden bg-gold"
            style={{ height: editMode ? BAND_H : 0 }}
          >
            <div
              className="relative flex w-full items-end px-4 pb-4 sm:px-7 sm:pb-5"
              style={{
                height: BAND_H,
                // The title catches up once there is band to read it on, rather
                // than being sliced in half by the opening edge.
                opacity: editMode ? 1 : "calc((var(--band-open, 0) - 0.35) / 0.65)",
              }}
            >
              <CtaGrid scale={1.25} />
              {/* Title and controls share one row, so they sit level with each
                  other — centred against the title's line rather than each hung
                  off its own bottom edge. The row as a whole rides the band's
                  bottom, which is where the pair sat before. */}
              <div className="relative flex w-full items-center justify-between gap-3 sm:gap-4">
                <EditableText
                  path="work.gallery.heading"
                  value={tv(gallery.heading)}
                  as="h2"
                  className="truncate font-display text-f6/[1] lowercase text-navy sm:text-f5/[1]"
                />
                {!editMode && (
                  <div className="ml-auto flex shrink-0 items-center gap-2 pl-2 sm:pl-3">
                    <p className="hidden font-din text-sm uppercase tracking-[0.2em] text-navy/60 md:block">
                      {visible.length} / {items.length}
                    </p>
                    {/* Search and sort share one slot: whichever is wanted is open
                        and the other is its icon. Hovering (or tabbing to) the
                        shut one swaps them, and it stays swapped so the cursor can
                        travel into the field it just opened. */}
                    <label
                      className={`relative flex h-9 items-center overflow-hidden border transition-[width,background-color] duration-300 ${
                        pane === "search"
                          ? "w-32 border-navy/30 bg-navy/10 sm:w-52"
                          : `w-9 cursor-pointer ${query ? "border-navy bg-navy/20" : "border-navy/25"}`
                      }`}
                      onMouseEnter={() => setPane("search")}
                      // Touch has no hover: a tap on the shut control opens it.
                      onClick={() => setPane("search")}
                    >
                      <span className="sr-only">{tv("Search the gallery")}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        className="pointer-events-none absolute left-0 top-1/2 h-4 w-9 -translate-y-1/2 px-2.5 text-navy/70"
                        aria-hidden
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setPane("search")}
                        placeholder={tv("search the wall…")}
                        tabIndex={pane === "search" ? undefined : -1}
                        className={`h-full w-full bg-transparent pl-9 pr-2 font-body text-xs text-navy outline-none placeholder:text-navy/45 sm:pr-3 sm:text-sm ${
                          pane === "search" ? "" : "pointer-events-none opacity-0"
                        }`}
                      />
                    </label>
                    <div
                      className={`relative flex h-9 items-center overflow-hidden border transition-[width,background-color] duration-300 ${
                        pane === "sort"
                          ? "w-32 border-navy/30 bg-navy/10 sm:w-48"
                          : `w-9 cursor-pointer ${sort === "curated" ? "border-navy/25" : "border-navy bg-navy/20"}`
                      }`}
                      onMouseEnter={() => setPane("sort")}
                      onClick={() => setPane("sort")}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="pointer-events-none absolute left-0 top-1/2 h-4 w-9 -translate-y-1/2 px-2.5 text-navy/70"
                        aria-hidden
                      >
                        <path d="M7 4v16m0 0-3-3.4M7 20l3-3.4M17 20V4m0 0-3 3.4M17 4l3 3.4" />
                      </svg>
                      <label className="sr-only" htmlFor="gallery-sort">
                        {tv("sort")}
                      </label>
                      <select
                        id="gallery-sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortKey)}
                        onFocus={() => setPane("sort")}
                        tabIndex={pane === "sort" ? undefined : -1}
                        className={`h-full w-full cursor-pointer appearance-none bg-transparent pl-9 pr-2 font-body text-xs text-navy outline-none sm:pr-3 sm:text-sm ${
                          pane === "sort" ? "" : "pointer-events-none opacity-0"
                        }`}
                      >
                        {SORTS.map((s) => (
                          <option key={s.key} value={s.key} className="bg-navy text-white">
                            {tv(s.label)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {editMode ? (
          <p className="mt-6 font-body text-sm text-white/50">
            Sort and filter controls are hidden while editing — click any image, title, or tag
            list below to change it. Tags are comma-separated.
          </p>
        ) : (
          // Under the band: the tag filter (see TagFilter). Search and sort
          // live up in the band.
          <TagFilter
            tags={allTags}
            tag={tag}
            onTag={setTag}
            filtersActive={filtersActive}
            onClear={clearFilters}
            tv={tv}
          />
        )}

      </Container>

      {/* The mirror of the cases' gallery rail: back up to the cases, just left
          of the body column. It starts level with the top of the wall and then
          sticks a little below the viewport's top edge for the wall's length, so
          it is alongside the grid rather than floating over the head above it.
          The zero-height wrapper keeps it out of the flow; the section (not the
          site column) is its containing block, so the rail's own left offset —
          measured from the viewport — still lands in the gutter. */}
      <div className="pointer-events-none sticky top-6 z-20 mt-10 h-0">
        <GutterRail
          ref={railRef}
          href="#work-cases"
          title="Back to the cases"
          label={tv("cases")}
          icon={<CasesIcon className="h-5 w-5" />}
          align="body"
          className="absolute opacity-0 transition-opacity duration-300"
        />
      </div>

      <Container>
        {/* Masonry wall — CSS columns; images render whole at their true aspect. */}
        {visible.length > 0 ? (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {shown.map(({ item, idx }) => (
              <figure
                key={idx}
                className="group relative mb-4 break-inside-avoid overflow-hidden bg-navy-soft"
              >
                {editMode && (
                  <ListControls
                    listPath="work.gallery.items"
                    index={idx}
                    count={items.length}
                    label="gallery image"
                    className="right-2 top-2"
                  />
                )}
                {/* Visitors press the media to open it in the overlay; edit
                    mode leaves the click to EditableImage's picker. */}
                <MaybePressable
                  pressable={!editMode}
                  label={`View ${item.title}`}
                  onPress={() => setLightbox(idx)}
                >
                  <EditableImage
                    path={`work.gallery.items.${idx}.img`}
                    raw={item.img}
                    src={
                      item.img
                        ? item.img.startsWith("http")
                          ? item.img
                          : wixImageFit(item.img, 640, CROP_HEIGHTS[idx % CROP_HEIGHTS.length])
                        : PLACEHOLDER_IMG
                    }
                    alt={item.title}
                    className="w-full bg-navy-soft object-contain transition duration-500 group-hover:scale-105"
                  />
                </MaybePressable>
                {editMode ? (
                  <figcaption className="space-y-1 p-3">
                    <EditableText
                      path={`work.gallery.items.${idx}.title`}
                      value={item.title}
                      as="p"
                      className="font-heading text-sm text-white"
                    />
                    <p className="font-din text-xs text-white/50">
                      tags:{" "}
                      <EditableText
                        path={`work.gallery.items.${idx}.tags`}
                        value={item.tags}
                        className="inline-block min-w-[6rem] text-gold/80"
                      />
                    </p>
                  </figcaption>
                ) : (
                  // Hover carries the title alone — tags stay in the filter bar
                  // above, so the overlay reads as a caption rather than a
                  // control strip.
                  <figcaption className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy/90 via-navy/25 to-transparent p-4 opacity-0 transition duration-300 focus-within:opacity-100 group-hover:opacity-100">
                    <p className="font-heading text-sm leading-snug text-white sm:text-base">
                      {item.title}
                    </p>
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-4 border border-white/10 bg-navy-soft/40 px-6 py-16 text-center">
            <p className="font-display text-f6 lowercase text-white/80">{tv("nothing on the wall")}</p>
            <p className="max-w-sm font-body text-sm text-white/50">
              {tv("No images match that search and tag combination.")}
            </p>
            <button type="button" onClick={clearFilters} className="btn-outline mt-2">
              {tv("clear filters")}
            </button>
          </div>
        )}

        {/* The next page of the wall, at the foot of the section. */}
        {shown.length < visible.length && (
          <div className="mt-10 flex justify-center sm:mt-12">
            <button
              type="button"
              onClick={() => setPaging({ key: filterKey, limit: limit + PAGE })}
              className="btn-outline"
            >
              {tv("Load More")}
            </button>
          </div>
        )}

        {editMode && (
          <div className="mt-8">
            <AddChip listPath="work.gallery.items" label="gallery image" />
          </div>
        )}
      </Container>

      {/* Media overlay: the pressed piece large (whole, uncropped), its title
          + tags beneath, over a blurred navy backdrop. Closes on the X, the
          backdrop, or Escape (see the effect above). */}
      {lightbox !== null &&
        items[lightbox] &&
        createPortal(
          <MediaOverlay item={items[lightbox]} onClose={() => setLightbox(null)} />,
          document.body,
        )}
    </section>
  );
}

/**
 * The wall's tag filter: a bar the width of the body column, and an accordion
 * under it. The bar's "Filter by Tag" opens the accordion — every tag in use,
 * once each, alphabetical, with its count — and the bar's own empty stretch
 * carries the busiest tags as quick picks (the one in force first), as many
 * as fit on its one line (the rest are hidden rather than cut in half). Picking a tag, there or in
 * the accordion, filters the wall to it; picking it again, or "All tags",
 * lets it go. While anything filters the wall the bar offers a clear too.
 */
function TagFilter({
  tags,
  tag,
  onTag,
  filtersActive,
  onClear,
  tv,
}: {
  tags: [string, number][];
  tag: string | null;
  onTag: (t: string | null) => void;
  filtersActive: boolean;
  onClear: () => void;
  tv: (s: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = "gallery-tags-panel";

  // Busiest first for the quick picks — after the tag in force, so it is
  // always on the bar to be seen (and let go).
  const busiest = useMemo(
    () =>
      [...tags].sort(
        (a, b) =>
          Number(b[0] === tag) - Number(a[0] === tag) || b[1] - a[1] || a[0].localeCompare(b[0]),
      ),
    [tags, tag],
  );

  // Quick picks that wrapped off the bar's one line are hidden (and so out of
  // the tab order) rather than left clipped. Re-measured as the bar resizes.
  const stripRef = useRef<HTMLDivElement>(null);
  const [shownPicks, setShownPicks] = useState(busiest.length);
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const measure = () => {
      const kids = Array.from(strip.children) as HTMLElement[];
      if (!kids.length) return;
      const top = kids[0].offsetTop;
      const n = kids.findIndex((k) => k.offsetTop > top + 2);
      setShownPicks(n < 0 ? kids.length : n);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(strip);
    measure();
    return () => ro.disconnect();
  }, [busiest]);

  const pick = (t: string | null) => {
    onTag(t === tag ? null : t);
    setOpen(false);
  };
  const chip = (active: boolean) =>
    `border px-3 py-1 font-heading text-[11px] uppercase tracking-wide transition-colors duration-300 ${
      active
        ? "border-gold bg-gold text-navy"
        : "border-white/15 text-white/65 hover:border-gold/60 hover:text-gold focus-visible:border-gold/60 focus-visible:text-gold"
    }`;

  return (
    <div
      className={`mt-8 w-full border transition-colors duration-300 ${
        tag || open ? "border-gold/60" : "border-white/15"
      }`}
    >
      <div className="flex min-h-11 items-center gap-3 pr-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 shrink-0 items-center gap-2.5 pl-3.5 pr-1 font-heading text-xs uppercase tracking-wide text-white transition-colors hover:text-gold focus-visible:text-gold focus-visible:outline-none"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-gold"
            aria-hidden
          >
            <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
            <circle cx="7.5" cy="7.5" r="1.5" />
          </svg>
          {tv("Filter by Tag")}
          {tag && <span className="text-gold">· {tag}</span>}
        </button>
        {/* Quick picks, filling the bar's empty stretch (desktop). */}
        <div
          ref={stripRef}
          className="hidden h-[1.875rem] min-w-0 flex-1 flex-wrap gap-2 overflow-hidden md:flex"
        >
          {busiest.map(([t], i) => (
            <button
              key={t}
              type="button"
              aria-pressed={tag === t}
              onClick={() => pick(t)}
              className={`${chip(tag === t)} ${i >= shownPicks ? "invisible" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="px-2 font-heading text-xs uppercase tracking-wide text-gold underline-offset-4 transition hover:underline"
            >
              {tv("clear")}
            </button>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={tv("Filter by Tag")}
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center text-white/60 transition-colors hover:text-gold focus-visible:text-gold"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
      {/* The accordion: every tag, opening down under the bar. */}
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        {/* Shut, it is hidden from assistive tech and its chips leave the tab
            order, so focus never lands on a tag that cannot be seen. */}
        <div className="min-h-0 overflow-hidden" aria-hidden={!open}>
          <div className="flex flex-wrap gap-2 border-t border-white/10 p-3.5">
            <button
              type="button"
              aria-pressed={!tag}
              tabIndex={open ? undefined : -1}
              onClick={() => pick(null)}
              className={chip(!tag)}
            >
              {tv("All tags")}
            </button>
            {tags.map(([t, count]) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                tabIndex={open ? undefined : -1}
                onClick={() => pick(t)}
                className={chip(tag === t)}
              >
                {t}
                <span className={`ml-1.5 ${tag === t ? "text-navy/60" : "text-white/35"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Wraps children in a press target when `pressable` (visitors), and renders
 * them bare otherwise (edit mode, where clicks belong to the picker). */
function MaybePressable({
  pressable,
  label,
  onPress,
  children,
}: {
  pressable: boolean;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  if (!pressable) return <>{children}</>;
  return (
    <button type="button" aria-label={label} onClick={onPress} className="block w-full cursor-zoom-in">
      {children}
    </button>
  );
}

/** Full-screen viewer for one gallery piece — image or video (with controls). */
function MediaOverlay({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  const video = isVideoUrl(item.img);
  const src = item.img.startsWith("http") ? item.img : wixImageFit(item.img, 1600, 1600);
  const tags = parseTags(item.tags);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/90 p-4 backdrop-blur-sm sm:p-10"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center border border-white/15 bg-navy/70 text-white/70 transition hover:border-gold hover:text-gold sm:right-6 sm:top-6"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <figure className="pointer-events-none flex max-h-full w-full max-w-5xl flex-col items-center gap-4">
        {video ? (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="pointer-events-auto max-h-[80svh] max-w-full object-contain shadow-2xl shadow-black/50"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={item.title}
            className="pointer-events-auto max-h-[80svh] max-w-full object-contain shadow-2xl shadow-black/50"
          />
        )}
        <figcaption className="pointer-events-auto flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-center">
          <span className="font-heading text-base text-white">{item.title}</span>
          {tags.length > 0 && (
            <span className="font-din text-[11px] uppercase tracking-[0.2em] text-gold/80">
              {tags.join("  ·  ")}
            </span>
          )}
        </figcaption>
      </figure>
    </div>
  );
}
