"use client";

import { useEffect, useRef } from "react";
import { useAdmin, useCmsValue } from "./AdminProvider";
import { SpinnerIcon, XIcon } from "./icons";
import type { Glyph } from "@/content/site";

/**
 * Letters panel: a grid of upload slots, one per character (A–Z, 0–9). Each
 * slot uploads/picks an SVG (reusing the shared ImagePicker) and stores it in
 * `site.glyphs[i].svg`. Uploaded glyphs drive certain decorative design
 * elements (currently the big index numerals); characters left empty fall back
 * to the normal font.
 */
export default function GlyphsPopover({ onClose }: { onClose: () => void }) {
  const admin = useAdmin();
  const cardRef = useRef<HTMLDivElement>(null);

  // Uploading a glyph is a draft edit like any other — make sure a session is live.
  useEffect(() => {
    if (!admin.editMode && !admin.startingEdit) void admin.toggleEditMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      // Ignore clicks inside the (portal-less) image picker modal so opening it
      // doesn't immediately close this panel.
      const target = e.target as HTMLElement;
      if (target.closest("[data-gp-image-picker]")) return;
      if (cardRef.current && !cardRef.current.contains(target)) onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [onClose]);

  const ready = admin.editMode && admin.drafts;
  const glyphs = useCmsValue<Glyph[]>("site.glyphs", []);

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Letters"
      className="absolute bottom-full right-0 mb-3 w-[21rem] rounded-2xl border border-white/10 bg-navy-soft p-5 shadow-2xl"
    >
      <p className="font-heading text-xs uppercase tracking-widest text-white/50">
        Letters
      </p>
      <p className="mt-1 text-[11px] leading-snug text-white/40">
        Upload an SVG per character for custom letterforms. Used by the big index
        numerals; empty slots fall back to the site font. Tinted to the theme, so
        a simple single-shape SVG works best.
      </p>
      {!ready ? (
        <div className="flex items-center justify-center py-8 text-white/50">
          <SpinnerIcon className="h-5 w-5" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-6 gap-1.5">
          {glyphs.map((g, i) => (
            <GlyphSlot
              key={g.char}
              char={g.char}
              svg={g.svg}
              onPick={() =>
                admin.openImagePicker({ path: `site.glyphs.${i}.svg`, raw: g.svg })
              }
              onClear={() => admin.setValue(`site.glyphs.${i}.svg`, "")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GlyphSlot({
  char,
  svg,
  onPick,
  onClear,
}: {
  char: string;
  svg: string;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onPick}
        aria-label={`Letter ${char}${svg ? " (edit)" : " (upload)"}`}
        title={`Letter ${char}`}
        className={`flex aspect-square w-full items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
          svg
            ? "border-gold/50 bg-navy"
            : "border-white/10 bg-navy hover:border-white/30"
        }`}
      >
        {svg ? (
          <span
            aria-hidden
            className="h-6 w-6 bg-gold"
            style={{
              WebkitMaskImage: `url("${svg}")`,
              maskImage: `url("${svg}")`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
        ) : (
          <span className="font-heading text-sm text-white/45">{char}</span>
        )}
      </button>
      <span className="pointer-events-none absolute left-1 top-0.5 font-heading text-[9px] leading-none text-white/35">
        {char}
      </span>
      {svg && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear letter ${char}`}
          title="Clear"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-navy text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <XIcon className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
