"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import { useMotionStyle } from "@/components/motion/MotionProvider";
import { useScrollStops } from "@/components/motion/useScrollStops";
import NextChevron from "@/components/ui/NextChevron";
import {
  ManifestoColumns,
  ManifestoMedia,
  ManifestoShell,
  ManifestoVisual,
  TitleLines,
  canAnimate,
  smooth,
  splitWords,
  useArrival,
  useIsoLayoutEffect,
  type ManifestoProps,
} from "./shared";

/**
 * Go Big — "big things" gets big.
 *
 * The section is a scroll track: its stage pins to the screen while the page
 * scrolls on through it. At the top of the track the manifesto is composed in
 * the middle of the screen with the payoff set huge. Scrolling on, the payoff's
 * letters turn into windows onto the visual, and then the payoff grows — slowly
 * at first, then faster and faster — steering itself so that the thickest part
 * of one of its letters comes to the middle of the screen, until you fly
 * through that letter and the visual fills the screen. The intro comes up over
 * it, and the page carries on to the featured work. Scrolling back up runs it
 * all in reverse.
 *
 * The stage's background is painted on a canvas with the payoff cut out of it,
 * and the visual (or, with none set, a sheet of gold) sits underneath — so the
 * zoom is one vector redraw per scroll frame, crisp at any size, and a video
 * keeps playing natively inside the letters. The real title is in the page the
 * whole time (the payoff's own type is drawn transparent once the canvas has
 * it), and the snap stops treat the track as one free stretch, so the scroll
 * through it is the visitor's own.
 *
 * With motion off, or under the minimal style, the section is the plain
 * composition — title, intro and visual — with no track at all; kinetic adds
 * a twist to the dive.
 */
export default function GoBig(props: ManifestoProps) {
  const motion = useMotionStyle();
  return motion === "off" || motion === "minimal" ? <GoBigStill {...props} /> : <GoBigDive {...props} />;
}

/** Where on the track (0–1) the dive starts and where it is through the
 * letter; past that the visual simply holds, with the intro over it. */
const DIVE_FROM = 0.06;
const DIVE_TO = 0.66;

