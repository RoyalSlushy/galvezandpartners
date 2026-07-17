/**
 * Serialize a hero background gradient (see `content/home.ts`) into CSS
 * `background-image` values. Shared by the hero section and the admin color
 * picker so the live preview matches what renders on the page.
 *
 * Colors are literal, so the hero gradient stays independent of the site theme
 * — only the hero background uses it; everything else follows the theme tokens.
 *
 * The hero renders the linear form on mobile and a horizontal band across the
 * bottom of the viewport on desktop (see `.hero-fill` in globals.css).
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

/**
 * Render the color stops as a soft horizontal band of light glowing across the
 * bottom of the viewport, dissolving upward into the darkest stop as a base
 * fill — the desktop hero look. Each stop is painted as a wide ellipse anchored
 * to the bottom edge and spread evenly left→right, so together they read as one
 * horizontal gradient sweeping across the bottom that complements the flat base
 * behind it. The stops keep their meaning (colors); only the composition
 * changes from a linear ramp to a bottom band.
 */
export function heroBottomBandCss(gradient: HeroGradient | null | undefined): string {
  const { stops } = resolvedStops(gradient);
  // Lowest-position stop anchors the base fill so the section is fully covered
  // and the band reads as an accent glow over "the actual bg".
  const base = stops[0].color;
  const n = stops.length;
  const bands = stops.map((s, i) => {
    // Even horizontal spread across the width; small vertical-reach variation
    // keeps the blend organic rather than a hard banded edge.
    const x = n > 1 ? Math.round((i / (n - 1)) * 100) : 50;
    const reach = 40 + (i % 3) * 12; // 40% / 52% / 64% up from the bottom
    return `radial-gradient(125% ${reach}% at ${x}% 100%, ${s.color} 0%, transparent 100%)`;
  });
  return `${bands.join(", ")}, linear-gradient(${base}, ${base})`;
}
