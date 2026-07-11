"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES } from "@/content/i18n";
import { useLocale } from "./LocaleProvider";

/**
 * Compact flag + chevron language toggle. Opens a small menu of locales; the
 * choice is applied instantly (no reload) via the LocaleProvider and persisted.
 */
export default function LanguageSwitcher({
  className = "",
  openUp = false,
}: {
  className?: string;
  /** Open the menu above the trigger instead of below (e.g. near a bottom edge). */
  openUp?: boolean;
}) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Change language"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 py-1 text-white/90 transition hover:text-white"
      >
        <span className="font-heading text-base leading-none tracking-wide opacity-80">
          {active.short}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`h-4 w-4 text-sky-200 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        role="menu"
        className={`absolute right-0 z-50 min-w-[5rem] overflow-hidden rounded-xl border border-white/10 bg-navy-soft shadow-xl transition ${
          openUp ? "bottom-full mb-2" : "top-full mt-2"
        } ${
          open
            ? "pointer-events-auto opacity-100"
            : `pointer-events-none opacity-0 ${openUp ? "translate-y-1" : "-translate-y-1"}`
        }`}
      >
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            role="menuitemradio"
            aria-checked={l.code === locale}
            onClick={() => {
              setLocale(l.code);
              setOpen(false);
            }}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left font-heading text-base tracking-wide transition hover:bg-white/5 ${
              l.code === locale ? "text-gold-bright" : "text-white/85"
            }`}
          >
            <span>{l.short}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
