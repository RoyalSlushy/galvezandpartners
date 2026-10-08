"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import NextChevron from "@/components/ui/NextChevron";
import { useMotionOff, type MotionStyle } from "@/components/motion/MotionProvider";
import { useScrollStops, type ScrollStops } from "@/components/motion/useScrollStops";
import { isVideoUrl, resolveImage } from "@/lib/adminClient";

/**
 * The pieces every manifesto style is built from: the full-screen shell with
 * its snap stops and chevron, the copy/visual columns, the visual's frame, the
 * title with its payoff line fitted edge to edge, and the hook that tells a
 * style when it has arrived on screen.
 *
 * A style is only ever rendered as visitors see it — the editor has its own
 * static layout (Editor.tsx) — so nothing here asks about edit mode. The one
 * exception to "visitors only" is the editor's preview, which renders a style
 * exactly as a visitor would get it, with the staged copy.
 */

export type Multicultural = {
  titleLines: string[];
  intro: string;
  image: string;
  style?: string;
};

/** What every style is handed. */
export type ManifestoProps = { multicultural: Multicultural };

/**
 * For arming an entrance: a style that holds its copy back until it arrives
 * has to do so before the browser paints, or a section mounted on screen (a
 * preview, a replay) shows its copy for a frame and then snatches it away.
 * useLayoutEffect does nothing on the server and says so; this is it in the
 * browser and a plain effect there (the same convention as PageReveal).
 */
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Whether a style may animate: the site's motion setting (which already holds
 * at "off" under the OS's reduced-motion setting) and, since that setting only
 * reaches the provider a moment after first paint, the OS setting itself. For
 * use inside effects. */
