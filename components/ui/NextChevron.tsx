"use client";

import { forwardRef, type RefObject } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { useMotionOff } from "@/components/motion/MotionProvider";

/**
 * A way on from a full-screen section: a chevron at its foot, bobbing gently
 * (still with motion off), that glides on to whatever follows the section.
 * Positioned by the caller's `className` — absolutely, at the section's foot,
 * and on a phone above the floating menu bar. The forwarded ref is the
 * chevron's own box, for a caller that measures whether it fits.
 */
const NextChevron = forwardRef<
  HTMLDivElement,
  {
    /** The section to scroll past. */
    sectionRef: RefObject<HTMLElement>;
    className?: string;
  }
>(function NextChevron({ sectionRef, className = "" }, ref) {
  const t = useT();
  const reduced = useMotionOff();
  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center ${className}`}
    >
      <button
        type="button"
        aria-label={t("Next section")}
        onClick={() => {
          const sec = sectionRef.current;
          if (!sec) return;
          const next = sec.getBoundingClientRect().bottom + window.scrollY;
          window.scrollTo({ top: next, behavior: reduced ? "auto" : "smooth" });
        }}
        className="pointer-events-auto flex h-11 w-11 items-center justify-center text-white/40 transition-colors duration-300 hover:text-gold focus-visible:text-gold"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`h-6 w-6 ${reduced ? "" : "pr-chevron"}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
});

export default NextChevron;
