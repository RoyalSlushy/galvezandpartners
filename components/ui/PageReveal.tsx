"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// useLayoutEffect on the server is a no-op that logs a warning; fall back to
// useEffect there (same convention as useFitText).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// A stalled asset must never hold the page hostage — reveal regardless once
// this much time has passed.
const MAX_WAIT_MS = 4000;

/**
 * Full-viewport veil over the page while the assets inside the first viewport
 * finish loading, so a page is only ever revealed fully painted — no images
 * popping in one by one across the first screen.
 *
 * Rendered in the root layout. The veil ships in the server HTML already
 * covering the page (the spinner's delayed fade-in and spin are pure CSS, so
 * it works before hydration too); once mounted, the effect below waits for
 * every in-viewport <img> (swept repeatedly, so images mounted late by
 * client-only effects are caught) plus the webfonts, then fades the veil out.
 * Client-side navigations re-veil synchronously before the incoming page can
 * paint. Images below the fold are left to lazy-load as normal, and <noscript>
 * visitors never see the veil at all (see the style block in the layout).
 */
export default function PageReveal() {
  const pathname = usePathname();
  const [veiled, setVeiled] = useState(true);
  const runRef = useRef(0);

  // Re-veil pre-paint whenever the route changes so the incoming page is never
  // seen half-loaded. (On first mount this is a no-op — the state starts true.)
  useIsoLayoutEffect(() => {
    setVeiled(true);
  }, [pathname]);

  useEffect(() => {
    const run = ++runRef.current;
    const deadline = performance.now() + MAX_WAIT_MS;
    const current = () => runRef.current === run;

    const nextFrames = () =>
      new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const inViewport = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
      );
    };

    const settled = (img: HTMLImageElement) =>
      new Promise<void>((resolve) => {
        if (img.complete) return resolve();
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, Math.max(0, deadline - performance.now()));
      });

    (async () => {
      // Give client-only content a couple of frames to mount its images
      // before the first sweep.
      await nextFrames();
      const seen = new Set<HTMLImageElement>();
      // Sweep until a pass finds nothing new still loading in the viewport.
      while (current() && performance.now() < deadline) {
        const pending = Array.from(document.images).filter(
          (img) => !seen.has(img) && !img.complete && inViewport(img)
        );
        if (pending.length === 0) break;
        pending.forEach((img) => seen.add(img));
        await Promise.all(pending.map(settled));
        await nextFrames();
      }
      // Webfonts landing late reflow the text the same way a popping image
      // does — hold for them too, under the same deadline.
      await Promise.race([
        document.fonts?.ready.catch(() => {}),
        new Promise((r) => setTimeout(r, Math.max(0, deadline - performance.now()))),
      ]);
      if (current()) setVeiled(false);
    })();
  }, [pathname]);

  return (
    <div
      aria-hidden
      data-gp-veil
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-navy transition-opacity duration-500 ${
        veiled ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* Delayed fade-in (see .gp-veil-spinner) so instant loads never flash it;
          the brand favicon gently "breathes" (scale + opacity) while loading. */}
      <span className="gp-veil-spinner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.svg" alt="" className="gp-veil-breathe h-16 w-16" />
      </span>
    </div>
  );
}
