"use client";

import { useMemo, useState } from "react";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { GalleryItem } from "@/content/work";
import { wixImageFit } from "@/lib/wix";
import { PLACEHOLDER_IMG } from "@/lib/adminClient";
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

/**
 * "#work-gallery" — the masonry wall after the cases: a vertically scrolling,
 * CMS-managed image grid with search, sort, and a tag-chip filter system
 * (chips also live on each card's hover overlay, so any tag is one click from
 * becoming a filter). Edit mode swaps the filter bar for inline editing of
 * every image, title, and tag list.
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

  const items = gallery.items;

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
    <section id="work-gallery" className="w-full bg-navy py-20 sm:py-24">
      <Container>
        <RevealOnScroll>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <EditableText
              path="work.gallery.heading"
              value={tv(gallery.heading)}
              as="h2"
              className="font-display text-f3 lowercase leading-none text-white"
            />
            {!editMode && (
              <p className="pb-1 font-din text-sm uppercase tracking-[0.2em] text-white/40">
                {visible.length} / {items.length}
              </p>
            )}
          </div>
        </RevealOnScroll>

        {editMode ? (
          <p className="mt-6 font-body text-sm text-white/50">
            Sort and filter controls are hidden while editing — click any image, title, or tag
            list below to change it. Tags are comma-separated.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-5">
            {/* Search + sort row */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative grow sm:max-w-xs">
                <span className="sr-only">{tv("Search the gallery")}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tv("search the wall…")}
                  className="w-full border border-white/15 bg-navy-soft/60 py-2 pl-10 pr-4 font-body text-sm text-white placeholder:text-white/35 outline-none transition focus:border-gold/70"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="font-din text-xs uppercase tracking-[0.2em] text-white/40">
                  {tv("sort")}
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="cursor-pointer border border-white/15 bg-navy-soft/60 px-4 py-2 font-body text-sm text-white outline-none transition focus:border-gold/70"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key} className="bg-navy">
                      {tv(s.label)}
                    </option>
                  ))}
                </select>
              </label>
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
            {visible.map(({ item, idx, tags }) => (
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
                  <figcaption className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy/90 via-navy/25 to-transparent p-4 opacity-0 transition duration-300 focus-within:opacity-100 group-hover:opacity-100">
                    <p className="font-heading text-sm leading-snug text-white sm:text-base">
                      {item.title}
                    </p>
                    <span className="pointer-events-auto mt-2 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={selected.has(tag)}
                          onClick={() => toggleTag(tag)}
                          className={`border px-2.5 py-0.5 font-din text-[11px] transition ${
                            selected.has(tag)
                              ? "border-gold bg-gold text-navy"
                              : "border-white/25 text-white/75 hover:border-gold hover:text-gold"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </span>
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
    </section>
  );
}
