"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Container from "@/components/ui/Container";
import CtaGrid from "@/components/sections/home/CtaGrid";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";
import type { GalleryItem } from "@/content/work";
import { wixImageFit } from "@/lib/wix";
import { isVideoUrl, PLACEHOLDER_IMG } from "@/lib/adminClient";
import { XIcon } from "@/components/admin/icons";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
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

// Height of the gold title band at the head of the section (px). Its slot is
// reserved at the same height, so unrolling it never moves the wall below.
const BAND_H = 64;

/**
 * "#work-gallery" — the masonry wall after the cases: a vertically scrolling,
 * CMS-managed image grid with search, sort, and a tag-chip filter system. The
 * section is headed by a gold band — the far end of the progress line the cases
 * above run on — that unrolls as the wall climbs into frame, carrying the
 * section title over an inset letter grid. Hovering a piece names it; its tags
 * are filters, and live only in the bar above. Edit mode swaps that bar for
 * inline editing of every image, title, and tag list.
 */
export default function WorkGallery({ gallery: serverGallery }: { gallery: GalleryContent }) {
  const gallery = useCmsValue("work.gallery", serverGallery);
  const editMode = useEditMode();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode
  // (matches WorkGrid). Author-entered tags are CMS content and stay as-is.
  const tv = (s: string) => (editMode ? s : t(s));

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [matchAll, setMatchAll] = useState(false);
  const [sort, setSort] = useState<SortKey>("curated");
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
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const band = bandRef.current;
    const section = sectionRef.current;
    if (!band || !section) return;
    if (editMode || reduced) {
      band.style.height = `${BAND_H}px`;
      band.style.setProperty("--band-open", "1");
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
      band.style.setProperty("--band-open", open.toFixed(3));
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
      band.style.removeProperty("--band-open");
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

  // Tag cloud: every tag in use, busiest first (ties alphabetical).
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of parseTags(item.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);

  const toggleTag = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setSelected(new Set());
    setMatchAll(false);
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
      if (selected.size > 0) {
        pairs = pairs.filter(({ tags }) =>
          matchAll
            ? [...selected].every((t) => tags.includes(t))
            : tags.some((t) => selected.has(t)),
        );
      }
      if (sort === "recent") pairs = [...pairs].reverse();
      else if (sort === "az")
        pairs = [...pairs].sort((a, b) => a.item.title.localeCompare(b.item.title));
      else if (sort === "za")
        pairs = [...pairs].sort((a, b) => b.item.title.localeCompare(a.item.title));
    }
    return pairs;
  }, [items, editMode, query, selected, matchAll, sort]);

  const filtersActive = query.trim() !== "" || selected.size > 0;

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
              className="relative flex w-full items-center justify-between gap-3 px-4 sm:gap-4 sm:px-7"
              style={{
                height: BAND_H,
                // The title catches up once there is band to read it on, rather
                // than being sliced in half by the opening edge.
                opacity: editMode ? 1 : "calc((var(--band-open, 0) - 0.35) / 0.65)",
              }}
            >
              <CtaGrid scale={1.25} />
              <EditableText
                path="work.gallery.heading"
                value={tv(gallery.heading)}
                as="h2"
                className="relative truncate font-display text-f6 lowercase leading-none text-navy sm:text-f5"
              />
              {!editMode && (
                <div className="relative ml-auto flex shrink-0 items-center gap-2 pl-2 sm:pl-3">
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

        {editMode ? (
          <p className="mt-6 font-body text-sm text-white/50">
            Sort and filter controls are hidden while editing — click any image, title, or tag
            list below to change it. Tags are comma-separated.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-5">
            {/* Tag match mode and the clear-all — search and sort live up in the
                band. The row only renders when it has something to hold. */}
            {(selected.size > 1 || filtersActive) && (
              <div className="flex flex-wrap items-center gap-3">
                {selected.size > 1 && (
                  <div
                    className="flex overflow-hidden border border-white/15"
                    role="group"
                    aria-label="Tag match mode"
                  >
                    {(["any", "all"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={matchAll === (mode === "all")}
                        onClick={() => setMatchAll(mode === "all")}
                        className={`px-4 py-2 font-heading text-xs uppercase tracking-wide transition ${
                          matchAll === (mode === "all")
                            ? "bg-gold text-navy"
                            : "text-white/60 hover:text-gold"
                        }`}
                      >
                        {tv(mode)}
                      </button>
                    ))}
                  </div>
                )}
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-heading text-xs uppercase tracking-wide text-gold underline-offset-4 transition hover:underline"
                  >
                    {tv("clear")}
                  </button>
                )}
              </div>
            )}

            {/* Tag chips */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
              {allTags.map(([tag, count]) => {
                const active = selected.has(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTag(tag)}
                    className={`border px-3.5 py-1.5 font-heading text-xs uppercase tracking-wide transition ${
                      active
                        ? "border-gold bg-gold text-navy"
                        : "border-white/15 text-white/65 hover:border-gold/60 hover:text-gold"
                    }`}
                  >
                    {tag}
                    <span className={`ml-1.5 ${active ? "text-navy/60" : "text-white/35"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Masonry wall — CSS columns; images render whole at their true aspect. */}
        {visible.length > 0 ? (
          <div className="mt-10 columns-2 gap-4 sm:columns-3 lg:columns-4">
            {visible.map(({ item, idx }) => (
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
          <div className="mt-16 flex flex-col items-center gap-4 border border-white/10 bg-navy-soft/40 px-6 py-16 text-center">
            <p className="font-display text-f6 lowercase text-white/80">{tv("nothing on the wall")}</p>
            <p className="max-w-sm font-body text-sm text-white/50">
              {tv("No images match that search and tag combination.")}
            </p>
            <button type="button" onClick={clearFilters} className="btn-outline mt-2">
              {tv("clear filters")}
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
