/**
 * Serialize a hero background gradient (see `content/home.ts`) into a CSS
 * `linear-gradient(...)` value. Shared by the hero section and the admin color
 * picker so the live preview matches exactly what renders on the page.
 *
 * Colors are literal, so the hero gradient stays independent of the site theme
 * — only the hero background uses it; everything else follows the theme tokens.
 */

import { DEFAULT_HERO_GRADIENT, type HeroGradient } from "@/content/home";

const clampPct = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function heroGradientCss(gradient: HeroGradient | null | undefined): string {
  const grad =
    gradient && Array.isArray(gradient.stops) && gradient.stops.length >= 2
      ? gradient
      : DEFAULT_HERO_GRADIENT;

  const stops = grad.stops
    .map((s) => ({ color: s.color, position: clampPct(s.position) }))
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");

  const angle = Number.isFinite(grad.angle) ? grad.angle : 180;
  return `linear-gradient(${angle}deg, ${stops})`;
}
