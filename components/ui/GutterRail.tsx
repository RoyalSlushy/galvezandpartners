import { forwardRef, type ReactNode } from "react";

// Body left edge = the outer gutter plus the column's 2rem padding. "handle"
// centres the rail in the space left of it (half that, less half the icon's
// 3rem width); "body" sets it just left of the column — an icon's width plus a
// small gap. Both clamp to the viewport edge on narrow screens
// where the handle runs out.
const BODY_LEFT = "((100vw - min(100vw, var(--site-max, 1200px))) / 2 + 2rem)";
const LEFT = {
  handle: `max(0.25rem, calc(${BODY_LEFT} / 2 - 1.5rem))`,
  body: `max(0.25rem, calc(${BODY_LEFT} - 4.25rem))`,
};

/**
 * Rail in the "handle" — the gutter to the left of the site column. An icon
 * over a vertical label, linking to another section of the page: the cases
 * carry one down to the gallery wall, the wall carries one back up to them.
 * Sits in the space between the viewport edge and the body's left edge, either
 * centred in it or hugging the body (see `align`).
 *
 * Vertical placement is the caller's (`className`), since the two sections hold
 * it differently: the pinned cases put it in the middle of their own column,
 * while the wall sticks it to the middle of the viewport for its whole length.
 * Whatever that is, it resolves against a containing block whose left edge is
 * the viewport's — the `left` below is measured from there.
 */
const GutterRail = forwardRef<
  HTMLAnchorElement,
  {
    href: string;
    /** Vertical label under the icon (hidden on phones, where the gutter is thin). */
    label: string;
    /** Accessible name for the link. */
    title: string;
    icon: ReactNode;
    /** Centred in the gutter, or tucked against the body column. */
    align?: "handle" | "body";
    className?: string;
  }
>(function GutterRail({ href, label, title, icon, align = "handle", className = "" }, ref) {
  return (
    <a
      ref={ref}
      href={href}
      aria-label={title}
      style={{ left: LEFT[align] }}
      className={`group z-20 flex flex-col items-center gap-3 ${className}`}
    >
      <span className="flex h-11 w-11 items-center justify-center border border-gold/30 bg-navy/75 text-gold shadow-lg backdrop-blur transition group-hover:border-gold group-hover:bg-gold group-hover:text-navy sm:h-12 sm:w-12">
        {icon}
      </span>
      <span
        aria-hidden
        className="hidden font-heading text-[11px] uppercase tracking-[0.3em] text-white/50 transition group-hover:text-gold sm:block"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </span>
    </a>
  );
});

export default GutterRail;
