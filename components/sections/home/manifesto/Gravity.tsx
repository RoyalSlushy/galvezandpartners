"use client";

import { useRef, useState } from "react";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import { useMotionStyle, type MotionStyle } from "@/components/motion/MotionProvider";
import {
  ManifestoColumns,
  ManifestoShell,
  ManifestoVisual,
  TitleLines,
  canAnimate,
  graphemes,
  splitWords,
  useArrival,
  useIsoLayoutEffect,
  type ManifestoProps,
} from "./shared";

/**
 * Gravity — the letters fall into place.
 *
 * When the section arrives, the visual drops in from above and swings to rest
 * like a sign on a nail, then the title's letters rain down one after another,
 * line by line, each from somewhere above the top of the screen, tumbling a
 * little and bouncing as they land. The payoff comes last and all at once — a
 * heavy slab that barely bounces — and lands with a thud: the copy and the
 * visual jolt, and a puff of gold dust kicks up along its foot. The intro's
 * words then drop softly into place.
 *
 * The falls are real ballistics (see bounceFrames): each letter's drop is timed
 * from its height under one gravity, and every bounce loses the same share of
 * its speed, so the patter of landings sounds right to the eye. After the
 * entrance a cursor moving through the title nudges the letters it passes,
 * which wobble back on springs.
 *
 * The section's [data-gv] hides what is still to fall ("wait") and lets it
 * show ("in"); without it — no JS, motion off — everything is simply there.
 * Kinetic is bouncier and tumbles more; minimal lets each line fade down into
 * place instead.
 */
export default function Gravity({ multicultural }: ManifestoProps) {
  const t = useT();
  const tv = useEditableT();
  const motion = useMotionStyle();
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<(() => void) | null>(null);
  const [armed, setArmed] = useState(false);

  useIsoLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || !canAnimate(motion)) return;
    section.setAttribute("data-gv", "wait");
    setArmed(true);
    return () => {
      runRef.current?.();
      runRef.current = null;
      section.removeAttribute("data-gv");
      setArmed(false);
    };
  }, [motion]);

  useArrival(sectionRef, {
    enabled: armed,
    onArrive: () => {
      const [section, copy, title, intro, visual, dust] = [
        sectionRef.current,
        copyRef.current,
        titleRef.current,
        introRef.current,
        visualRef.current,
        dustRef.current,
      ];
      if (!section || !copy || !title || !intro || !visual || !dust) return;
      runRef.current?.();
      runRef.current = drop({ section, copy, title, intro, visual, dust, motion });
    },
    onLeave: () => {
      runRef.current?.();
      runRef.current = null;
      sectionRef.current?.setAttribute("data-gv", "wait");
    },
  });

  // Letters, each its own box so it can fall on its own, inside unbreakable
  // words. Screen readers get the line whole (the letters are hidden from
  // them, or some would spell it out).
  const letters = (text: string, line: number, payoff: boolean) => {
    let idx = 0;
    return (
      <>
        <span className="sr-only">{text}</span>
        <span aria-hidden>
          {text.split(/(\s+)/).map((token, k) =>
            token.trim() === "" ? (
              token
            ) : (
              <span key={k} className="inline-block whitespace-nowrap">
                {graphemes(token).map((ch, j) => (
                  <span
                    key={j}
                    data-letter
                    data-ln={line}
                    data-idx={idx++}
                    data-heavy={payoff ? "" : undefined}
                    className="inline-block"
                  >
                    {ch}
                  </span>
                ))}
              </span>
            ),
          )}
        </span>
      </>
    );
  };

  return (
    <ManifestoShell sectionRef={sectionRef}>
      <ManifestoColumns
        copy={
          // Above the visual, which a phone stacks over the copy: the letters
          // fall past it on their way down, and should pass in front.
          <div ref={copyRef} className="relative z-10">
            <TitleLines
              ref={titleRef}
              lines={multicultural.titleLines}
              t={tv}
              renderLine={(text, i, payoff) => letters(text, i, payoff)}
            />
            <p
              ref={introRef}
              className="gv-intro mt-1 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8"
            >
              {splitWords(tv(multicultural.intro))}
            </p>
            {/* Where the payoff's dust is kicked up. */}
            <div ref={dustRef} aria-hidden className="pointer-events-none absolute inset-0" />
          </div>
        }
        visual={
          <ManifestoVisual
            ref={visualRef}
            image={multicultural.image}
            alt={t("Galvez & Partners")}
            className="gv-visual"
          />
        }
      />
    </ManifestoShell>
  );
}

