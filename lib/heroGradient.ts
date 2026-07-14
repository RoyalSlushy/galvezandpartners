/**
 * Serialize a hero background gradient (see `content/home.ts`) into CSS
 * `background-image` values. Shared by the hero section and the admin color
 * picker so the live preview matches what renders on the page.
 *
 * Colors are literal, so the hero gradient stays independent of the site theme
 * — only the hero background uses it; everything else follows the theme tokens.
 *
 * The hero renders the linear form on mobile and the radial ("floating orbs")
 * form on desktop (see `.hero-fill` in globals.css).
 */

import { DEFAULT_HERO_GRADIENT, type HeroGradient } from "@/content/home";

const clampPct = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

function resolvedStops(gradient: HeroGradient | null | undefined) {
  const grad =
    gradient && Array.isArray(gradient.stops) && gradient.stops.length >= 2
      ? gradient
      : DEFAULT_HERO_GRADIENT;
  const stops = grad.stops
    .map((s) => ({ color: s.color, position: clampPct(s.position) }))
    .sort((a, b) => a.position - b.position);
  const angle = Number.isFinite(grad.angle) ? grad.angle : 180;
  return { stops, angle };
}

export function heroGradientCss(gradient: HeroGradient | null | undefined): string {
  const { stops, angle } = resolvedStops(gradient);
  const parts = stops.map((s) => `${s.color} ${s.position}%`).join(", ");
  return `linear-gradient(${angle}deg, ${parts})`;
}

/** Scatter positions (as %) for the floating orbs — reused cyclically. */
const ORB_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [20, 26],
  [80, 20],
  [30, 78],
  [74, 66],
  [52, 44],
  [12, 58],
];

/**
 * Render the same color stops as soft floating radial orbs over the darkest
 * stop as a base — a mesh/aurora look for the desktop hero. The stops keep
 * their meaning (colors), only the composition changes from a linear ramp to
 * scattered radial glows.
 */
export function heroRadialCss(gradient: HeroGradient | null | undefined): string {
  const { stops } = resolvedStops(gradient);
  // Lowest-position stop anchors the base fill so the section is fully covered.
  const base = stops[0].color;
  const orbs = stops.map((s, i) => {
    const [x, y] = ORB_SPOTS[i % ORB_SPOTS.length];
    const radius = 46 + (i % 3) * 9; // 46% / 55% / 64% falloff
    return `radial-gradient(circle at ${x}% ${y}%, ${s.color} 0%, transparent ${radius}%)`;
  });
  return `${orbs.join(", ")}, linear-gradient(${base}, ${base})`;
}