function GoBigDive({ multicultural }: ManifestoProps) {
  const t = useT();
  const tv = useEditableT();
  const motion = useMotionStyle();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const image = multicultural.image;

  // Stops: the hero, the top of the track (the composed title), the end of
  // the track (through the letter), and the featured work. The track between
  // the middle two is left free, so a scroll through the dive rests wherever
  // the visitor leaves it.
  useScrollStops(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return null;
    const y = window.scrollY;
    const r = section.getBoundingClientRect();
    const top = Math.round(r.top + y);
    const next = Math.round(r.bottom + y);
    const end = Math.max(top, next - stage.clientHeight);
    return { stops: [0, top, end, next], freeGap: 1 };
  });

  const words = multicultural.titleLines.map(tv).join("\n");

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const copy = copyRef.current;
    const visual = visualRef.current;
    const outro = outroRef.current;
    if (!section || !stage || !canvas || !copy || !visual || !outro || !canAnimate(motion)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const kinetic = motion === "kinetic";
    const root = document.documentElement;

    let alive = true;
    let dpr = 1;
    let W = 0;
    let H = 0;
    let glyphs: { text: string; x: number; y: number; font: string; size: number }[] = [];
    let ax = 0;
    let ay = 0;
    let maxScale = 1;
    let ground: CanvasGradient | null = null;
    let glow: CanvasGradient | null = null;
    let gold = "#e6b367";
    let measured = false;
    let raf = 0;

    const progress = () => {
      const r = section.getBoundingClientRect();
      const run = r.height - stage.clientHeight;
      return run > 0 ? Math.max(0, Math.min(1, -r.top / run)) : 0;
    };

    /** The payoff's words where they stand at rest, and the point the dive
     * heads for: the deepest point inside its letters, nearest the middle. */
    const measure = () => {
      const sr = stage.getBoundingClientRect();
      W = sr.width;
      H = sr.height;
      if (W <= 0 || H <= 0) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      // Measured with the copy at rest, not wherever the scroll has moved it.
      const was = copy.style.transform;
      copy.style.transform = "none";
      const scratch = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
      glyphs = Array.from(stage.querySelectorAll<HTMLElement>("[data-payoff] [data-word]")).map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        scratch.font = font;
        const text = el.textContent ?? "";
        const m = scratch.measureText(text);
        // An inline box's top is the face's ascent above its baseline.
        const ascent = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.69;
        return { text, x: r.left - sr.left, y: r.top - sr.top + ascent, font, size: parseFloat(cs.fontSize) };
      });
      copy.style.transform = was;
      if (!glyphs.length) return;

      // Trace the payoff at rest and find, by a distance transform, how deep
      // inside the ink each point is. The dive aims for the deepest point,
      // favouring the middle of the line, and the scale at which a circle
      // that deep covers the whole screen is how far it has to go.
      const pad = 8;
      const em = Math.max(...glyphs.map((g) => g.size));
      const left = Math.min(...glyphs.map((g) => g.x)) - pad;
      // A full em above the baseline clears the capitals and any accent.
      const boxTop = Math.min(...glyphs.map((g) => g.y)) - em;
      const right =
        Math.max(...glyphs.map((g) => {
          scratch.font = g.font;
          return g.x + scratch.measureText(g.text).width;
        })) + pad;
      const bottom = Math.max(...glyphs.map((g) => g.y)) + em * 0.4;
      const bw = Math.max(1, Math.ceil(right - left));
      const bh = Math.max(1, Math.ceil(bottom - boxTop));
      // Traced at reduced resolution when the line is very large: the deepest
      // point does not need every pixel.
      const k = Math.min(1, 900 / bw);
      const tw = Math.max(1, Math.round(bw * k));
      const th = Math.max(1, Math.round(bh * k));
      const tc = document.createElement("canvas");
      tc.width = tw;
      tc.height = th;
      const tctx = tc.getContext("2d", { willReadFrequently: true })!;
      tctx.scale(k, k);
      tctx.fillStyle = "#fff";
      for (const g of glyphs) {
        tctx.font = g.font;
        tctx.fillText(g.text, g.x - left, g.y - boxTop);
      }
      const data = tctx.getImageData(0, 0, tw, th).data;
      const dist = new Float32Array(tw * th);
      const BIG = 1e6;
      for (let i = 0; i < tw * th; i++) dist[i] = data[i * 4 + 3] > 127 ? BIG : 0;
      // Two-pass chamfer distance (3-4), in trace pixels.
      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const i = y * tw + x;
          if (!dist[i]) continue;
          let d = dist[i];
          if (x > 0) d = Math.min(d, dist[i - 1] + 3);
          if (y > 0) {
            d = Math.min(d, dist[i - tw] + 3);
            if (x > 0) d = Math.min(d, dist[i - tw - 1] + 4);
            if (x < tw - 1) d = Math.min(d, dist[i - tw + 1] + 4);
          }
          if (x === 0 || y === 0 || x === tw - 1 || y === th - 1) d = Math.min(d, 3);
          dist[i] = d;
        }
      }
      let best = -1;
      let bx = tw / 2;
      let by = th / 2;
      let depth = 1;
      for (let y = th - 1; y >= 0; y--) {
        for (let x = tw - 1; x >= 0; x--) {
          const i = y * tw + x;
          if (!dist[i]) continue;
          let d = dist[i];
          if (x < tw - 1) d = Math.min(d, dist[i + 1] + 3);
          if (y < th - 1) {
            d = Math.min(d, dist[i + tw] + 3);
            if (x < tw - 1) d = Math.min(d, dist[i + tw + 1] + 4);
            if (x > 0) d = Math.min(d, dist[i + tw - 1] + 4);
          }
          dist[i] = d;
          const off = Math.abs(x - tw / 2) / (tw / 2);
          const score = d * (1 - 0.45 * off);
          if (score > best) {
            best = score;
            bx = x;
            by = y;
            depth = d / 3;
          }
        }
      }
      ax = left + (bx + 0.5) / k;
      ay = boxTop + (by + 0.5) / k;
      const r = Math.max(1.5, depth / k - 1);
      maxScale = (Math.hypot(W / 2, H / 2) / r) * 1.12;

      // The stage's ground, as the section's own gradient paints it over navy,
      // and its soft gold glow.
      const css = getComputedStyle(root);
      const rgb = (v: string, fb: number[]) => {
        const p = css.getPropertyValue(v).trim().split(/\s+/).map(Number);
        return p.length === 3 && p.every(Number.isFinite) ? p : fb;
      };
      const navy = rgb("--c-navy", [20, 25, 36]);
      const muted = [77, 96, 138];
      const top60 = navy.map((c, i) => Math.round(muted[i] * 0.6 + c * 0.4));
      const g = rgb("--c-gold", [230, 179, 103]);
      gold = `rgb(${g.join(",")})`;
      ground = ctx.createLinearGradient(0, 0, 0, H);
      ground.addColorStop(0, `rgb(${top60.join(",")})`);
      ground.addColorStop(0.5, `rgb(${navy.join(",")})`);
      ground.addColorStop(1, `rgb(${navy.join(",")})`);
      glow = ctx.createRadialGradient(80, 280, 0, 80, 280, 360);
      glow.addColorStop(0, `rgba(${g.join(",")},0.07)`);
      glow.addColorStop(1, `rgba(${g.join(",")},0)`);
      measured = true;
    };

    const drawPayoff = () => {
      for (const g of glyphs) {
        ctx.font = g.font;
        ctx.fillText(g.text, g.x, g.y);
      }
    };

    let lastP = -1;
    const render = (force = false) => {
      raf = 0;
      if (!alive || !measured) return;
      const p = progress();
      if (!force && p === lastP) return;
      lastP = p;

      // The DOM around the canvas: the rest of the copy leaves as the dive
      // starts, the visual settles back from a slight zoom all the way
      // through, and the intro comes up once you are through the letter.
      const leave = smooth(p, 0.03, 0.17);
      copy.style.opacity = String(1 - leave);
      copy.style.transform = `translate3d(0, ${(-48 * leave).toFixed(1)}px, 0) scale(${(1 - 0.05 * leave).toFixed(4)})`;
      visual.style.transform = `scale(${(1.24 - 0.24 * smooth(p, DIVE_FROM, 0.92)).toFixed(4)})`;
      const outroIn = smooth(p, DIVE_TO + 0.04, DIVE_TO + 0.15);
      outro.style.opacity = String(outroIn);
      outro.style.transform = `translate3d(0, ${((1 - outroIn) * 28).toFixed(1)}px, 0)`;
      // The marquee over the top of the screen steps aside for the dive.
      root.toggleAttribute("data-gp-dive", p > 0.05);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      const u = Math.max(0, Math.min(1, (p - DIVE_FROM) / (DIVE_TO - DIVE_FROM)));
      if (u >= 1) {
        // Through the letter: nothing left to draw.
        ctx.clearRect(0, 0, W, H);
        return;
      }
      ctx.fillStyle = ground!;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = glow!;
      ctx.fillRect(0, 0, W, H);

      // Constant-feeling growth (even steps in the scale's logarithm), eased
      // in so it starts gently and dives at the end; the aim point drifts to
      // the middle of the screen over the first half.
      const s = Math.exp(Math.log(maxScale) * u * u);
      const c = smooth(u, 0, 0.55);
      const cx = ax + (W / 2 - ax) * c;
      const cy = ay + (H / 2 - ay) * c;
      ctx.translate(cx, cy);
      if (kinetic) ctx.rotate(-0.16 * Math.sin(Math.PI * u));
      ctx.scale(s, s);
      ctx.translate(-ax, -ay);
      // Cut with an opaque fill: destination-out takes away as much as the
      // fill puts down.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      drawPayoff();
      // Gold over the windows at first, giving way to what is behind them.
      const solid = 1 - smooth(p, 0.025, 0.16);
      if (solid > 0) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = solid;
        ctx.fillStyle = gold;
        drawPayoff();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(() => render());
    };
    const remeasure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        measure();
        if (measured) stage.setAttribute("data-gb-ready", "");
        render(true);
      });
    };

    // The trace has to be of the real face at its fitted size.
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (alive) remeasure();
    });
    const ro = new ResizeObserver(remeasure);
    ro.observe(stage);
    stage.addEventListener("gp:fit", remeasure);
    window.addEventListener("scroll", schedule, { passive: true });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      stage.removeEventListener("gp:fit", remeasure);
      window.removeEventListener("scroll", schedule);
      root.removeAttribute("data-gp-dive");
      stage.removeAttribute("data-gb-ready");
      copy.style.opacity = "";
      copy.style.transform = "";
      visual.style.transform = "";
      outro.style.opacity = "";
      outro.style.transform = "";
    };
  }, [motion, words, image]);

  return (
    <section ref={sectionRef} className="gb-track relative w-full">
      <div ref={stageRef} className="h-viewport sticky top-0 w-full overflow-hidden">
        {/* What the letters open onto: the visual, or a sheet of gold. */}
        <div ref={visualRef} aria-hidden={!image} className="absolute inset-0">
          {image ? (
            <ManifestoMedia
              raw={image}
              alt={t("Galvez & Partners")}
              className="h-full w-full object-cover"
              width={1920}
              height={1080}
            />
          ) : (
            <div className="gb-gold absolute inset-0" />
          )}
        </div>
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
        {/* The stage's ground until the canvas has painted it. */}
        <div aria-hidden className="gb-ground absolute inset-0 bg-navy">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-muted/60 via-navy to-navy" />
          <div className="absolute -left-40 top-10 h-[480px] w-[480px] bg-gold/[0.07] blur-3xl" />
        </div>

        <div
          ref={copyRef}
          className="relative z-10 mx-auto flex h-full w-full max-w-[1680px] flex-col items-center justify-center px-6 pb-16 pt-14 text-center sm:px-12 sm:pb-12 sm:pt-20 lg:px-16"
        >
          <TitleLines
            lines={multicultural.titleLines}
            t={tv}
            className="gb-title w-full max-w-[1100px]"
          />
          <p className="mt-3 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:mt-4 sm:text-f8">
            {tv(multicultural.intro)}
          </p>
        </div>

        {/* Through the letter: the intro again, over the visual. */}
        <div
          ref={outroRef}
          aria-hidden
          className={`gb-outro pointer-events-none absolute inset-0 z-10 flex items-end justify-center px-6 pb-28 opacity-0 sm:px-12 sm:pb-20 ${
            image ? "gb-outro-scrim text-white" : "text-navy"
          }`}
        >
          <p className="max-w-4xl text-balance text-center font-heading text-f6 leading-tight">
            {tv(multicultural.intro)}
          </p>
        </div>

        <NextChevron sectionRef={sectionRef} className="bottom-[4.5rem] sm:bottom-4" />
      </div>
    </section>
  );
}

