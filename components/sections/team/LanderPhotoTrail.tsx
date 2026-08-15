"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhotoFrame } from "@/components/ui/PhotoCard";
import { resolveImage } from "@/lib/adminClient";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

/** How far the pointer must travel before another picture is laid down, in px.
 * Sets how tightly packed the trail is. */
const SPAWN_GAP = 96;
/** A runaway guard only — pictures take themselves off the screen when their
 * animation ends, and the pointer would have to be flung to keep this many alive
 * at once. */
const MAX_LIVE = 40;
/** Tilts, walked in turn so no two pictures in a row land at the same angle. */
const TILTS = ["-9deg", "6deg", "-4deg", "8deg", "-7deg", "5deg"];

type Drop = { id: number; src: string; x: number; y: number; rot: string };

/** Fisher-Yates, so which photographs come up varies between visits. */
function shuffled<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The Our Team lander's gallery: the team-together photographs follow the
 * cursor. One is laid down for every SPAWN_GAP the pointer travels across the
 * lander, and each snaps up, holds and sinks away on its own, so a moving cursor
 * draws a line of photographs behind it that closes up again once it stops.
 *
 * The whole layer sits behind the lander's copy, so the trail passes underneath
 * the heading rather than over it wherever the pointer goes.
 *
 * Pictures come from the pool in a shuffled walk, so every one uploaded gets its
 * turn before any repeats. A touch drag paints the trail the same way a mouse
 * does; under reduced motion nothing is drawn at all, since the whole thing is
 * motion. Purely decorative.
 */
export default function LanderPhotoTrail({ images }: { images: string[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  // The shuffled pool and how far through it we are, so successive pictures walk
  // the whole set before repeating.
  const poolRef = useRef<string[]>([]);
  const cursorRef = useRef(0);
  /** Where the last picture was laid down, so spacing is measured by distance
   * travelled rather than by time — a slow cursor draws the same trail as a fast
   * one, just more slowly. */
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const seqRef = useRef(0);
  const reduced = usePrefersReducedMotion();

  const pool = images.filter(Boolean);
  const poolKey = pool.join("|");

  const nextSrc = useCallback(() => {
    if (poolRef.current.length === 0) return "";
    if (cursorRef.current >= poolRef.current.length) {
      poolRef.current = shuffled(poolRef.current);
      cursorRef.current = 0;
    }
    return poolRef.current[cursorRef.current++];
  }, []);

  useEffect(() => {
    if (reduced || pool.length === 0) return;
    const wrap = wrapRef.current;
    // The layer is click-through, so the pointer is followed on the lander
    // itself and the position taken relative to the layer.
    const host = wrap?.closest("section");
    if (!wrap || !host) return;

    poolRef.current = shuffled(pool);
    cursorRef.current = 0;
    lastRef.current = null;

    // Pointer moves arrive far faster than the screen is painted, so the latest
    // is held and read back once a frame.
    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const lay = () => {
      frame = 0;
      const at = pending;
      pending = null;
      if (!at) return;
      const box = wrap.getBoundingClientRect();
      const x = at.x - box.left;
      const y = at.y - box.top;
      const last = lastRef.current;
      if (last && Math.hypot(x - last.x, y - last.y) < SPAWN_GAP) return;
      lastRef.current = { x, y };
      const id = ++seqRef.current;
      const drop: Drop = { id, src: nextSrc(), x, y, rot: TILTS[id % TILTS.length] };
      setDrops((prev) => [...prev, drop].slice(-MAX_LIVE));
    };

    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (!frame) frame = window.requestAnimationFrame(lay);
    };
    // Coming back to the lander starts a fresh trail rather than drawing a line
    // from wherever the pointer left it.
    const onLeave = () => {
      lastRef.current = null;
    };

    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey, reduced, nextSrc]);

  if (pool.length === 0) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      {drops.map((d) => (
        <div
          key={d.id}
          // Each picture takes itself off the screen the moment its animation is
          // over, so the trail needs no timers and no sweeping up.
          onAnimationEnd={() => setDrops((prev) => prev.filter((p) => p.id !== d.id))}
          style={{ left: d.x, top: d.y }}
          className="gp-trail-card absolute w-[clamp(4.5rem,9vw,8.5rem)]"
        >
          <PhotoFrame src={resolveImage(d.src, 400, 500)} rot={d.rot} />
        </div>
      ))}
    </div>
  );
}
