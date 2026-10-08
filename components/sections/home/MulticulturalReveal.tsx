"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import ManifestoEditor from "./manifesto/Editor";
import PreviewBar from "./manifesto/PreviewBar";
import { resolveManifestoStyle, type ManifestoStyleId } from "./manifesto/styles";
import type { ManifestoProps, Multicultural } from "./manifesto/shared";

// One chunk per style: a visitor downloads the style the site is set to and no
// other. Each is still rendered on the server, so the section arrives in the
// HTML whichever it is. Switching styles in the browser (the editor's preview)
// can wait a moment on a chunk; the screen-tall stand-in keeps the page from
// folding up under the admin meanwhile.
const holding = () => <div aria-hidden className="mc-screen w-full bg-navy" />;
const STYLES: Record<ManifestoStyleId, ComponentType<ManifestoProps>> = {
  ink: dynamic(() => import("./manifesto/InkFill"), { loading: holding }),
  curtain: dynamic(() => import("./manifesto/CurtainCall"), { loading: holding }),
  stardust: dynamic(() => import("./manifesto/Stardust"), { loading: holding }),
  gobig: dynamic(() => import("./manifesto/GoBig"), { loading: holding }),
  departures: dynamic(() => import("./manifesto/Departures"), { loading: holding }),
  gravity: dynamic(() => import("./manifesto/Gravity"), { loading: holding }),
};

/**
 * "the multi-cultural / Agency doing / big things" manifesto.
 *
 * The section comes in several styles — the ways it can make its entrance (see
 * manifesto/styles.ts) — and the one in home.multicultural.style is the one
 * rendered. Ink Fill, the original, is the default. Every style shares the same
 * copy (the title lines, the intro) and the same optional visual.
 *
 * Edit mode shows every style the same still, editable layout (see
 * manifesto/Editor), with a chip in its corner to pick the style and a Preview
 * that plays the staged one full size, in place: the section swaps back to
 * what a visitor gets — draft copy and all — until the admin is done. Replay
 * runs the page up a screen and glides it back down, so the style arrives the
 * way it does for a visitor scrolling down from the hero (and a scroll-driven
 * style is played through on its own).
 */
export default function MulticulturalReveal({
  multicultural: serverMulticultural,
}: {
  multicultural: Multicultural;
}) {
  const multicultural = useCmsValue("home.multicultural", serverMulticultural);
  const editMode = useEditMode();
  const style = resolveManifestoStyle(multicultural.style);
  const [previewing, setPreviewing] = useState(false);
  // Bumped to remount (and so replay) the previewed style.
  const [take, setTake] = useState(0);
  const markerRef = useRef<HTMLSpanElement>(null);

  // Leaving the edit session ends a preview along with it.
  useEffect(() => {
    if (!editMode) setPreviewing(false);
  }, [editMode]);

  const sectionTop = useCallback(() => {
    const marker = markerRef.current;
    return marker ? Math.round(marker.getBoundingClientRect().top + window.scrollY) : null;
  }, []);

  // Each take of a preview arrives from a screen above, as it would for a
  // visitor; a scroll-driven style is then scrolled through for them.
  useEffect(() => {
    if (!previewing) return;
    const top = sectionTop();
    if (top === null) return;
    // The track is looked up when the glide lands, not now: the style's code
    // may still be on its way, with only a stand-in in its place.
    return playFrom(top, style === "gobig" ? () => markerRef.current?.nextElementSibling ?? null : null);
    // A new take is what starts it, so only `take` (and entering preview) count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewing, take]);

  if (editMode && !previewing) {
    return (
      <>
        <span ref={markerRef} aria-hidden className="block h-0" />
        <ManifestoEditor
          multicultural={multicultural}
          style={style}
          onPreview={() => {
            setTake((n) => n + 1);
            setPreviewing(true);
          }}
        />
      </>
    );
  }

  const Style = STYLES[style];
  return (
    <>
      <span ref={markerRef} aria-hidden className="block h-0" />
      <Style key={`${style}:${take}`} multicultural={multicultural} />
      {editMode && previewing && (
        <PreviewBar
          style={style}
          onReplay={() => setTake((n) => n + 1)}
          onDone={() => {
            setPreviewing(false);
            // Back to the (shorter) editing layout, still looking at it.
            requestAnimationFrame(() => {
              const top = sectionTop();
              if (top !== null) window.scrollTo({ top, behavior: "instant" });
            });
          }}
        />
      )}
    </>
  );
}

/**
 * Jump a screen above the section and glide down onto it — and, for a
 * scroll-driven style whose section is taller than the screen (`track` finds
 * it), carry on through it at an even pace. Any wheel, touch or key from the
 * admin hands the scroll straight back to them. Returns a cancel.
 */
function playFrom(top: number, track: (() => Element | null) | null): () => void {
  let raf = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  };

  window.scrollTo({ top: Math.max(0, top - window.innerHeight), behavior: "instant" });
  raf = requestAnimationFrame(() => {
    window.scrollTo({ top, behavior: "smooth" });
    if (!track) return;
    // Give the glide time to land, hold on the composed title a beat, then
    // scroll through.
    timer = setTimeout(() => {
      const el = track();
      if (stopped || !el) return;
      const end = top + Math.max(0, el.getBoundingClientRect().height - window.innerHeight);
      if (end <= top) return;
      const from = window.scrollY;
      const start = performance.now();
      const ms = 3400;
      const step = (now: number) => {
        if (stopped) return;
        const u = Math.min(1, (now - start) / ms);
        const e = 0.5 - Math.cos(Math.PI * u) / 2;
        window.scrollTo({ top: from + (end - from) * e, behavior: "instant" });
        if (u < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 1500);
  });

  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);
  return stop;
}