type Parts = {
  section: HTMLElement;
  copy: HTMLElement;
  title: HTMLElement;
  intro: HTMLElement;
  visual: HTMLElement;
  dust: HTMLElement;
  motion: MotionStyle;
};

/** Per motion style: gravity (px/s²), how much speed a bounce keeps (the
 * lines, then the payoff), how far a letter tumbles (deg) and drifts (px). */
const TUNING = {
  classic: { g: 5200, e: 0.36, eHeavy: 0.16, spin: 50, drift: 30, thud: 6 },
  kinetic: { g: 4300, e: 0.52, eHeavy: 0.28, spin: 90, drift: 60, thud: 10 },
} as const;

const FALL = "cubic-bezier(0.55, 0.085, 0.68, 0.53)"; // ease-in quad: falling from rest
const RISE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)"; // ease-out quad: rising to rest
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Keyframes for a drop from `h` px up under gravity `g`, bouncing with
 * restitution `e` until the bounce is too small to see. The letter tumbles in
 * from `spin` degrees and drifts in from `drift` px, both settled by the first
 * impact (a dab of the spin comes back on the first bounce). Returns the
 * frames, the total duration and the time of the first impact (ms).
 */
function bounceFrames(h: number, g: number, e: number, spin: number, drift: number) {
  const t0 = Math.sqrt((2 * h) / g);
  const times = [0, t0];
  const heights = [h, 0];
  let v = g * t0;
  let t = t0;
  for (let k = 0; k < 4; k++) {
    v *= e;
    const hk = (v * v) / (2 * g);
    if (hk < 1.5) break;
    const up = v / g;
    t += up;
    times.push(t);
    heights.push(hk);
    t += up;
    times.push(t);
    heights.push(0);
  }
  const frames: Keyframe[] = times.map((tk, i) => {
    const first = i === 0;
    const rot = first ? spin : i === 2 ? spin * 0.08 : 0;
    const x = first ? drift : 0;
    return {
      offset: tk / t,
      transform: `translate3d(${x.toFixed(1)}px, ${(-heights[i]).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`,
      // Leaving the ground (or the start) the letter is falling or rising:
      // from an apex it accelerates down, from an impact it decelerates up.
      easing: heights[i] > 0 ? FALL : RISE,
    };
  });
  return { frames, total: t * 1000, impact: t0 * 1000 };
}