/** Go Big with nothing moving: the plain composition, the payoff huge and
 * gold, beside the visual. Under the minimal motion style it fades in. */
function GoBigStill({ multicultural }: ManifestoProps) {
  const t = useT();
  const tv = useEditableT();
  const motion = useMotionStyle();
  const sectionRef = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);

  useIsoLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || motion !== "minimal" || !canAnimate(motion)) return;
    section.setAttribute("data-fade", "wait");
    setArmed(true);
    return () => {
      section.removeAttribute("data-fade");
      setArmed(false);
    };
  }, [motion]);

  useArrival(sectionRef, {
    enabled: armed,
    onArrive: () => sectionRef.current?.setAttribute("data-fade", "in"),
    onLeave: () => sectionRef.current?.setAttribute("data-fade", "wait"),
  });

  return (
    <ManifestoShell sectionRef={sectionRef}>
      <ManifestoColumns
        copy={
          <div className="fade-part" style={{ "--d": "120ms" } as CSSProperties}>
            <TitleLines lines={multicultural.titleLines} t={tv} />
            <p className="mt-1 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8">
              {splitWords(tv(multicultural.intro))}
            </p>
          </div>
        }
        visual={
          <ManifestoVisual image={multicultural.image} alt={t("Galvez & Partners")} className="fade-part" />
        }
      />
    </ManifestoShell>
  );
}
