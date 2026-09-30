"use client";

import { useEffect, useState } from "react";

/**
 * Partner logos arrive as whatever file the partner handed over, and a lot of
 * them carry a wide transparent margin around the mark: sized to fill its
 * cell, such a file still draws a small logo in the middle of it. This trims
 * that margin off in the browser — the logo is drawn to a canvas once, the box
 * around its visible pixels found, and a cropped copy used in its place — so
 * every logo fills the space it is given however it was exported.
 *
 * It only ever improves on the original: a logo with no margin worth trimming,
 * one with an opaque background (nothing to trim by), or one the browser won't
 * let us read (a host without CORS taints the canvas) is shown as it came.
 * Results are cached per source for the life of the page, so the marquee's
 * repeated cells and the roster share one pass per logo.
 */

/** Pixels at or under this alpha (0–255) count as empty margin. */
const ALPHA_EMPTY = 12;
/** Longest side the logo is examined (and re-drawn) at. */
const MAX_SIDE = 640;
/** Not worth a swap unless the margin is at least this share of a side. */
const MIN_GAIN = 0.04;

const cache = new Map<string, Promise<string | null>>();
const done = new Map<string, string | null>();

function trim(src: string): Promise<string | null> {
  const hit = cache.get(src);
  if (hit) return hit;
  const job = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        // SVGs without intrinsic size report 0; give them a working size.
        const nw = img.naturalWidth || 512;
        const nh = img.naturalHeight || 256;
        const k = Math.min(1, MAX_SIDE / Math.max(nw, nh));
        const w = Math.max(1, Math.round(nw * k));
        const h = Math.max(1, Math.round(nh * k));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h); // throws if tainted
        let top = h,
          left = w,
          right = -1,
          bottom = -1;
        for (let y = 0; y < h; y++) {
          const row = y * w * 4;
          for (let x = 0; x < w; x++) {
            if (data[row + x * 4 + 3] > ALPHA_EMPTY) {
              if (x < left) left = x;
              if (x > right) right = x;
              if (y < top) top = y;
              bottom = y;
            }
          }
        }
        if (right < 0) return resolve(null); // fully transparent: leave it be
        const cw = right - left + 1;
        const ch = bottom - top + 1;
        if (1 - cw / w < MIN_GAIN && 1 - ch / h < MIN_GAIN) return resolve(null);
        const out = document.createElement("canvas");
        out.width = cw;
        out.height = ch;
        out.getContext("2d")!.drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
        resolve(out.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.src = src;
  }).then((r) => {
    done.set(src, r);
    return r;
  });
  cache.set(src, job);
  return job;
}

/** The logo at `src`, with its empty margin trimmed off once that is known (the
 * original until then, and for good if there is nothing to trim). */
export function useTrimmedLogo(src: string): string {
  const [out, setOut] = useState(() => done.get(src) ?? src);
  useEffect(() => {
    let alive = true;
    setOut(done.get(src) ?? src);
    trim(src).then((r) => {
      if (alive && r) setOut(r);
    });
    return () => {
      alive = false;
    };
  }, [src]);
  return out;
}