/** Run the entrance. Returns a cancel that stops everything in flight. */
function drop({ section, copy, title, intro, visual, dust, motion }: Parts): () => void {
  section.setAttribute("data-gv", "in");
  const anims: Animation[] = [];
  const timers: number[] = [];
  let nudge: (() => void) | null = null;
  const cancel = () => {
    anims.forEach((a) => a.cancel());
    timers.forEach((id) => window.clearTimeout(id));
    nudge?.();
    dust.replaceChildren();
  };

  const letters = Array.from(title.querySelectorAll<HTMLElement>("[data-letter]"));
  const words = Array.from(intro.querySelectorAll<HTMLElement>("[data-word]"));
  const lineCount = 1 + Math.max(0, ...letters.map((l) => Number(l.dataset.ln)));

  if (motion === "minimal") {
    // Each line fades down into place, top to bottom; nothing bounces.
    letters.forEach((el) => {
      const ln = Number(el.dataset.ln);
      anims.push(
        el.animate(
          [{ opacity: 0, transform: "translate3d(0, -0.25em, 0)" }, { opacity: 1, transform: "none" }],
          { duration: 700, delay: 120 + ln * 170, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
        ),
      );
    });
    const introAt = 120 + lineCount * 170 + 200;
    for (const el of [intro, visual]) {
      anims.push(
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 700,
          delay: el === intro ? introAt : 0,
          easing: "ease-out",
          fill: "backwards",
        }),
      );
    }
    return cancel;
  }

  const tune = motion === "kinetic" ? TUNING.kinetic : TUNING.classic;

  // The visual drops first and swings on its nail to rest.
  anims.push(
    visual.animate(
      [
        { offset: 0, transform: "translate3d(0, -115%, 0) rotate(-10deg)", easing: FALL },
        { offset: 0.3, transform: "translate3d(0, 0, 0) rotate(6deg)", easing: "ease-in-out" },
        { offset: 0.48, transform: "rotate(-3.4deg)", easing: "ease-in-out" },
        { offset: 0.64, transform: "rotate(1.8deg)", easing: "ease-in-out" },
        { offset: 0.78, transform: "rotate(-0.8deg)", easing: "ease-in-out" },
        { offset: 0.9, transform: "rotate(0.3deg)", easing: "ease-in-out" },
        { offset: 1, transform: "none" },
      ],
      { duration: 2100, delay: 0, fill: "backwards" },
    ),
  );

  // The lines patter in, letter by letter; each letter starts above the top of
  // the screen, whatever its own height on it.
  const heavy = letters.filter((l) => l.hasAttribute("data-heavy"));
  const light = letters.filter((l) => !l.hasAttribute("data-heavy"));
  let lightEnd = 260;
  for (const el of light) {
    const ln = Number(el.dataset.ln);
    const idx = Number(el.dataset.idx);
    const r = el.getBoundingClientRect();
    const h = Math.max(140, r.bottom + rand(30, 170));
    const { frames, total, impact } = bounceFrames(
      h,
      tune.g,
      tune.e,
      rand(-1, 1) * tune.spin,
      rand(-1, 1) * tune.drift,
    );
    const delay = 260 + ln * 300 + idx * 36 + rand(0, 50);
    anims.push(el.animate(frames, { duration: total, delay, fill: "backwards" }));
    lightEnd = Math.max(lightEnd, delay + impact);
  }

  // The payoff falls as one slab, from one height, so it lands all at once.
  let thudAt = lightEnd + 260;
  if (heavy.length) {
    const top = Math.max(...heavy.map((l) => l.getBoundingClientRect().bottom));
    const h = Math.max(160, top + 90);
    const start = lightEnd + 120;
    heavy.forEach((el, i) => {
      const { frames, total, impact } = bounceFrames(
        h,
        tune.g * 1.15,
        tune.eHeavy,
        rand(-1, 1) * tune.spin * 0.12,
        0,
      );
      const delay = start + i * 14;
      anims.push(el.animate(frames, { duration: total, delay, fill: "backwards" }));
      thudAt = Math.max(thudAt, delay + impact);
    });
  }

  // The thud: everything jolts, and dust kicks up along the payoff's foot.
  timers.push(
    window.setTimeout(() => {
      const jolt: Keyframe[] = [
        { transform: "none" },
        { transform: `translate3d(0, ${tune.thud}px, 0)` },
        { transform: `translate3d(0, ${-tune.thud * 0.45}px, 0)` },
        { transform: `translate3d(0, ${tune.thud * 0.2}px, 0)` },
        { transform: "none" },
      ];
      anims.push(copy.animate(jolt, { duration: 420, easing: "ease-out" }));
      // The visual on its nail takes the knock too (its own rotate, so it
      // rides on top of whatever is left of its swing).
      anims.push(
        visual.animate(
          [{ rotate: "0deg" }, { rotate: "0.9deg" }, { rotate: "-0.5deg" }, { rotate: "0deg" }],
          { duration: 600, easing: "ease-out" },
        ),
      );
      kickUpDust(dust, heavy, anims);
    }, thudAt),
  );

  // The intro's words drop softly in once the dust is up.
  words.forEach((el, i) => {
    anims.push(
      el.animate(
        [
          { opacity: 0, transform: "translate3d(0, -0.9em, 0)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: 900,
          delay: thudAt + 180 + i * 32,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          fill: "backwards",
        },
      ),
    );
  });

  // Once everything has landed, the cursor can nudge the letters about.
  const settled = thudAt + 180 + words.length * 32 + 900;
  timers.push(window.setTimeout(() => (nudge = nudgeable(title, letters)), settled));

  return cancel;
}