export function canAnimate(motion: MotionStyle): boolean {
  if (motion === "off") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The manifesto's snap stops: the hero (the top of the page), this section's
 * top, and the top of the section after it (featured work). A scroll that comes
 * to rest between two neighbouring stops is carried on the way it was going, to
 * the next stop down or back to the one above (see useScrollStops). Past the
 * last stop the page scrolls freely. Where the section is taller than the
 * screen (a short phone) the stretch in which its foot is still coming up is
 * left free as well, so all of it can be read.
 */
export function manifestoStops(section: HTMLElement): ScrollStops {
  const y = window.scrollY;
  const rect = section.getBoundingClientRect();
  const top = Math.round(rect.top + y);
  const next = Math.round(rect.bottom + y);
  // Where the section's foot meets the screen's; past `top` only when the
  // section is taller than the screen.
  const foot = next - window.innerHeight;
  return foot > top + 1
    ? { stops: [0, top, foot, next], freeGap: 1 }
    : { stops: [0, top, next] };
}

/**
 * The section itself, composed to a single screen: at least the height of the
 * visible viewport (.mc-screen, which follows a phone's collapsing address bar),
 * its contents centred in the space between the compact marquee pinned over its
 * top and a chevron at its foot that glides on to the next section. The content
 * column is centred at the full width of the screen up to a cap, wider than the
 * site column, so the copy is not pressed into half of the narrower column.
 *
 * `underlay` is laid behind the content and `overlay` over it (a canvas, say),
 * both inside the section.
 */
export function ManifestoShell({
  sectionRef,
  children,
  stops = true,
  chevron = true,
  onRest,
  className = "",
  underlay,
  overlay,
  ...rest
}: {
  sectionRef: RefObject<HTMLElement>;
  children: ReactNode;
  /** Take part in the homepage's snap stops (off in the editor). */
  stops?: boolean;
  chevron?: boolean;
  /** Called whenever a scroll comes to rest, snapped or not. */
  onRest?: () => void;
  className?: string;
  underlay?: ReactNode;
  overlay?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">) {
  useScrollStops(() => (sectionRef.current ? manifestoStops(sectionRef.current) : null), {
    enabled: stops,
    onRest,
  });

  return (
    <section
      ref={sectionRef}
      className={`mc-screen relative flex w-full flex-col justify-center overflow-hidden bg-gradient-to-b from-blue-muted/60 via-navy to-navy pb-32 pt-14 sm:pb-24 sm:pt-24 ${className}`}
      {...rest}
    >
      {/* Soft gold glow anchoring the manifesto */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-10 h-[480px] w-[480px] bg-gold/[0.07] blur-3xl"
      />
      {underlay}
      <div className="relative mx-auto w-full max-w-[1680px] px-6 sm:px-12 lg:px-16">
        {children}
      </div>
      {overlay}
      {/* A way on: a chevron at the foot of the screen, bobbing gently (still
          with motion off), that glides on to the next section. Above the
          floating menu bar on a phone. */}
      {chevron && <NextChevron sectionRef={sectionRef} className="bottom-[4.5rem] sm:bottom-4" />}
    </section>
  );
}

/** Copy in the left half and the visual in the right (sm+); a phone stacks the
 * visual above the copy (the visual carries its own order-first). */
export function ManifestoColumns({
  copy,
  visual,
  className = "",
}: {
  copy: ReactNode;
  visual: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:items-center sm:gap-x-12 sm:gap-y-0 ${className}`}
    >
      <div className="min-w-0">{copy}</div>
      {visual}
    </div>
  );
}

/** The quiet stand-in for a visual that has not been set yet. */
export function VisualPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`flex h-full w-full items-center justify-center border border-dashed border-white/15 bg-white/[0.03] ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        className="h-12 w-12 text-white/20"
      >
        <rect x="3" y="4.5" width="18" height="15" rx="1" />
        <circle cx="8.5" cy="9.5" r="1.75" />
        <path d="m3.5 17.5 5-5 3.5 3.5 3-3 5.5 5.5" />
      </svg>
    </div>
  );
}

/**
 * The manifesto's media (home.multicultural.image): an image, or an uploaded
 * video playing as a muted loop — a still first frame with motion off, as
 * every other video slot on the site does.
 */
export function ManifestoMedia({
  raw,
  alt,
  className,
  width = 1200,
  height = 900,
}: {
  raw: string;
  alt: string;
  className?: string;
  /** The size a bare Wix id is cropped to on the CDN. */
  width?: number;
  height?: number;
}) {
  const reduced = useMotionOff();
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = isVideoUrl(raw);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduced) {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* not seekable yet — the first frame shows anyway */
      }
    } else if (v.paused) {
      v.play().catch(() => {});
    }
  }, [reduced, raw]);

  const src = resolveImage(raw, width, height);
  if (video) {
    return (
      <video
        ref={videoRef}
        src={src}
        className={className}
        autoPlay={!reduced}
        muted
        loop={!reduced}
        playsInline
        preload={reduced ? "metadata" : "auto"}
        aria-label={alt}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}

/** The visual: a 4:3 frame in the right half, or above the copy at the
 * column's full width on a phone (order-first). Empty, it holds the frame's
 * space open behind a quiet placeholder. */
export const ManifestoVisual = forwardRef<
  HTMLDivElement,
  {
    image: string;
    alt: string;
    className?: string;
    /** On the media (or the placeholder) inside the frame. */
    mediaClassName?: string;
    children?: ReactNode;
  } & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">
>(function ManifestoVisual({ image, alt, className = "", mediaClassName = "", children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={`relative order-first aspect-[4/3] w-full overflow-hidden sm:order-none ${className}`}
      {...rest}
    >
      {image ? (
        <ManifestoMedia
          raw={image}
          alt={alt}
          className={`h-full w-full object-cover ${mediaClassName}`}
        />
      ) : (
        <VisualPlaceholder className={mediaClassName} />
      )}
      {children}
    </div>
  );
});

/**
 * Split copy into one span per word, preserving the whitespace between them
 * (admin-authored newlines included — multiline fields render with
 * whitespace-pre-line). `decorate` adds attributes to the n-th word, e.g. its
 * index as a custom property for a staggered entrance.
 */
export function splitWords(
  text: string,
  decorate?: (n: number) => HTMLAttributes<HTMLSpanElement>,
): ReactNode[] {
  let n = 0;
  return text.split(/(\s+)/).map((token, i) =>
    token.trim() === "" ? (
      token
    ) : (
      <span key={i} data-word {...decorate?.(n++)}>
        {token}
      </span>
    ),
  );
}

/** A word's index as a custom property, for staggered entrances in CSS. */
export const wordIndex = (n: number): HTMLAttributes<HTMLSpanElement> => ({
  style: { ["--i" as string]: n } as CSSProperties,
});

/** User-perceived characters (so an accented letter or an emoji is one), for
 * styles that move letters one at a time. */
export function graphemes(text: string): string[] {
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (
      locale?: string,
      opts?: { granularity: "grapheme" },
    ) => { segment: (s: string) => Iterable<{ segment: string }> };
  }).Segmenter;
  if (Segmenter) {
    return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

type TitleLinesProps = {
  lines: string[];
  /** Translator for the lines (the editable-aware one). */
  t: (source: string) => string;
  /** One line's content — words by default; letters, or anything else a style
   * moves. `payoff` is the last line, set in gold and fitted to the column. */
  renderLine?: (text: string, index: number, payoff: boolean) => ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLHeadingElement>, "children" | "className">;

/**
 * "the multi-cultural / Agency doing / big things": every line set on its own,
 * the first in lowercase and the last — the payoff — in gold, scaled until it
 * spans the copy column exactly, flush with the lines above it.
 */
export const TitleLines = forwardRef<HTMLHeadingElement, TitleLinesProps>(function TitleLines(
  { lines, t, renderLine = (text) => splitWords(text), className = "", ...rest },
  ref,
) {
  return (
    <h2 ref={ref} className={`font-display text-white ${className}`} {...rest}>
      {lines.map((line, i, all) => {
        const text = t(line);
        return i === all.length - 1 ? (
          // pb clears the descenders the tight leading pulls up out of the line
          // box; in em, so it scales with the fit.
          <FitLine
            key={i}
            className="block text-f2 leading-[0.82] pb-[0.14em] text-gold"
            refit={text}
            data-payoff=""
            data-line={i}
          >
            {renderLine(text, i, true)}
          </FitLine>
        ) : (
          <span
            key={i}
            className={`block text-f2 leading-[0.82] ${i === 0 ? "lowercase" : ""}`}
            data-line={i}
          >
            {renderLine(text, i, false)}
          </span>
        );
      })}
    </h2>
  );
});

/**
 * One title line scaled up until it spans its column exactly, edge to edge.
 * The class-driven size is only a starting point: the natural width of the
 * (nowrap) text is measured at that size and the font-size is scaled by the
 * ratio to the available width, so the fit survives a resize, a locale swap
 * (Spanish sets a different word), and the web fonts landing after first paint.
 */
export function FitLine({
  className,
  refit,
  children,
  ...rest
}: {
  className?: string;
  /** Line text — re-measures when the copy or locale changes. */
  refit: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children" | "className">) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const box = outer.current;
    const text = inner.current;
    if (!box || !text) return;

    let raf = 0;
    let lastWidth = -1;

    const fit = () => {
      // Drop back to the class-driven size so the measurement is of the text
      // itself and not of the previous fit.
      box.style.fontSize = "";
      const avail = box.clientWidth;
      const natural = text.getBoundingClientRect().width;
      if (avail <= 0 || natural <= 0) return;
      lastWidth = avail;
      const base = parseFloat(getComputedStyle(box).fontSize);
      box.style.fontSize = `${Math.floor(((base * avail) / natural) * 100) / 100}px`;
      // Anything measuring the line (a canvas tracing it) re-reads it now.
      box.dispatchEvent(new CustomEvent("gp:fit", { bubbles: true }));
    };
    const schedule = (force = false) => {
      // Resizing fires again on our own font-size change (the line box grows);
      // only a real column-width change is worth re-fitting.
      if (!force && outer.current?.clientWidth === lastWidth) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    schedule(true);
    const ro = new ResizeObserver(() => schedule());
    ro.observe(box);
    // Fitting against a fallback font leaves the line short (or overflowing)
    // once the real display face arrives.
    document.fonts?.ready.then(() => schedule(true)).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      box.style.fontSize = "";
    };
  }, [refit]);

  return (
    <span ref={outer} className={className} {...rest}>
      <span ref={inner} className="inline-block whitespace-nowrap">
        {children}
      </span>
    </span>
  );
}

/** How long to wait for the load veil's signal before treating the page as
 * revealed anyway (the veil has its own deadline; this is the backstop). */
const REVEAL_FAILSAFE_MS = 6000;

/**
 * When a style's entrance should play. `onArrive` fires once enough of the
 * section is on screen — `share` of whichever is smaller, the section or the
 * screen — and the page has been revealed (an entrance played behind the load
 * veil would be over before anyone looked). It fires as soon as that share
 * comes on screen, mid-scroll included, so a snap that carries the section up
 * starts the entrance on the way and lands with it. `onLeave` fires once the
 * section has left the screen entirely, so the entrance can reset and play
 * again on the next visit.
 */
export function useArrival(
  ref: RefObject<HTMLElement>,
  {
    enabled,
    share = 0.5,
    onArrive,
    onLeave,
  }: { enabled: boolean; share?: number; onArrive: () => void; onLeave?: () => void },
) {
  const cb = useRef({ onArrive, onLeave });
  cb.current = { onArrive, onLeave };

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const root = document.documentElement;
    let here = false;
    let raf = 0;
    let forced = false;

    const check = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const shown = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (!here) {
        const revealed = forced || root.hasAttribute("data-gp-revealed");
        if (revealed && shown >= share * Math.min(r.height, vh)) {
          here = true;
          cb.current.onArrive();
        }
      } else if (shown <= 0) {
        here = false;
        cb.current.onLeave?.();
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const failsafe = window.setTimeout(() => {
      forced = true;
      schedule();
    }, REVEAL_FAILSAFE_MS);

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("gp:revealed", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("gp:revealed", schedule);
    };
  }, [ref, enabled, share]);
}

/** Smoothstep between two edges (0 before `a`, 1 after `b`). */
export function smooth(x: number, a: number, b: number): number {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/** Clamp to [0, 1]. */
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
