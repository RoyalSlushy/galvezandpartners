"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GlyphMark, useGlyphMap } from "@/components/ui/Glyph";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { resolveImage } from "@/lib/adminClient";
import { wixImageFit } from "@/lib/wix";
import { GLYPHS } from "@/content/site";
import type { PartnerLogo } from "@/content/partners";

/** Drift speed of the lane, in px/s. */
const SPEED = 42;

type Tile = { key: string; node: ReactNode };

/** Logos are shown whole, never cropped: bare Wix ids are asked for a fit, and
 * uploaded URLs (SVG, PNG) are used as they are. */
function logoSrc(raw: string): string {
  return /^(https?:|data:|\/)/.test(raw) ? resolveImage(raw) : wixImageFit(raw, 400, 200);
}

/**
 * The Our Partners marquee: one lane of partner logos under the lander's copy,
 * running sideways at every width — leftward on sm+, rightward on a phone (the
 * direction is CSS, see .pm-* in globals.css, so the server render already
 * matches the screen) — and looping without a seam.
 *
 * The track holds its run twice and slides exactly one run's length (-50%) per
 * cycle, so the end of the animation is pixel-identical to its start. The run
 * is the whole logo list, repeated only as many times as it takes to more than
 * cover the lane (re-measured whenever the lane or a loading logo changes
 * size), and the cycle time is set from the run's length so the drift speed
 * stays the same however many logos there are. Once there are enough logos for
 * one set to outrun the lane, the run is that set alone and its only repeat is
 * the loop's own copy a full set behind, so no logo is ever on screen twice.
 *
 * With no logos in the CMS the lane runs the site's glyphs instead: the
 * uploaded letterforms where there are any, and otherwise the glyph set's
 * characters in the display face (the same fallback the glyphs use elsewhere).
 *
 * Hovering the lane pauses it; with motion off (site setting or OS preference)
 * it stands still.
 */
export default function PartnerMarquee({ logos }: { logos: PartnerLogo[] }) {
  const glyphs = useGlyphMap();
  const named = (logos ?? []).filter((l) => l?.img);
  // `named` is rebuilt every render, so the tiles key off its contents.
  const logoKey = named.map((l) => l.img).join("|");

  const tiles = useMemo<Tile[]>(() => {
    if (named.length > 0) {
      return named.map((l, i) => ({
        key: `l${i}:${l.img}`,
        node: (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc(l.img)}
            alt=""
            draggable={false}
            className="max-h-[55%] max-w-[72%] object-contain opacity-85"
          />
        ),
      }));
    }
    // No logos yet — the glyphs stand in. Only the uploaded letterforms if
    // there are any; the whole set in the display face if there are none.
    const uploaded = GLYPHS.map((g) => g.char).filter((c) => glyphs.has(c));
    const chars = uploaded.length > 0 ? uploaded : GLYPHS.map((g) => g.char);
    return chars.map((c) => ({
      key: `g${c}`,
      node: glyphs.has(c) ? (
        <GlyphMark char={c} tintClassName="bg-white/45" className="block h-9 w-9 md:h-10 md:w-10" />
      ) : (
        <span className="font-display text-4xl uppercase leading-none text-white/45">{c}</span>
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyphs, logoKey]);

  return (
    <>
      {/* The lane repeats themselves for effect; the partners are listed once
          here for assistive tech. */}
      {named.length > 0 && (
        <ul className="sr-only">
          {named.map((l, i) => (
            <li key={i}>{l.name}</li>
          ))}
        </ul>
      )}
      <Lane tiles={tiles} />
    </>
  );
}

function Lane({ tiles }: { tiles: Tile[] }) {
  const still = useMotionOff();
  const laneRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const [reps, setReps] = useState(1);
  const [dur, setDur] = useState<number | null>(null);
  const signature = tiles.map((t) => t.key).join("|");

  useEffect(() => {
    const lane = laneRef.current;
    const run = runRef.current;
    if (!lane || !run) return;
    const measure = () => {
      const laneLen = lane.clientWidth;
      const runLen = run.offsetWidth;
      if (!laneLen || !runLen) return;
      const setLen = runLen / reps;
      const need = Math.max(1, Math.ceil(laneLen / setLen));
      if (need !== reps) setReps(need);
      setDur((setLen * need) / SPEED);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(lane);
    ro.observe(run);
    measure();
    return () => ro.disconnect();
  }, [reps, signature]);

  const run = (clone: boolean) => (
    <div
      ref={clone ? undefined : runRef}
      aria-hidden
      className="pm-run"
    >
      {Array.from({ length: reps }, (_, r) =>
        tiles.map((t) => (
          <div key={`${r}:${t.key}`} className="pm-cell">
            {t.node}
          </div>
        )),
      )}
    </div>
  );

  return (
    <div ref={laneRef} className="pm-lane">
      <div
        className="pm-track"
        data-still={still || undefined}
        style={dur ? { ["--pm-dur" as string]: `${dur.toFixed(2)}s` } : undefined}
      >
        {run(false)}
        {!still && run(true)}
      </div>
    </div>
  );
}
