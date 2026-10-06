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
 *
 * useWhiteLogo runs the same pass with the logo turned into a white silhouette
 * first (see whiten), for the roster.
 */

/** Pixels at or under this alpha (0–255) count as empty margin. */
const ALPHA_EMPTY = 12;
/** Longest side the logo is examined (and re-drawn) at. */
const MAX_SIDE = 640;
/** Not worth a swap unless the margin is at least this share of a side. */
const MIN_GAIN = 0.04;

/** White mode: corners within this per-channel spread count as one solid
 * background colour, and a pixel's opacity ramps up from fully knocked out
 * at KNOCK_LO away from that colour to fully kept at KNOCK_HI. */
const BG_SPREAD = 24;
const KNOCK_LO = 14;
const KNOCK_HI = 64;
/** How far in from the visible area's corners the background is read, as a
 * share of its shorter side. */
const CORNER_INSET = 0.03;

const cache = new Map<string, Promise<string | null>>();
const done = new Map<string, string | null>();

type Box = { top: number; left: number; right: number; bottom: number };

/** The box around the visible pixels, or null when there are none. */
function bounds(data: Uint8ClampedArray, w: number, h: number): Box | null {
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
  return right < 0 ? null : { top, left, right, bottom };
}

/** White mode: every visible pixel turned white, its opacity kept. A logo on
 * a solid background (a JPG on white, say) has that background knocked out
 * first, so the mark comes out as a white silhouette rather than a white box.
 * The background is read just inside the corners of the visible area — inside
 * any transparent margin, and past a thin frame round the edge. */
function whiten(data: Uint8ClampedArray, w: number, box: Box) {
  const at = (x: number, y: number) => (y * w + x) * 4;
  const inset = Math.round(
    Math.min(box.right - box.left, box.bottom - box.top) * CORNER_INSET,
  );
  const l = box.left + inset;
  const r = box.right - inset;
  const t = box.top + inset;
  const b = box.bottom - inset;
  const corners = [at(l, t), at(r, t), at(l, b), at(r, b)];
  let bg: [number, number, number] | null = null;
  if (corners.every((i) => data[i + 3] > 250)) {
    const c0 = corners[0];
    const same = corners.every((i) =>
      [0, 1, 2].every((k) => Math.abs(data[i + k] - data[c0 + k]) <= BG_SPREAD),
    );
    if (same) bg = [data[c0], data[c0 + 1], data[c0 + 2]];
  }
  for (let i = 0; i < data.length; i += 4) {
    if (bg) {
      const d = Math.max(
        Math.abs(data[i] - bg[0]),
        Math.abs(data[i + 1] - bg[1]),
        Math.abs(data[i + 2] - bg[2]),
      );
      const keep = Math.min(1, Math.max(0, (d - KNOCK_LO) / (KNOCK_HI - KNOCK_LO)));
      data[i + 3] = Math.round(data[i + 3] * keep);
    }
    data[i] = data[i + 1] = data[i + 2] = 255;
  }
}

function trim(src: string, white = false): Promise<string | null> {
  const key = white ? `${src}\u0000white` : src;
  const hit = cache.get(key);
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
        const pixels = ctx.getImageData(0, 0, w, h); // throws if tainted
        const { data } = pixels;
        if (white) {
          const visible = bounds(data, w, h);
          if (!visible) return resolve(null);
          whiten(data, w, visible);
          ctx.putImageData(pixels, 0, 0);
        }
        const box = bounds(data, w, h);
        if (!box) return resolve(null); // fully transparent: leave it be
        const { top, left, right, bottom } = box;
        const cw = right - left + 1;
        const ch = bottom - top + 1;
        // Nothing worth trimming: keep the original — unless it was whitened,
        // when the whitened copy is the point.
        if (!white && 1 - cw / w < MIN_GAIN && 1 - ch / h < MIN_GAIN) return resolve(null);
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
    done.set(key, r);
    return r;
  });
  cache.set(key, job);
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

/** The logo at `src` as a white silhouette, trimmed (see whiten). `null` while
 * that is being worked out; `failed` when the file can't be read (a host
 * without CORS), so the caller can fall back to a CSS filter on the original. */
export function useWhiteLogo(src: string): { src: string | null; failed: boolean } {
  const key = `${src}\u0000white`;
  const known = done.has(key);
  const [out, setOut] = useState<string | null | undefined>(() =>
    known ? done.get(key) : undefined,
  );
  useEffect(() => {
    let alive = true;
    setOut(done.has(key) ? done.get(key) : undefined);
    trim(src, true).then((r) => {
      if (alive) setOut(r);
    });
    return () => {
      alive = false;
    };
  }, [src, key]);
  return out === undefined ? { src: null, failed: false } : out ? { src: out, failed: false } : { src, failed: true };
}
