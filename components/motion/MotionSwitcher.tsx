"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { MOTION_STYLES, useMotion, type MotionStyle } from "./MotionProvider";

/** One line of copy per style, so the menu says what each one does rather than
 * making the visitor click through all four to find out. */
const BLURB: Record<MotionStyle, string> = {
  off: "Nothing moves",
  classic: "The house motion",
  kinetic: "Springier, more travel",
  minimal: "Gentle fades only",
};

const LABEL: Record<MotionStyle, string> = {
  off: "Off",
  classic: "Classic",
  kinetic: "Kinetic",
  minimal: "Minimal",
};

/**
 * Motion control: a button showing the active style, opening a short menu of
 * the four. Sits beside the language switch — both are "how you would like to
 * be shown this site" settings, and neither belongs in a settings page a
 * marketing site does not have.
 *
 * While the OS asks for reduced motion the site is held at off, so the menu
 * says so instead of offering choices that would not take effect.
 */
export default function MotionSwitcher({ className = "" }: { className?: string }) {
  const { style, setStyle, systemReduced } = useMotion();
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("Motion settings")}
        className="flex items-center gap-2 py-1 font-heading text-base leading-none tracking-wide text-white/90 transition hover:text-gold"
      >
        <WaveIcon still={style === "off"} />
        <span>{t(LABEL[style])}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-3 min-w-[13rem] border border-white/10 bg-navy-soft p-1 shadow-2xl shadow-black/40"
        >
          {systemReduced && (
            <p className="px-3 py-2 font-body text-xs leading-snug text-white/50">
              {t("Your device asks for reduced motion, so the site is holding still.")}
            </p>
          )}
          {MOTION_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={style === s}
              disabled={systemReduced && s !== "off"}
              onClick={() => {
                setStyle(s);
                setOpen(false);
              }}
              className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                style === s ? "bg-gold/10 text-gold" : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="font-heading text-sm leading-none">{t(LABEL[s])}</span>
              <span className="font-body text-xs text-current/60">{t(BLURB[s])}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Three bars that ripple while motion is on and lie flat when it is off — the
 * icon is itself a sample of the setting. */
function WaveIcon({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 18 14" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1 + i * 6} y={still ? 6 : 2} width="3.4" height={still ? 2 : 10} rx="1">
          {!still && (
            <animate
              attributeName="height"
              values="10;3;10"
              dur="1.4s"
              begin={`${i * 0.18}s`}
              repeatCount="indefinite"
            />
          )}
          {!still && (
            <animate
              attributeName="y"
              values="2;5.5;2"
              dur="1.4s"
              begin={`${i * 0.18}s`}
              repeatCount="indefinite"
            />
          )}
        </rect>
      ))}
    </svg>
  );
}
