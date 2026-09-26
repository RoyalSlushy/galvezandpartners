"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GlyphMark, useGlyphMap } from "@/components/ui/Glyph";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { resolveImage } from "@/lib/adminClient";
import { wixImageFit } from "@/lib/wix";
import { GLYPHS } from "@/content/site";
import type { PartnerLogo } from "@/content/partners";
import { useTrimmedLogo } from "./useTrimmedLogo";

/** Drift speed of the lane, in px/s. */
const SPEED = 42;
/** How quickly a fling's leftover speed dies away (per second, exponential). */
const FLING_DECAY = 3.2;
/** A press has to travel this far (px) sideways before it counts as a drag. */
const DRAG_SLOP = 6;

type Tile = { key: string; node: ReactNode };

/** Logos are shown whole, never cropped: bare Wix ids are asked for a fit, and
 * uploaded URLs (SVG, PNG) are used as they are. */
export function logoSrc(raw: string): string {
  return /^(https?:|data:|\/)/.test(raw) ? resolveImage(raw) : wixImageFit(raw, 400, 200);
}

/**
 * The Our Partners marquee: one lane of partner logos under the lander's copy,
 * drifting sideways at every width — leftward on sm+, rightward on a phone —
 * looping without a seam, and draggable.
 *
 * The track holds its run twice, and its offset is kept within one run's
 * length (wrapping modulo it), so wherever it stands the picture is seamless.
 * The run is the whole logo list, repeated only as many times as it takes to
 * more than cover the lane (re-measured whenever the lane or a loading logo
 * changes size). Once there are enough logos for one set to outrun the lane,
 * the run is that set alone, so no logo is ever on screen twice.
 *
 * The drift is driven frame by frame rather than by a CSS animation, so a drag
 * can take hold of it: pressing and pulling sideways moves the lane with the
 * pointer (a vertical pull is left to the page), and letting go flings it on at
 * the speed it was thrown, easing back into the drift. Hovering eases the drift
 * to a stop. With motion off (site setting or OS preference) there is no drift,
 * but the lane can still be dragged.
 *
 * Each logo is trimmed of any empty margin in its file (see useTrimmedLogo) and
 * then drawn to fill its cell inside an even padding, so every mark reaches the
 * padding however it was exported.
 *
 * With no logos in the CMS the lane runs the site's glyphs instead: the
 * uploaded letterforms where there are any, and otherwise the glyph set's
 * characters in the display face (the same fallback the glyphs use elsewhere).
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
        node: <MarqueeLogo src={logoSrc(l.img)} />,
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

/** A logo trimmed of its empty margin and filling its cell's content box (the
 * cell supplies the padding); object-contain keeps it whole. */
function MarqueeLogo({ src }: { src: string }) {
  const trimmed = useTrimmedLogo(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt=""
      draggable={false}
      className="pm-logo h-full w-full min-h-0 min-w-0 object-contain opacity-85"
    />
  );
}

function Lane({ tiles }: { tiles: Tile[] }) {
  const still = useMotionOff();
  const laneRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const [reps, setReps] = useState(1);
  const [dragging, setDragging] = useState(false);
  const signature = tiles.map((t) => t.key).join("|");

  // Enough copies of the set in one run to more than cover the lane.
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
    };
    const ro = new ResizeObserver(measure);
    ro.observe(lane);
    ro.observe(run);
    measure();
    return () => ro.disconnect();
  }, [reps, signature]);

  // The drift and the drag, frame by frame. The offset wraps within one run's
  // length, so the track's two runs always cover the lane.
  useEffect(() => {
    const lane = laneRef.current;
    const track = trackRef.current;
    const run = runRef.current;
    if (!lane || !track || !run) return;
    const across = window.matchMedia("(min-width: 751px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let offset = 0;
    let fling = 0; // leftover px/s from a throw
    let pace = 1; // eased 1 = drifting, 0 = held (hover or drag)
    let hovered = false;
    let press: { id: number; x: number; y: number; at: number; dragging: boolean } | null = null;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let last: number | null = null;
    let raf = 0;

    const place = () => {
      const len = run.offsetWidth;
      if (len > 0) offset = ((offset % len) - len) % len; // (-len, 0]
      track.style.transform = `translate3d(${offset}px,0,0)`;
    };

    const tick = (t: number) => {
      if (last == null) last = t;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const held = hovered || !!press?.dragging;
      pace += ((held ? 0 : 1) - pace) * Math.min(1, dt * 5);
      if (!press?.dragging) {
        const drift = still || reduce.matches ? 0 : SPEED * (across.matches ? -1 : 1);
        offset += (drift * pace + fling) * dt;
        fling *= Math.exp(-FLING_DECAY * dt);
        if (Math.abs(fling) < 1) fling = 0;
      }
      place();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, at: offset, dragging: false };
      lastX = e.clientX;
      lastT = e.timeStamp;
      velocity = 0;
      fling = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x;
      if (!press.dragging) {
        const dy = e.clientY - press.y;
        // A mostly vertical pull is the page's to scroll.
        if (Math.abs(dy) > DRAG_SLOP && Math.abs(dy) > Math.abs(dx)) {
          press = null;
          return;
        }
        if (Math.abs(dx) < DRAG_SLOP) return;
        press.dragging = true;
        setDragging(true);
        lane.setPointerCapture(e.pointerId);
      }
      offset = press.at + dx;
      const dt = (e.timeStamp - lastT) / 1000;
      if (dt > 0) velocity = velocity * 0.6 + ((e.clientX - lastX) / dt) * 0.4;
      lastX = e.clientX;
      lastT = e.timeStamp;
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      if (press.dragging) {
        // A pause before letting go is not a throw.
        fling = e.timeStamp - lastT > 80 ? 0 : Math.max(-2400, Math.min(2400, velocity));
        setDragging(false);
      }
      press = null;
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };

    lane.addEventListener("pointerdown", onDown);
    lane.addEventListener("pointermove", onMove);
    lane.addEventListener("pointerup", onUp);
    lane.addEventListener("pointercancel", onUp);
    lane.addEventListener("pointerenter", onEnter);
    lane.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      lane.removeEventListener("pointerdown", onDown);
      lane.removeEventListener("pointermove", onMove);
      lane.removeEventListener("pointerup", onUp);
      lane.removeEventListener("pointercancel", onUp);
      lane.removeEventListener("pointerenter", onEnter);
      lane.removeEventListener("pointerleave", onLeave);
    };
  }, [still, signature]);

  const run = (clone: boolean) => (
    <div ref={clone ? undefined : runRef} aria-hidden className="pm-run">
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
    <div
      ref={laneRef}
      className="pm-lane"
      data-dragging={dragging || undefined}
      // Vertical swipes still scroll the page; sideways ones drag the lane.
      style={{ touchAction: "pan-y" }}
    >
      <div ref={trackRef} className="pm-track">
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}
