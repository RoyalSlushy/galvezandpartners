"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import { useMotionStyle } from "@/components/motion/MotionProvider";
import {
  ManifestoColumns,
  ManifestoShell,
  ManifestoVisual,
  TitleLines,
  canAnimate,
  splitWords,
  useArrival,
  useIsoLayoutEffect,
  wordIndex,
  type ManifestoProps,
} from "./shared";

/**
 * Stardust — the headline gathers out of a drift of gold dust.
 *
 * When the section arrives, thousands of motes scattered across it start to
 * swirl, all turning the same way, and stream together into the exact shapes
 * of the title's letters — traced from the live type, so they land on the real
 * words in the real font at whatever size the screen sets them — and into the
 * visual's frame. Once every mote has landed the crisp type fades up over the
 * dust and the dust fades away; the picture comes up inside its frame and the
 * intro rises.
 *
 * Afterwards the cursor is a brush: run it over the headline and the letters
 * under it break back into dust that scatters from the pointer and springs
 * home behind it. (Under the cursor the real type is masked away and the dust
 * stands in for it, so nothing is ever drawn twice.) A faint field of stars
 * twinkles behind the section throughout.
 *
 * Drawn on one canvas over the section, only while there is something moving.
 * The real title is always in the page underneath — the dust is a picture of
 * it. [data-sd] on the section drives the copy in CSS: "wait" and "gather" hold
 * it back, "done" lets it in; without it (no JS, motion off) it is simply
 * there. Minimal fades the copy in with no dust; kinetic swirls harder and
 * overshoots its landing.
 */
export default function Stardust({ multicultural }: ManifestoProps) {
  const t = useT();
  const tv = useEditableT();
  const motion = useMotionStyle();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Dust | null>(null);
  const [armed, setArmed] = useState<"dust" | "fade" | null>(null);

  useIsoLayoutEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const title = titleRef.current;
    const visual = visualRef.current;
    if (!section || !canvas || !title || !visual || !canAnimate(motion)) return;
    section.setAttribute("data-sd", "wait");
    if (motion === "minimal") {
      setArmed("fade");
      return () => {
        section.removeAttribute("data-sd");
        setArmed(null);
      };
    }
    const engine = new Dust(section, canvas, title, visual, motion === "kinetic");
    engineRef.current = engine;
    setArmed("dust");
    return () => {
      engine.destroy();
      engineRef.current = null;
      section.removeAttribute("data-sd");
      setArmed(null);
    };
  }, [motion]);

  useArrival(sectionRef, {
    enabled: armed !== null,
    onArrive: () => {
      if (armed === "fade") sectionRef.current?.setAttribute("data-sd", "done");
      else engineRef.current?.gather();
    },
    onLeave: () => {
      engineRef.current?.reset();
      sectionRef.current?.setAttribute("data-sd", "wait");
    },
  });

  // New words (a language switch, an edit) need tracing afresh.
  const words = multicultural.titleLines.map(tv).join("\n");
  useEffect(() => {
    engineRef.current?.retrace();
  }, [words]);

  return (
    <ManifestoShell
      sectionRef={sectionRef}
      underlay={<Starfield />}
      overlay={
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        />
      }
    >
      <ManifestoColumns
        copy={
          <>
            <TitleLines ref={titleRef} lines={multicultural.titleLines} t={tv} className="sd-title" />
            <p className="sd-intro mt-1 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8">
              {splitWords(tv(multicultural.intro), wordIndex)}
            </p>
          </>
        }
        visual={
          <ManifestoVisual
            ref={visualRef}
            image={multicultural.image}
            alt={t("Galvez & Partners")}
            mediaClassName="sd-media"
          />
        }
      />
    </ManifestoShell>
  );
}

/** A faint field of stars behind the section, each twinkling on its own
 * clock. Placed by a fixed seed, so the server and the browser agree. */
