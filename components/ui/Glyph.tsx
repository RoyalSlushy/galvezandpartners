"use client";

import { createContext, useContext, useMemo } from "react";
import { useCmsValue } from "@/components/admin/AdminProvider";
import type { Glyph as GlyphEntry } from "@/content/site";

/**
 * Custom letterform system.
 *
 * Admins upload one SVG per character (A–Z, 0–9) from the Letters panel; those
 * glyphs are stored in `site.glyphs` and used to render certain decorative
 * design elements (currently the big index numerals). Each glyph is drawn as a
 * CSS mask over a theme-colored box, so it inherits the active theme's color
 * (like the surrounding type) and any script embedded in the SVG never runs.
 * Characters without an uploaded SVG fall back to the plain character, so the
 * normal font renders and nothing breaks.
 */

const GlyphCtx = createContext<GlyphEntry[]>([]);

/** Server-fetched `site.glyphs`, provided so anonymous visitors get glyphs
 * without loading the admin drafts bundle. */
export function GlyphProvider({
  glyphs,
  children,
}: {
  glyphs: GlyphEntry[];
  children: React.ReactNode;
}) {
  return <GlyphCtx.Provider value={glyphs}>{children}</GlyphCtx.Provider>;
}

/** char -> svg URL for every character that has an uploaded glyph. Reflects the
 * live admin draft while editing, the saved values otherwise. */
export function useGlyphMap(): Map<string, string> {
  const base = useContext(GlyphCtx);
  const live = useCmsValue<GlyphEntry[]>("site.glyphs", base);
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const g of live ?? []) {
      if (g?.char && g.svg) map.set(g.char, g.svg);
    }
    return map;
  }, [live]);
}

/** Mask CSS that turns a box into the shape of `svg` (whatever fills the box —
 * its own color — is clipped to the glyph). `contain` letterboxes any aspect. */
function maskStyle(svg: string): React.CSSProperties {
  return {
    WebkitMaskImage: `url("${svg}")`,
    maskImage: `url("${svg}")`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
}

/** A single masked glyph, tinted by `className` (a Tailwind bg color that is
 * itself theme-variable-backed, e.g. `bg-gold`). Sized in `em` so it scales
 * with the surrounding font size. */
function Glyph({ svg, className }: { svg: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block ${className ?? "bg-current"}`}
      style={{ width: "0.62em", height: "1em", verticalAlign: "-0.12em", ...maskStyle(svg) }}
    />
  );
}

/**
 * A standalone decorative glyph for a single character (e.g. a member's initial
 * behind their photo). Looks up the uploaded SVG for `char` and renders nothing
 * when there is none — purely decorative, so no font fallback. Size and position
 * come entirely from `className` (e.g. `absolute h-36 w-36 …`); `tintClassName`
 * sets the fill (a theme-variable-backed bg color like `bg-gold`).
 */
export function GlyphMark({
  char,
  tintClassName,
  className,
}: {
  char: string;
  tintClassName?: string;
  className?: string;
}) {
  const glyphs = useGlyphMap();
  const svg = char ? glyphs.get(char.toUpperCase()) : undefined;
  if (!svg) return null;
  return (
    <span
      aria-hidden
      className={`${className ?? ""} ${tintClassName ?? "bg-current"}`}
      style={maskStyle(svg)}
    />
  );
}

/**
 * Render a short string (e.g. an index numeral "01") using the uploaded glyphs
 * where available, falling back to the raw character (which inherits the parent
 * element's font/stroke styling) for any character without a glyph.
 *
 * `tintClassName` sets the glyph fill (e.g. `bg-gold`, `bg-white`); it only
 * affects rendered glyphs, so the font fallback keeps its own styling.
 */
export function GlyphNumber({
  value,
  tintClassName,
}: {
  value: string;
  tintClassName?: string;
}) {
  const glyphs = useGlyphMap();
  return (
    <>
      {Array.from(value).map((ch, i) => {
        const svg = glyphs.get(ch);
        return svg ? (
          <Glyph key={i} svg={svg} className={tintClassName} />
        ) : (
          <span key={i}>{ch}</span>
        );
      })}
    </>
  );
}
