"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// useLayoutEffect on the server is a no-op that logs a warning; fall back to
// useEffect there so SSR stays quiet while the fit still runs pre-paint client-side.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Options = {
  /** Largest font-size to try, in px. */
  max?: number;
  /** Smallest font-size to accept, in px (content is clipped below this). */
  min?: number;
  /** Keep the content on a single line (fit width only, never wrap). */
  singleLine?: boolean;
  /** Only run the fit while this media query matches (e.g. mobile-only). */
  query?: string;
  /** Re-fit whenever any of these change (e.g. the text and the locale). */
  deps?: unknown[];
};

/**
 * Binary-searches the largest font-size (between `min` and `max`) at which the
 * referenced element's content fits inside its own box, and applies it inline.
 *
 * Attach the returned ref to a box with a bounded size and `overflow: hidden`.
 * Its children should size in `em` so they scale with the fitted font-size.
 * With `singleLine`, the box is kept `white-space: nowrap` and only its width
 * is fit; otherwise both width and height are fit (shrink-to-box).
 *
 * The fit re-runs on mount, on element/parent resize, and whenever `deps`
 * change. When `query` is given and does not match, the inline size is cleared
 * so CSS classes control the type again (used to keep the desktop layout).
 */
export default function useFitText<T extends HTMLElement>({
  max = 40,
  min = 10,
  singleLine = false,
  query,
  deps = [],
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const [fontSize, setFontSize] = useState<number | undefined>(undefined);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    if (query && !window.matchMedia(query).matches) {
      el.style.fontSize = "";
      setFontSize(undefined);
      return;
    }

    // Single-line fit only constrains width (height is one line by definition);
    // box fit constrains both. Either way, width must never overflow.
    const fits = () =>
      el.scrollWidth <= el.clientWidth + 0.5 &&
      (singleLine || el.scrollHeight <= el.clientHeight + 0.5);

    let lo = min;
    let hi = max;
    let best = min;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = `${mid}px`;
      if (fits()) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    el.style.fontSize = `${best}px`;
    setFontSize(best);
  }, [max, min, singleLine, query]);

  useIsoLayoutEffect(() => {
    fit();
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);

    const mq = query ? window.matchMedia(query) : null;
    const onChange = () => fit();
    mq?.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);

    return () => {
      ro.disconnect();
      mq?.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, ...deps]);

  return { ref, fontSize } as const;
}
