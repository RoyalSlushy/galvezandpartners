"use client";

import { useAdmin, useCmsValue } from "./AdminProvider";
import {
  DEFAULT_HERO_GRADIENT,
  type GradientStop,
  type HeroGradient,
} from "@/content/home";
import { heroGradientCss } from "@/lib/heroGradient";
import { XIcon } from "./icons";

/** Preset directions offered as one-tap buttons (label → gradient angle). */
const DIRECTIONS: { label: string; angle: number }[] = [
  { label: "↓", angle: 180 },
  { label: "↑", angle: 0 },
  { label: "→", angle: 90 },
  { label: "←", angle: 270 },
  { label: "↘", angle: 135 },
  { label: "↖", angle: 315 },
];

const MAX_STOPS = 6;

/**
 * Color picker for the hero background gradient, shown inside the mobile header
 * image config. Editing stages a draft change to `home.hero.gradient` (like any
 * other CMS edit) — the hero repaints live and it's persisted on Save. The
 * gradient affects only the hero section; the rest of the site keeps following
 * the theme.
 */
export default function HeroGradientPicker() {
  const admin = useAdmin();
  const gradient = useCmsValue<HeroGradient>("home.hero.gradient", DEFAULT_HERO_GRADIENT);
  const stops = gradient.stops ?? [];

  const commit = (next: HeroGradient) => admin.setValue("home.hero.gradient", next);

  const setStop = (i: number, patch: Partial<GradientStop>) =>
    commit({ ...gradient, stops: stops.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const removeStop = (i: number) => {
    if (stops.length <= 2) return;
    commit({ ...gradient, stops: stops.filter((_, j) => j !== i) });
  };

  const addStop = () => {
    if (stops.length >= MAX_STOPS) return;
    // Drop the new stop into the widest gap between existing positions, so it
    // lands somewhere useful rather than on top of another stop.
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    let gapStart = 0;
    let gapEnd = 100;
    let widest = -1;
    for (let i = 0; i < sorted.length - 1; i++) {
      const span = sorted[i + 1].position - sorted[i].position;
      if (span > widest) {
        widest = span;
        gapStart = sorted[i].position;
        gapEnd = sorted[i + 1].position;
      }
    }
    const position = Math.round((gapStart + gapEnd) / 2);
    commit({ ...gradient, stops: [...stops, { color: "#ffffff", position }] });
  };

  const setAngle = (angle: number) =>
    commit({ ...gradient, angle: ((angle % 360) + 360) % 360 });

  const preview = heroGradientCss(gradient);

  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <div className="flex items-center justify-between">
        <p className="font-heading text-xs uppercase tracking-widest text-white/50">
          Hero background gradient
        </p>
        <button
          type="button"
          onClick={() => commit(DEFAULT_HERO_GRADIENT)}
          className="font-heading text-[11px] uppercase tracking-widest text-white/40 transition hover:text-gold"
        >
          Reset
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-white/40">
        Recolors only the hero backdrop behind this image. The rest of the site
        keeps its theme colors.
      </p>

      {/* Live preview of the exact gradient the hero will render. */}
      <div
        className="mt-3 h-20 w-full rounded-xl border border-white/10"
        style={{ backgroundImage: preview }}
        aria-hidden
      />

      {/* Direction */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="font-heading text-[11px] uppercase tracking-widest text-white/45">
            Direction
          </span>
          <span className="tabular-nums text-[11px] text-white/45">{Math.round(gradient.angle)}°</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1">
            {DIRECTIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setAngle(d.angle)}
                aria-pressed={Math.round(gradient.angle) === d.angle}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition ${
                  Math.round(gradient.angle) === d.angle
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={Math.round(gradient.angle)}
            onChange={(e) => setAngle(Number(e.target.value))}
            aria-label="Gradient angle"
            className="h-1 flex-1 cursor-pointer accent-gold"
          />
        </div>
      </div>

      {/* Stops */}
      <div className="mt-4 space-y-2">
        <span className="font-heading text-[11px] uppercase tracking-widest text-white/45">
          Color stops
        </span>
        {stops.map((stop, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-navy px-2.5 py-2"
          >
            <label className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/15">
              <span className="block h-full w-full" style={{ backgroundColor: stop.color }} />
              <input
                type="color"
                value={normalizeHex(stop.color)}
                onChange={(e) => setStop(i, { color: e.target.value })}
                aria-label={`Stop ${i + 1} color`}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(stop.position)}
              onChange={(e) => setStop(i, { position: Number(e.target.value) })}
              aria-label={`Stop ${i + 1} position`}
              className="h-1 flex-1 cursor-pointer accent-gold"
            />
            <span className="w-10 shrink-0 text-right tabular-nums text-[11px] text-white/45">
              {Math.round(stop.position)}%
            </span>
            <button
              type="button"
              onClick={() => removeStop(i)}
              disabled={stops.length <= 2}
              aria-label={`Remove stop ${i + 1}`}
              className="shrink-0 rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {stops.length < MAX_STOPS && (
          <button
            type="button"
            onClick={addStop}
            className="w-full rounded-lg border border-dashed border-white/15 py-2 font-heading text-xs uppercase tracking-widest text-white/50 transition hover:border-gold/60 hover:text-gold"
          >
            + Add color
          </button>
        )}
      </div>
    </div>
  );
}

/** Coerce any CSS color to a `#rrggbb` string that `<input type="color">`
 * accepts (it rejects shorthand / alpha / named colors). Falls back to black. */
function normalizeHex(color: string): string {
  const c = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return "#" + c.slice(1).split("").map((ch) => ch + ch).join("").toLowerCase();
  }
  return "#000000";
}
