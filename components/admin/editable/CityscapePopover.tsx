"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "@/components/admin/AdminProvider";
import { normalizeHex } from "@/components/admin/HeroGradientPicker";
import { XIcon } from "@/components/admin/icons";
import type { CityscapeContent } from "@/content/home";

const PATH = "home.cityscape";

/**
 * Settings for the homepage skyline (see Cityscape): show or hide it, recolor
 * either row of towers, or swap the drawn skyline for uploaded artwork. The
 * band is one wide shape with nothing small to click on, so everything for it
 * lives here. Every control stages its edit straight away, like the rest of
 * the page — the drawer's save writes it.
 */
export default function CityscapePopover({
  cityscape,
  pos,
  onClose,
}: {
  cityscape: CityscapeContent;
  pos: { top: number; left: number };
  onClose: () => void;
}) {
  const admin = useAdmin();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const set = (key: keyof CityscapeContent, value: unknown) =>
    admin.setValue(`${PATH}.${key}`, value);

  const custom = Boolean(cityscape.image);

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Edit skyline"
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[85] w-72 border border-white/10 bg-navy-soft p-4 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <p className="font-heading text-xs uppercase tracking-widest text-white/50">Skyline</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 flex gap-1.5">
        {[
          { label: "Shown", value: true },
          { label: "Hidden", value: false },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            aria-pressed={cityscape.show === o.value}
            onClick={() => set("show", o.value)}
            className={`flex-1 border px-2.5 py-1.5 text-xs transition ${
              cityscape.show === o.value
                ? "border-gold bg-gold/15 text-gold"
                : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="mt-4 font-heading text-[11px] uppercase tracking-widest text-white/45">
        Artwork
      </p>
      <p className="mt-1 text-[11px] leading-snug text-white/40">
        {custom
          ? "Showing uploaded artwork, cropped to the band from the bottom up."
          : "Showing the built-in skyline. Upload a silhouette with a transparent sky to replace it."}
      </p>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            onClose();
            admin.openImagePicker({ path: `${PATH}.image`, raw: cityscape.image });
          }}
          className="flex-1 border border-white/10 px-2.5 py-1.5 text-xs text-white/70 transition hover:border-gold/60 hover:text-gold"
        >
          {custom ? "Change artwork…" : "Upload artwork…"}
        </button>
        {custom && (
          <button
            type="button"
            onClick={() => set("image", "")}
            className="flex-1 border border-white/10 px-2.5 py-1.5 text-xs text-white/70 transition hover:border-gold/60 hover:text-gold"
          >
            Use built-in
          </button>
        )}
      </div>

      {/* Row colors belong to the drawn skyline; uploaded artwork brings its own. */}
      {!custom && (
        <div className="mt-4 space-y-2">
          <ColorRow
            label="Back row"
            value={cityscape.backColor}
            themeVar="--c-navy-soft"
            onChange={(c) => set("backColor", c)}
          />
          <ColorRow
            label="Front row"
            value={cityscape.frontColor}
            themeVar="--c-navy"
            onChange={(c) => set("frontColor", c)}
          />
          <p className="text-[11px] leading-snug text-white/40">
            The theme&apos;s front-row color matches the section below, so the
            buildings rise straight out of it.
          </p>
        </div>
      )}
    </div>,
    document.body,
  );
}

/** One row's color: a swatch that opens the native picker, and a way back to
 * the theme color (stored as an empty string). */
function ColorRow({
  label,
  value,
  themeVar,
  onChange,
}: {
  label: string;
  value: string;
  /** The theme token this row falls back to, shown in the swatch while unset. */
  themeVar: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 border border-white/10 bg-navy px-2.5 py-2">
      <label className="relative h-7 w-7 shrink-0 overflow-hidden border border-white/15">
        <span
          className="block h-full w-full"
          style={{ backgroundColor: value || `rgb(var(${themeVar}))` }}
        />
        <input
          type="color"
          value={value ? normalizeHex(value) : themeHex(themeVar)}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} color`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <span className="flex-1 font-heading text-[11px] uppercase tracking-widest text-white/60">
        {label}
      </span>
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="font-heading text-[10px] uppercase tracking-widest text-white/40 transition hover:text-gold"
        >
          Use theme
        </button>
      ) : (
        <span className="font-heading text-[10px] uppercase tracking-widest text-white/30">
          Theme
        </span>
      )}
    </div>
  );
}

/** A theme token (space-separated RGB, e.g. "20 25 36") as `#rrggbb`, so an
 * unset row's picker opens on the color it is actually showing. */
function themeHex(token: string): string {
  const rgb = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim()
    .split(/\s+/)
    .map(Number);
  if (rgb.length !== 3 || rgb.some((n) => !Number.isFinite(n))) return "#000000";
  return "#" + rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
}
