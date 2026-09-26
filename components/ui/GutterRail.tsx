import { forwardRef, type ReactNode } from "react";

// Body left edge = the outer gutter plus the column's 2rem padding. "handle"
// centres the rail in the space left of it (half that, less half the icon's
// 3rem width); "body" sets it just left of the column — an icon's width plus a
// small gap. Both clamp to the viewport edge on narrow screens
// where the handle runs out.
const BODY_LEFT = "((100vw - min(100vw, var(--site-max, 1200px))) / 2 + 2rem)";
export const GUTTER_LEFT = {
  handle: `max(0.25rem, calc(${BODY_LEFT} / 2 - 1.5rem))`,
  body: `max(0.25rem, calc(${BODY_LEFT} - 4.25rem))`,
};

/**
 * Rail in the "handle" — the gutter to the left of the site column. An icon
 * over a vertical label, linking to another section of the page: the cases
 * carry one down to the gallery wall, the wall carries one back up to them.
 * Given `onClick` instead of `href` it is a button rather than a link (the
 * partners roster uses one to open its industry filter), with `expanded`
 * reported as aria-expanded and shown by holding the hover look. `labelAbove`
 * stacks the label over the icon (for a rail held at the foot of the screen),
 * and `labelShown`, when given, shows or hides the label (hover, focus and an
 * open panel still bring it up) rather than leaving it always on.
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
  HTMLElement,
  {
    /** Where the rail links to. Omit and pass `onClick` for a button. */
    href?: string;
    onClick?: () => void;
    /** For a button that opens something: whether it is open. */
    expanded?: boolean;
    /** Stack the label above the icon rather than below it. */
    labelAbove?: boolean;
    /** Show (true) or hide (false) the label; always shown when omitted. */
    labelShown?: boolean;
    /** Show the label on phones too (by default it is sm+ only, the gutter
     * being too thin for it there). It then carries a navy backing, as it may
     * stand over the content rather than in the gutter. */
    labelOnPhones?: boolean;
    /** Vertical label under the icon (hidden on phones, where the gutter is thin). */
    label: string;
    /** Accessible name for the link. */
    title: string;
    icon: ReactNode;
    /** Centred in the gutter, or tucked against the body column. */
    align?: "handle" | "body";
    className?: string;
  }
>(function GutterRail(
  {
    href,
    onClick,
    expanded,
    labelAbove = false,
    labelShown,
    labelOnPhones = false,
    label,
    title,
    icon,
    align = "handle",
    className = "",
  },
  ref,
) {
  const on = expanded ? "border-gold bg-gold text-navy" : "border-gold/30 bg-navy/75 text-gold";
  const inner = (
    <>
      <span
        className={`flex h-11 w-11 items-center justify-center border shadow-lg backdrop-blur transition group-hover:border-gold group-hover:bg-gold group-hover:text-navy sm:h-12 sm:w-12 ${on}`}
      >
        {icon}
      </span>
      <span
        aria-hidden
        className={`font-heading text-[11px] uppercase tracking-[0.3em] transition duration-500 group-hover:text-gold ${
          labelOnPhones
            ? "block bg-navy/80 px-1 py-2 backdrop-blur sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none"
            : "hidden sm:block"
        } ${
          expanded ? "text-gold" : "text-white/50"
        } ${
          labelShown === undefined || labelShown || expanded
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
        }`}
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </span>
    </>
  );
  const cls = `group z-20 flex ${labelAbove ? "flex-col-reverse" : "flex-col"} items-center gap-3 ${className}`;
  const style = { left: GUTTER_LEFT[align] };
  if (href === undefined) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        aria-label={title}
        aria-expanded={expanded}
        style={style}
        className={cls}
      >
        {inner}
      </button>
    );
  }
  return (
    <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} aria-label={title} style={style} className={cls}>
      {inner}
    </a>
  );
});

export default GutterRail;
