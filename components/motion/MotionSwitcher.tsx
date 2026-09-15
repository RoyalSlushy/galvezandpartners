"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/** Keeps the menu clear of the viewport edges. */
const MARGIN = 12;

/**
 * Motion control: an icon that opens a short menu of the four styles. Sits
 * beside the language switch — both are "how would you like to be shown this
 * site" settings, and neither belongs in a settings page a marketing site does
 * not have. The icon carries the setting on its own (bars ripple while motion
 * is on, lie flat when it is off), so it needs no label next to it.
 *
 * The menu is positioned against the viewport rather than the button, and
 * clamped to it, so it opens fully on screen wherever the button sits —
 * including the far right of the desktop masthead and inside the mobile drawer.
 * It portals to the body to get there: the drawer is a transformed element, and
 * a `fixed` child of one resolves against that ancestor instead of the
 * viewport, which put the menu a full screen below the fold.
 *
 * While the OS asks for reduced motion the site is held at off, so the menu
 * says so instead of offering choices that would not take effect.
 */
export default function MotionSwitcher({ className = "" }: { className?: string }) {
  const { style, setStyle, systemReduced } = useMotion();
  const t = useT();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Anchor under the button, then pull back inside whichever edge it would have
  // crossed — flipping above the button when there is no room below.
  const place = useCallback(() => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;
    const b = btn.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const below = b.bottom + 10;
    const flip = below + m.height > window.innerHeight - MARGIN && b.top - 10 - m.height > MARGIN;
    setPos({
      top: Math.max(MARGIN, Math.min(flip ? b.top - 10 - m.height : below, window.innerHeight - m.height - MARGIN)),
      // Right-aligned to the button by default, since the control lives at the
      // right edge of both surfaces that host it.
      left: Math.max(MARGIN, Math.min(b.right - m.width, window.innerWidth - m.width - MARGIN)),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const reposition = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", reposition);
    // The masthead scrolls away with the page, so the anchor moves; follow it.
    window.addEventListener("scroll", reposition, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${t("Motion settings")}: ${t(LABEL[style])}`}
        title={`${t("Motion settings")}: ${t(LABEL[style])}`}
        className={`flex h-8 w-8 items-center justify-center text-white/90 transition hover:text-gold ${className}`}
      >
        <WaveIcon still={style === "off"} />
      </button>

      {open &&
        createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("Motion settings")}
          style={{
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            // Hidden until measured, so it is never seen in the wrong place.
            visibility: pos ? "visible" : "hidden",
          }}
          className="fixed z-[70] w-[15rem] border border-white/10 bg-navy-soft p-1 shadow-2xl shadow-black/50"
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
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                style === s ? "bg-gold/10 text-gold" : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="font-heading text-sm leading-none">{t(LABEL[s])}</span>
              <span className="font-body text-xs opacity-60">{t(BLURB[s])}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

/** Three bars that ripple while motion is on and lie flat when it is off — the
 * icon is itself a sample of the setting. */
function WaveIcon({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 18 14" className="h-[1.15rem] w-[1.15rem] shrink-0 fill-current" aria-hidden="true">
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
