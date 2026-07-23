import type { Locale } from "@/content/i18n";

/**
 * Small flat (simplified) flag icons for the language selector. Drawn as inline
 * SVG rather than emoji so they render identically across platforms; the
 * wrapper's `overflow-hidden` keeps them cleanly clipped.
 */

const STRIPE = 14 / 13; // one US stripe, height 14 split into 13 stripes

function UnitedStates() {
  // 7 red stripes (even rows) over a white field, blue canton with star dots.
  const red = [0, 2, 4, 6, 8, 10, 12];
  return (
    <svg viewBox="0 0 21 14" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="21" height="14" fill="#fff" />
      {red.map((k) => (
        <rect key={k} y={k * STRIPE} width="21" height={STRIPE} fill="#b22234" />
      ))}
      <rect width="9" height={7 * STRIPE} fill="#3c3b6e" />
      <g fill="#fff">
        {[1.3, 3.9, 6.6].map((cy) =>
          [1.3, 3.1, 4.9, 6.7].map((cx) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.5" />
          ))
        )}
      </g>
    </svg>
  );
}

function Mexico() {
  // Green / white / red vertical bands; a small central emblem disc keeps it
  // distinct from Italy at this size.
  return (
    <svg viewBox="0 0 21 14" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="7" height="14" fill="#006847" />
      <rect x="7" width="7" height="14" fill="#fff" />
      <rect x="14" width="7" height="14" fill="#ce1126" />
      <circle cx="10.5" cy="7" r="1.7" fill="#8b5a2b" />
    </svg>
  );
}

export default function FlagIcon({
  code,
  className = "",
}: {
  code: Locale;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 overflow-hidden ring-1 ring-black/10 ${className}`}
      style={{ width: 21, height: 14 }}
    >
      {code === "es" ? <Mexico /> : <UnitedStates />}
    </span>
  );
}
