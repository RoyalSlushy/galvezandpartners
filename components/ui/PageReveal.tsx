"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// useLayoutEffect on the server is a no-op that logs a warning; fall back to
// useEffect there (same convention as useFitText).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// A stalled asset must never hold the page hostage — reveal regardless once
// this much time has passed.
const MAX_WAIT_MS = 4000;
// The veil holds at least this long even when everything is already cached, so
// the reveal always reads as a deliberate beat rather than a flicker.
const MIN_SHOW_MS = 1000;

/**
 * Veil over the page's body content (everything below the masthead) while the
 * assets inside the first viewport finish loading, so a page is only ever
 * revealed fully painted — no images popping in one by one across the first
 * screen. The header is never covered: the veil is absolutely positioned inside
 * the content wrapper that holds <main> and the footer, so the masthead stays
 * visible whenever it is in view, and the spinner sticks to the viewport center
 * of whatever slice of the veil is on screen.
 *
 * Rendered in the root layout. The veil ships in the server HTML already
 * covering the content (the spinner's delayed fade-in and spin are pure CSS, so
 * it works before hydration too); once mounted, the effect below waits for
 * every in-viewport <img> (swept repeatedly, so images mounted late by
 * client-only effects are caught) plus the webfonts, then fades the veil out.
 * Client-side navigations re-veil synchronously before the incoming page can
 * paint. Images below the fold are left to lazy-load as normal, and <noscript>
 * visitors never see the veil at all (see the style block in the layout).
 *
 * Navigations also carry a direction, taken from where the two pages sit in the
 * site nav: going to a menu item further right pushes the outgoing page out to
 * the left, and the veil then slides off the same way to reveal the new one
 * (mirrored for a leftward move). `navOrder` is the nav's hrefs in menu order;
 * routes outside the menu (a case study, say) have no place in that order and
 * simply cross-fade, as does a back/forward step.
 */
// How far the outgoing page slides before the veil takes over, and how long the
// two halves of the transition run.
const PUSH_PX = 64;
const PUSH_MS = 300;
const SLIDE_MS = 600;

export default function PageReveal({ navOrder = [] }: { navOrder?: string[] }) {
  const pathname = usePathname();
  const [veiled, setVeiled] = useState(true);
  // Direction of the navigation in progress: +1 rightward through the menu, -1
  // leftward, 0 for a plain cross-fade.
  const [dir, setDir] = useState(0);
  const pendingDir = useRef(0);
  const runRef = useRef(0);

  // Watch link presses so the direction is known *before* the route changes —
  // the outgoing page starts pushing while the next one is still being fetched.
  useEffect(() => {
    if (navOrder.length === 0) return;
    const page = () => document.querySelector<HTMLElement>("[data-gp-page]");
    // Where a path sits in the menu: an exact hit, else the section it lives
    // under ("/" excluded — everything starts with it), else nowhere.
    const rank = (path: string) => {
      const exact = navOrder.indexOf(path);
      if (exact >= 0) return exact;
      let best = -1;
      let bestLen = 0;
      navOrder.forEach((href, i) => {
        if (href !== "/" && path.startsWith(`${href}/`) && href.length > bestLen) {
          best = i;
          bestLen = href.length;
        }
      });
      return best;
    };
    let revertTimer: ReturnType<typeof setTimeout> | undefined;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      const to = href.split(/[?#]/)[0];
      if (!to || to === pathname) return;
      const from = rank(pathname);
      const there = rank(to);
      const d = from < 0 || there < 0 ? 0 : Math.sign(there - from);
      // Reduced motion keeps the plain cross-fade — no push, no slide.
      if (d === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      pendingDir.current = d;
      const el = page();
      if (!el) return;
      el.style.transition = `transform ${PUSH_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${PUSH_MS}ms ease`;
      el.style.transform = `translate3d(${-d * PUSH_PX}px,0,0)`;
      el.style.opacity = "0";
      // A press that ends up not navigating (something else swallowed it) must
      // not leave the page pushed aside; a route change clears this first.
      clearTimeout(revertTimer);
      revertTimer = setTimeout(() => el.removeAttribute("style"), 2500);
    };
    // Capture phase: Next's own Link handler calls preventDefault on the way
    // through, so a bubbling listener would only ever see cancelled events.
    document.addEventListener("click", onClick, true);
    return () => {
      clearTimeout(revertTimer);
      document.removeEventListener("click", onClick, true);
    };
  }, [navOrder, pathname]);

  // Re-veil pre-paint whenever the route changes so the incoming page is never
  // seen half-loaded. (On first mount this is a no-op — the state starts true.)
  useIsoLayoutEffect(() => {
    setDir(pendingDir.current);
    pendingDir.current = 0;
    setVeiled(true);
    // The incoming page starts clean under the veil: dropping the inline
    // transition along with the offset means it snaps back rather than easing.
    const el = document.querySelector<HTMLElement>("[data-gp-page]");
    if (el) el.removeAttribute("style");
  }, [pathname]);

  useEffect(() => {
    const run = ++runRef.current;
    const startedAt = performance.now();
    const deadline = startedAt + MAX_WAIT_MS;
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
      // Enforce the minimum show time so a fully-cached page still gets the
      // deliberate reveal beat instead of a flash.
      const remaining = MIN_SHOW_MS - (performance.now() - startedAt);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      if (current()) setVeiled(false);
    })();
  }, [pathname]);

  return (
    <div
      aria-hidden
      data-gp-veil
      // The veil only ever *leaves*. Covering is instant (no transition on the
      // way in) so a client-side navigation can't flash the incoming page
      // through a fading-in veil. On the way out it fades, and — when the
      // navigation had a direction — slides off that way, carrying on the push
      // the outgoing page started. (The content wrapper clips horizontally, so
      // the departing veil never widens the page.)
      className={`absolute inset-0 z-[100] bg-navy ${
        veiled ? "opacity-100" : "pointer-events-none opacity-0 transition-opacity duration-500"
      }`}
      style={
        veiled || dir === 0
          ? undefined
          : {
              transform: `translate3d(${-dir * 100}%,0,0)`,
              transition: `opacity 500ms ease, transform ${SLIDE_MS}ms cubic-bezier(0.22,1,0.36,1)`,
            }
      }
    >
      {/* The veil spans the whole content column, so the spinner sticks to the
          viewport rather than sitting at the top of a very tall page. */}
      <div className="sticky top-0 flex h-screen items-center justify-center">
        {/* Delayed fade-in (see .gp-veil-spinner) so instant loads never flash
            it; the brand favicon gently "breathes" while loading. */}
        <span className="gp-veil-spinner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="" className="gp-veil-breathe h-16 w-16" />
        </span>
      </div>
    </div>
  );
}