function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STARS.map((s, i) => (
        <span
          key={i}
          className="sd-star"
          style={
            {
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              "--tw-dur": `${s.dur}s`,
              "--tw-delay": `${s.delay}s`,
              "--tw-max": s.max,
              background: s.gold ? "rgb(var(--c-gold))" : "#fff",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

const STARS = (() => {
  let seed = 0x6a5f3c;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  return Array.from({ length: 34 }, () => ({
    x: Math.round(rnd() * 1000) / 10,
    y: Math.round(rnd() * 1000) / 10,
    size: rnd() < 0.2 ? 2.5 : rnd() < 0.5 ? 1.75 : 1.25,
    dur: Math.round((2.6 + rnd() * 4) * 10) / 10,
    delay: Math.round(-rnd() * 60) / 10,
    max: Math.round((0.25 + rnd() * 0.5) * 100) / 100,
    gold: rnd() < 0.35,
  }));
})();

/* ------------------------------------------------------------------------ */

/** How many motes, at most, trace the title and fill the frame. */
const BUDGET = { title: 4200, titlePhone: 2200, frame: 700, framePhone: 380 };
/** The crisp type's fade-in over the landed dust (ms) — matches .sd-title. */
const RESOLVE_MS = 700;

type Tone = 0 | 1 | 2; // white, gold, frame

/**
 * The dust. Every mote has a home (a point inside a letter or the frame), a
 * start (anywhere across the section), and its own delay and duration for the
 * trip, which curves the same way for all of them so the whole cloud reads as
 * one swirl. Held in flat typed arrays and drawn as tiny squares, so a few
 * thousand cost next to nothing a frame.
 */
class Dust {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private n = 0;
  private titleN = 0;
  private hx = new Float32Array(0);
  private hy = new Float32Array(0);
  private sx = new Float32Array(0);
  private sy = new Float32Array(0);
  private x = new Float32Array(0);
  private y = new Float32Array(0);
  private vx = new Float32Array(0);
  private vy = new Float32Array(0);
  private delay = new Float32Array(0);
  private dur = new Float32Array(0);
  private swirl = new Float32Array(0);
  private size = new Float32Array(0);
  private twinkle = new Float32Array(0);
  private tone = new Uint8Array(0);
  private colors: string[] = ["#fff", "#e6b367", "#f3d8b0"];
  private end = 0;

  private state: "idle" | "gather" | "resolve" | "settled" = "idle";
  private traced = false;
  private t0 = 0;
  private tResolve = 0;
  private raf = 0;
  private alive = true;

  // The brush.
  private brushable = false;
  private px = -1e4;
  private py = -1e4;
  private near = false;
  private mask = 0; // current radius of the hole in the type
  private reach = 80; // full radius of the hole
  private lastT = 0;

  private ro: ResizeObserver;

  constructor(
    private section: HTMLElement,
    private canvas: HTMLCanvasElement,
    private title: HTMLElement,
    private visual: HTMLElement,
    private kinetic: boolean,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.brushable = window.matchMedia("(hover: hover)").matches;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(section);
    title.addEventListener("gp:fit", this.onFit);
    section.addEventListener("pointermove", this.onMove, { passive: true });
    section.addEventListener("pointerleave", this.onLeave);
    this.resize();
  }

  destroy() {
    this.alive = false;
    this.reset();
    this.ro.disconnect();
    this.title.removeEventListener("gp:fit", this.onFit);
    this.section.removeEventListener("pointermove", this.onMove);
    this.section.removeEventListener("pointerleave", this.onLeave);
  }

  /** Back to before the entrance: nothing drawn, the copy held back. */
  reset() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.state = "idle";
    this.mask = 0;
    this.near = false;
    this.applyMask();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** The title's words changed, or its fitted size did: trace it again. */
  retrace() {
    this.traced = false;
    if (this.state === "settled") this.trace();
  }

  async gather() {
    // The trace has to be of the real face at its fitted size.
    await document.fonts?.ready.catch(() => {});
    await new Promise((r) => requestAnimationFrame(r));
    if (!this.alive || this.state !== "idle") return;
    if (!this.traced) this.trace();
    this.section.setAttribute("data-sd", "gather");
    this.state = "gather";
    this.t0 = performance.now();
    this.kick();
  }

  private onFit = () => this.retrace();

  private resize() {
    const r = this.section.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    // Mid-entrance, a new layout means new homes: land where the copy now is.
    if (this.state === "gather" || this.state === "resolve") {
      this.trace();
      this.finish(performance.now());
    } else {
      this.retrace();
    }
  }

  /** Trace the title's letters and the visual's frame into homes for the dust,
   * and scatter its starting points across the section. */
  private trace() {
    const origin = this.section.getBoundingClientRect();
    const phone = window.innerWidth < 751;
    const root = getComputedStyle(document.documentElement);
    const rgb = (v: string, fallback: string) => {
      const parts = root.getPropertyValue(v).trim().split(/\s+/);
      return parts.length === 3 ? `rgb(${parts.join(",")})` : fallback;
    };
    this.colors = ["#fff", rgb("--c-gold", "#e6b367"), rgb("--c-cream", "#f3d8b0")];

    const pts: { x: number; y: number; tone: Tone; size: number }[] = [];
    // The title: every word drawn in its own font, at its own place, onto a
    // scratch canvas, and sampled on a jittered grid inside its ink.
    const words = Array.from(this.title.querySelectorAll<HTMLElement>("[data-word]"));
    const boxes = words.map((el) => ({ el, r: el.getBoundingClientRect() }));
    const area = boxes.reduce((a, b) => a + b.r.width * b.r.height, 0);
    const budget = phone ? BUDGET.titlePhone : BUDGET.title;
    // About a third of a word's box is ink.
    const step = Math.max(2.2, Math.sqrt((area * 0.33) / budget));
    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d", { willReadFrequently: true })!;
    let fontSize = 0;
    for (const { el, r } of boxes) {
      if (r.width <= 0) continue;
      const cs = getComputedStyle(el);
      let text = el.textContent ?? "";
      if (cs.textTransform === "lowercase") text = text.toLocaleLowerCase();
      else if (cs.textTransform === "uppercase") text = text.toLocaleUpperCase();
      const size = parseFloat(cs.fontSize);
      fontSize = Math.max(fontSize, size);
      const pad = Math.ceil(size * 0.3);
      const W = Math.ceil(r.width + pad * 2);
      const H = Math.ceil(r.height + pad * 2);
      scratch.width = W;
      scratch.height = H;
      sctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      sctx.textBaseline = "alphabetic";
      sctx.fillStyle = "#fff";
      // Where the baseline sits in the word's box. The words are inline
      // blocks (so they never break at a hyphen), and an inline block is one
      // line tall: the face's ascent and descent are centred in it, so the
      // baseline is the ascent down from the top of that centred span.
      const m = sctx.measureText(text);
      const ascent = m.fontBoundingBoxAscent || size * 0.69;
      const descent = m.fontBoundingBoxDescent || size * 0.25;
      const line = parseFloat(cs.lineHeight);
      const baseline = Number.isFinite(line) ? (line - ascent - descent) / 2 + ascent : ascent;
      sctx.fillText(text, pad, pad + baseline);
      const data = sctx.getImageData(0, 0, W, H).data;
      const tone: Tone = el.closest("[data-payoff]") ? 1 : 0;
      for (let gy = step / 2; gy < H; gy += step) {
        for (let gx = step / 2; gx < W; gx += step) {
          const jx = gx + (Math.random() - 0.5) * step * 0.7;
          const jy = gy + (Math.random() - 0.5) * step * 0.7;
          const ix = Math.min(W - 1, Math.max(0, Math.round(jx)));
          const iy = Math.min(H - 1, Math.max(0, Math.round(jy)));
          if (data[(iy * W + ix) * 4 + 3] > 110) {
            pts.push({
              x: r.left - origin.left - pad + jx,
              y: r.top - origin.top - pad + jy,
              tone,
              size: Math.max(1.3, step * 0.66),
            });
          }
        }
      }
    }
    const titleN = pts.length;
    this.reach = Math.max(46, Math.min(120, fontSize * 0.75));

    // The frame: a jittered grid over its whole face.
    const f = this.visual.getBoundingClientRect();
    if (f.width > 0 && f.height > 0) {
      const fb = phone ? BUDGET.framePhone : BUDGET.frame;
      const fs = Math.sqrt((f.width * f.height) / fb);
      for (let gy = fs / 2; gy < f.height; gy += fs) {
        for (let gx = fs / 2; gx < f.width; gx += fs) {
          pts.push({
            x: f.left - origin.left + gx + (Math.random() - 0.5) * fs * 0.8,
            y: f.top - origin.top + gy + (Math.random() - 0.5) * fs * 0.8,
            tone: 2,
            size: 1.2 + Math.random() * 1.4,
          });
        }
      }
    }

    const n = pts.length;
    this.n = n;
    this.titleN = titleN;
    this.hx = new Float32Array(n);
    this.hy = new Float32Array(n);
    this.sx = new Float32Array(n);
    this.sy = new Float32Array(n);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.delay = new Float32Array(n);
    this.dur = new Float32Array(n);
    this.swirl = new Float32Array(n);
    this.size = new Float32Array(n);
    this.twinkle = new Float32Array(n);
    this.tone = new Uint8Array(n);

    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < titleN; i++) {
      minX = Math.min(minX, pts[i].x);
      maxX = Math.max(maxX, pts[i].x);
    }
    const spanX = Math.max(1, maxX - minX);
    const turn = this.kinetic ? [0.3, 0.65] : [0.16, 0.42];
    let end = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      this.hx[i] = this.x[i] = p.x;
      this.hy[i] = this.y[i] = p.y;
      // Scattered across the section and a little past its edges.
      this.sx[i] = (Math.random() * 1.1 - 0.05) * this.w;
      this.sy[i] = (Math.random() * 1.1 - 0.05) * this.h;
      const dist = Math.hypot(p.x - this.sx[i], p.y - this.sy[i]);
      this.swirl[i] = dist * (turn[0] + Math.random() * (turn[1] - turn[0]));
      if (i < titleN) {
        // The title gathers left to right, a sweep across the words.
        this.delay[i] = ((p.x - minX) / spanX) * 650 + Math.random() * 300;
        this.dur[i] = 1050 + Math.random() * 550;
      } else {
        this.delay[i] = Math.random() * 450;
        this.dur[i] = 1150 + Math.random() * 600;
      }
      end = Math.max(end, this.delay[i] + this.dur[i]);
      this.size[i] = p.size;
      this.twinkle[i] = Math.random() * Math.PI * 2;
      this.tone[i] = p.tone;
    }
    this.end = end;
    this.traced = true;
  }

  private kick() {
    if (!this.raf && this.alive) this.raf = requestAnimationFrame(this.frame);
  }

  /** Skip to the end of the gathering: everything home, the copy in. */
  private finish(now: number) {
    this.x.set(this.hx);
    this.y.set(this.hy);
    this.section.setAttribute("data-sd", "done");
    this.state = "resolve";
    this.tResolve = now;
    this.kick();
  }

  private frame = (now: number) => {
    this.raf = 0;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    if (this.state === "gather") {
      const t = now - this.t0;
      const appear = Math.min(1, t / 260);
      for (let i = 0; i < this.n; i++) {
        const u = Math.max(0, Math.min(1, (t - this.delay[i]) / this.dur[i]));
        const e = this.kinetic ? easeOutBack(u) : easeInOutCubic(u);
        const dx = this.hx[i] - this.sx[i];
        const dy = this.hy[i] - this.sy[i];
        const len = Math.hypot(dx, dy) || 1;
        // Off to the side of the straight path, most at mid-trip: a curve
        // that bends the same way for every mote, so the cloud swirls.
        const bend = this.swirl[i] * Math.sin(Math.PI * Math.min(1, e));
        this.x[i] = this.sx[i] + dx * e - (dy / len) * bend;
        this.y[i] = this.sy[i] + dy * e + (dx / len) * bend;
      }
      ctx.globalCompositeOperation = "lighter";
      this.draw(now, (i) => {
        const u = Math.max(0, Math.min(1, (t - this.delay[i]) / this.dur[i]));
        return appear * (0.28 + 0.72 * u);
      });
      ctx.globalCompositeOperation = "source-over";
      if (t >= this.end + 80) this.finish(now);
      this.kick();
      return;
    }

    if (this.state === "resolve") {
      const k = 1 - (now - this.tResolve) / RESOLVE_MS;
      if (k > 0) {
        this.draw(now, () => k);
        this.kick();
        return;
      }
      this.state = "settled";
    }

    if (this.state === "settled") this.brush(now);
  };

  /** Draw every mote with the alpha `alphaOf` gives it, twinkling a little. */
  private draw(now: number, alphaOf: (i: number) => number, from = 0, to = this.n) {
    const ctx = this.ctx;
    let tone = -1;
    for (let i = from; i < to; i++) {
      const a = alphaOf(i) * (0.82 + 0.18 * Math.sin(now * 0.006 + this.twinkle[i]));
      if (a <= 0.01) continue;
      if (this.tone[i] !== tone) {
        tone = this.tone[i];
        ctx.fillStyle = this.colors[tone];
      }
      ctx.globalAlpha = Math.min(1, a);
      const s = this.size[i];
      ctx.fillRect(this.x[i] - s / 2, this.y[i] - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  /* ---- the brush ---- */

  private onMove = (e: PointerEvent) => {
    if (!this.brushable || e.pointerType === "touch" || this.state !== "settled") return;
    const o = this.section.getBoundingClientRect();
    this.px = e.clientX - o.left;
    this.py = e.clientY - o.top;
    const t = this.title.getBoundingClientRect();
    const m = this.reach;
    this.near =
      e.clientX > t.left - m && e.clientX < t.right + m && e.clientY > t.top - m && e.clientY < t.bottom + m;
    if (this.near) this.kick();
  };

  private onLeave = () => {
    this.near = false;
  };

  /** Where the type has a hole in it, and how big: the brush's footprint. */
  private applyMask() {
    const style = this.title.style;
    if (this.mask < 0.5) {
      style.removeProperty("mask-image");
      style.removeProperty("-webkit-mask-image");
      return;
    }
    const t = this.title.getBoundingClientRect();
    const o = this.section.getBoundingClientRect();
    const x = this.px - (t.left - o.left);
    const y = this.py - (t.top - o.top);
    const r = this.mask;
    const img = `radial-gradient(circle ${r.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, transparent ${(r * 0.55).toFixed(1)}px, #000 ${r.toFixed(1)}px)`;
    style.setProperty("mask-image", img);
    style.setProperty("-webkit-mask-image", img);
  }

  private brush(now: number) {
    const dt = Math.min(1 / 30, (now - (this.lastT || now)) / 1000) || 1 / 60;
    this.lastT = now;
    // The hole opens while the pointer is over the type and closes after it.
    const target = this.near ? this.reach : 0;
    this.mask += (target - this.mask) * Math.min(1, dt * 14);
    if (Math.abs(target - this.mask) < 0.3) this.mask = target;

    const R = this.mask;
    const push = this.reach * 0.8;
    const px = this.px;
    const py = this.py;
    let restless = this.near;
    for (let i = 0; i < this.titleN; i++) {
      let ax = -95 * (this.x[i] - this.hx[i]) - 11 * this.vx[i];
      let ay = -95 * (this.y[i] - this.hy[i]) - 11 * this.vy[i];
      if (this.near) {
        const dx = this.x[i] - px;
        const dy = this.y[i] - py;
        const d = Math.hypot(dx, dy);
        if (d < push && d > 0.01) {
          const f = 4200 * (1 - d / push) ** 2;
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }
      }
      this.vx[i] += ax * dt;
      this.vy[i] += ay * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      if (!restless && (Math.abs(this.x[i] - this.hx[i]) > 0.3 || Math.abs(this.y[i] - this.hy[i]) > 0.3)) {
        restless = true;
      }
    }
    // Dust shows where the type is holed (by its home), and anywhere it has
    // been knocked away from home.
    this.draw(
      now,
      (i) => {
        const hole = R > 0.5 ? 1 - smoothstep(R * 0.55, R, Math.hypot(this.hx[i] - px, this.hy[i] - py)) : 0;
        const off = Math.min(1, Math.hypot(this.x[i] - this.hx[i], this.y[i] - this.hy[i]) / 5);
        return Math.max(hole, off * 0.9);
      },
      0,
      this.titleN,
    );
    this.applyMask();
    if (restless || this.mask > 0) {
      this.kick();
    } else {
      this.lastT = 0;
      this.ctx.clearRect(0, 0, this.w, this.h);
    }
  }
}

const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const easeOutBack = (u: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2;
};
const smoothstep = (a: number, b: number, x: number) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