/** A puff of gold dust along the foot of the payoff, blown out to the sides. */
function kickUpDust(dust: HTMLElement, heavy: HTMLElement[], anims: Animation[]) {
  if (!heavy.length) return;
  const box = dust.getBoundingClientRect();
  const first = heavy[0].getBoundingClientRect();
  const last = heavy[heavy.length - 1].getBoundingClientRect();
  const left = first.left - box.left;
  const width = last.right - first.left;
  const foot = Math.max(first.bottom, last.bottom) - box.top - first.height * 0.16;
  const mid = left + width / 2;
  const n = Math.round(Math.min(34, Math.max(14, width / 20)));
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    // Every third one is a soft cloud that billows; the rest are grit that
    // flies further and fades as it goes.
    const cloud = i % 3 === 0;
    const size = cloud ? rand(16, 30) : rand(3, 9);
    const x = left + (width * (i + Math.random())) / n;
    const fill = cloud
      ? `radial-gradient(closest-side, rgb(var(--c-gold) / 0.32), transparent)`
      : `rgb(var(--c-gold) / ${rand(0.4, 0.75).toFixed(2)})`;
    p.style.cssText = `position:absolute;left:${x}px;top:${foot}px;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:9999px;background:${fill};`;
    dust.appendChild(p);
    const away = (x - mid) / (width / 2 || 1);
    const reach = cloud ? 0.5 : 1;
    const dx = (away * rand(30, 100) + rand(-12, 12)) * reach;
    const dy = -rand(8, 50) * reach;
    const a = p.animate(
      cloud
        ? [
            { transform: "translate3d(0,0,0) scale(0.4)", opacity: 0 },
            { transform: `translate3d(${dx * 0.4}px, ${dy * 0.5}px, 0) scale(1.2)`, opacity: 0.9, offset: 0.25 },
            { transform: `translate3d(${dx}px, ${dy}px, 0) scale(2)`, opacity: 0 },
          ]
        : [
            { transform: "translate3d(0,0,0) scale(0.6)", opacity: 0 },
            { transform: `translate3d(${dx * 0.35}px, ${dy * 0.6}px, 0) scale(1.1)`, opacity: 1, offset: 0.2 },
            { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.3)`, opacity: 0 },
          ],
      { duration: cloud ? rand(1100, 1500) : rand(700, 1100), easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    a.onfinish = () => p.remove();
    anims.push(a);
  }
}

/**
 * Letters that a passing cursor knocks about: each one within reach of the
 * pointer takes some of its speed and wobbles back to rest on a spring. Only
 * for a mouse or pen — a finger on a phone is busy scrolling. Returns a stop.
 */
function nudgeable(title: HTMLElement, letters: HTMLElement[]): () => void {
  if (!window.matchMedia("(hover: hover)").matches) return () => {};
  type S = { el: HTMLElement; cx: number; cy: number; x: number; y: number; r: number; vx: number; vy: number; vr: number };
  let state: S[] = [];
  const measure = () => {
    const box = title.getBoundingClientRect();
    state = letters.map((el) => {
      const prev = state.find((s) => s.el === el);
      const r = el.getBoundingClientRect();
      // The letter's resting centre, relative to the title (any nudge it is
      // carrying is a transform, which a fresh rect would include).
      return {
        el,
        cx: r.left + r.width / 2 - box.left - (prev?.x ?? 0),
        cy: r.top + r.height / 2 - box.top - (prev?.y ?? 0),
        x: prev?.x ?? 0,
        y: prev?.y ?? 0,
        r: prev?.r ?? 0,
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
        vr: prev?.vr ?? 0,
      };
    });
  };
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(title);

  const REACH = 80;
  let raf = 0;
  let last = 0;
  let px: number | null = null;
  let py = 0;
  let pt = 0;

  const step = (now: number) => {
    const dt = Math.min(0.033, (now - (last || now)) / 1000) || 0.016;
    last = now;
    let moving = false;
    for (const s of state) {
      // Stiff, lightly damped: a wobble, not a slow drift home.
      s.vx += (-260 * s.x - 13 * s.vx) * dt;
      s.vy += (-260 * s.y - 13 * s.vy) * dt;
      s.vr += (-300 * s.r - 12 * s.vr) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.r += s.vr * dt;
      const still = Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.r) < 0.05 && Math.abs(s.vx) + Math.abs(s.vy) < 1;
      if (still) {
        if (s.x || s.y || s.r) {
          s.x = s.y = s.r = s.vx = s.vy = s.vr = 0;
          s.el.style.transform = "";
        }
      } else {
        moving = true;
        s.el.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0) rotate(${s.r.toFixed(2)}deg)`;
      }
    }
    raf = moving ? requestAnimationFrame(step) : 0;
    if (!raf) last = 0;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const box = title.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const now = e.timeStamp;
    if (px !== null && now > pt) {
      const dt = Math.max(8, now - pt) / 1000;
      const vx = Math.max(-2400, Math.min(2400, (x - px) / dt));
      const vy = Math.max(-2400, Math.min(2400, (y - py) / dt));
      for (const s of state) {
        const d = Math.hypot(s.cx + s.x - x, s.cy + s.y - y);
        if (d > REACH) continue;
        const k = (1 - d / REACH) ** 2;
        s.vx += vx * k * 0.35;
        s.vy += vy * k * 0.35;
        s.vr += vx * k * 0.06;
      }
      if (!raf) raf = requestAnimationFrame(step);
    }
    px = x;
    py = y;
    pt = now;
  };
  const onLeave = () => {
    px = null;
  };
  title.addEventListener("pointermove", onMove);
  title.addEventListener("pointerleave", onLeave);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    title.removeEventListener("pointermove", onMove);
    title.removeEventListener("pointerleave", onLeave);
    for (const s of state) s.el.style.transform = "";
  };
}
