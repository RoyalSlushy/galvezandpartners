"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "@/components/admin/AdminProvider";
import { XIcon } from "@/components/admin/icons";
import {
  MANIFESTO_STYLES,
  manifestoStyleMeta,
  type ManifestoStyleId,
} from "@/components/sections/home/manifesto/styles";

const PATH = "home.multicultural.style";

/**
 * The manifesto style picker: one card per style, each with a small looping
 * sketch of what the style does, its name and a line about it. Picking a card
 * stages the style like any other edit (the drawer's save publishes it); the
 * Preview button plays the staged style full size, in place, as visitors will
 * see it.
 *
 * The sketches are CSS only and live in this component (they are only ever
 * loaded for an admin), and opening the picker starts fetching every style's
 * code, so a preview of any of them starts at once.
 */
export default function ManifestoStylePopover({
  current,
  anchorRef,
  onClose,
  onPreview,
}: {
  current: ManifestoStyleId;
  anchorRef: RefObject<HTMLElement>;
  onClose: () => void;
  onPreview: () => void;
}) {
  const admin = useAdmin();
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);

  // Under the chip, right-aligned to it, kept on screen.
  useLayoutEffect(() => {
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      if (!a) return;
      const width = Math.min(740, window.innerWidth - 24);
      const left = Math.max(12, Math.min(a.right - width, window.innerWidth - width - 12));
      const top = Math.max(12, Math.min(a.bottom + 8, window.innerHeight - 260));
      setPos({ top, left, width, maxH: window.innerHeight - top - 12 });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [anchorRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      // The chip toggles the picker itself.
      if (cardRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose, anchorRef]);

  // Fetch every style's code now, so whichever is previewed plays straight away.
  useEffect(() => {
    void import("@/components/sections/home/manifesto/InkFill");
    void import("@/components/sections/home/manifesto/CurtainCall");
    void import("@/components/sections/home/manifesto/Stardust");
    void import("@/components/sections/home/manifesto/GoBig");
    void import("@/components/sections/home/manifesto/Departures");
    void import("@/components/sections/home/manifesto/Gravity");
  }, []);

  const meta = manifestoStyleMeta(current);

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Manifesto style"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: pos?.width,
        maxHeight: pos?.maxH,
        visibility: pos ? "visible" : "hidden",
      }}
      className="fixed z-[85] flex flex-col border border-white/10 bg-navy-soft shadow-2xl shadow-black/60"
    >
      <style>{PREVIEW_CSS}</style>
      <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4">
        <div>
          <p className="font-heading text-xs uppercase tracking-widest text-white/50">Manifesto style</p>
          <p className="mt-1 text-[11px] leading-snug text-white/40">
            How the &ldquo;big things&rdquo; section makes its entrance. Pick one to stage it, preview it
            full size, then Save in the drawer to publish.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto px-4 pb-3 min-[340px]:grid-cols-2 sm:grid-cols-3">
        {MANIFESTO_STYLES.map((s) => {
          const selected = s.id === current;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={selected}
              onClick={() => admin.setValue(PATH, s.id)}
              className={`group flex flex-col border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                selected ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              <Sketch id={s.id} />
              <span className="flex flex-1 flex-col p-2.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-heading text-sm text-white">{s.name}</span>
                  {selected && (
                    <span className="font-heading text-[10px] uppercase tracking-widest text-gold">On</span>
                  )}
                </span>
                <span className="mt-1 text-[11px] leading-snug text-white/50">{s.blurb}</span>
                <span className="mt-auto pt-2 font-heading text-[9px] uppercase tracking-widest text-gold/70">
                  {s.cue}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <p className="text-[11px] leading-snug text-white/40">
          Every style uses the same title, intro and visual.
        </p>
        <button
          type="button"
          onClick={onPreview}
          className="flex shrink-0 items-center gap-2 bg-gold px-3.5 py-2 font-heading text-[10px] uppercase tracking-widest text-navy transition hover:bg-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 fill-current">
            <path d="M7 4.5v15l12.5-7.5z" />
          </svg>
          Preview {meta.name}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------------ */
/* The sketches: a few seconds of each style, in miniature, on a loop.      */

const LINE_1 = "THE MULTI-CULTURAL";
const LINE_2 = "AGENCY DOING";
const PAYOFF = "BIG THINGS";

function Sketch({ id }: { id: ManifestoStyleId }) {
  return (
    <span aria-hidden className={`msp msp-${id}`}>
      {id === "ink" && <InkSketch />}
      {id === "curtain" && <CurtainSketch />}
      {id === "stardust" && <StardustSketch />}
      {id === "gobig" && <GoBigSketch />}
      {id === "departures" && <DeparturesSketch />}
      {id === "gravity" && <GravitySketch />}
    </span>
  );
}

const vars = (v: Record<string, string | number>) => v as CSSProperties;

function Picture({ className = "" }: { className?: string }) {
  return <span className={`msp-frame ${className}`}><span className="msp-pic" /></span>;
}

function InkSketch() {
  let n = 0;
  const words = (text: string) =>
    text.split(" ").map((w, i) => (
      <span key={i} className="msp-ink-w" style={vars({ "--i": n++ })}>
        {w}{" "}
      </span>
    ));
  return (
    <>
      <span className="msp-copy">
        <span className="msp-l">{words(LINE_1)}</span>
        <span className="msp-l">{words(LINE_2)}</span>
        <span className="msp-l msp-pay">{words(PAYOFF)}</span>
      </span>
      <Picture className="msp-ink-pop" />
    </>
  );
}

function CurtainSketch() {
  const line = (text: string, i: number, pay = false) => (
    <span className={`msp-l ${pay ? "msp-pay" : ""}`}>
      <span className="msp-cc" style={vars({ "--d": `${0.15 + i * 0.16}s` })}>
        <span className="msp-cc-t">{text}</span>
        <span className="msp-cc-bar" />
      </span>
    </span>
  );
  return (
    <>
      <span className="msp-copy">
        {line(LINE_1, 0)}
        {line(LINE_2, 1)}
        {line(PAYOFF, 2, true)}
      </span>
      <span className="msp-frame msp-cc-frame" style={vars({ "--d": "0s" })}>
        <span className="msp-pic msp-cc-t" />
        <span className="msp-cc-bar" />
      </span>
    </>
  );
}

/** A 5×7 dot face, just for the letters the sketch needs. */
const DOT_FONT: Record<string, string[]> = {
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  I: ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
  G: [".###.", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#.#.#", "#..##", "#...#", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
};

const DUST = (() => {
  let seed = 0x2f9b11;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const dots: { x: number; y: number; dx: number; dy: number; d: number }[] = [];
  let col = 0;
  for (const ch of PAYOFF) {
    if (ch === " ") {
      col += 2;
      continue;
    }
    const rows = DOT_FONT[ch];
    rows.forEach((row, y) =>
      Array.from(row).forEach((c, x) => {
        if (c === "#") {
          dots.push({ x: col + x, y, dx: (rnd() - 0.5) * 90, dy: (rnd() - 0.5) * 70, d: 0 });
        }
      }),
    );
    col += rows[0].length + 1;
  }
  const width = col - 1;
  dots.forEach((dot) => (dot.d = (dot.x / width) * 0.5 + rnd() * 0.25));
  return { dots, width };
})();

function StardustSketch() {
  return (
    <>
      <span className="msp-sd-stars" />
      <span className="msp-sd-dots" style={vars({ "--cols": DUST.width })}>
        {DUST.dots.map((d, i) => (
          <span
            key={i}
            className="msp-sd-dot"
            style={vars({
              left: `calc(${d.x} * var(--cell))`,
              top: `calc(${d.y} * var(--cell))`,
              "--dx": `${d.dx.toFixed(1)}cqw`,
              "--dy": `${d.dy.toFixed(1)}cqw`,
              "--d": `${d.d.toFixed(2)}s`,
            })}
          />
        ))}
      </span>
    </>
  );
}

function GoBigSketch() {
  return (
    <>
      <span className="msp-gb-lines">
        {LINE_1}
        <br />
        {LINE_2}
      </span>
      <span className="msp-gb-pay">
        <span className="msp-gb-gold">{PAYOFF}</span>
        <span className="msp-gb-win">{PAYOFF}</span>
      </span>
      <span className="msp-gb-full" />
    </>
  );
}

const FLAP_RUN = "QZKRMWXJ";

function DeparturesSketch() {
  const es = "GRANDES COSAS";
  const en = PAYOFF.padEnd(es.length, " ");
  return (
    <span className="msp-df-board">
      {Array.from(es).map((c, i) => {
        // Blank, a couple of flaps, the Spanish, a couple more, the English.
        const strip = [" ", FLAP_RUN[i % 8], FLAP_RUN[(i + 3) % 8], c, FLAP_RUN[(i + 5) % 8], FLAP_RUN[(i + 1) % 8], en[i]];
        return (
          <span key={i} className="msp-df-tile" style={vars({ "--d": `${(i * 0.06).toFixed(2)}s` })}>
            <span className="msp-df-strip">
              {strip.map((ch, k) => (
                <span key={k} className={k === strip.length - 1 ? "msp-df-gold" : ""}>
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function GravitySketch() {
  let n = 0;
  const letters = (text: string, pay = false) =>
    Array.from(text).map((ch, i) => (
      <span
        key={i}
        className="msp-gv-c"
        style={vars({
          "--d": `${(pay ? 0.9 + i * 0.015 : n++ * 0.035).toFixed(3)}s`,
          "--r": `${pay ? 0 : ((i * 37) % 50) - 25}deg`,
        })}
      >
        {ch === " " ? " " : ch}
      </span>
    ));
  return (
    <>
      <span className="msp-copy">
        <span className="msp-l">{letters(LINE_1)}</span>
        <span className="msp-l">{letters(LINE_2)}</span>
        <span className="msp-l msp-pay msp-gv-pay">{letters(PAYOFF, true)}</span>
      </span>
      <Picture className="msp-gv-swing" />
    </>
  );
}

const PREVIEW_CSS = `
.msp {
  position: relative; display: block; overflow: hidden; aspect-ratio: 16 / 10;
  container-type: inline-size;
  background: linear-gradient(to bottom, rgb(77 96 138 / 0.55), rgb(var(--c-navy)) 58%), rgb(var(--c-navy));
  font-family: var(--font-display); color: #fff; line-height: 0.92;
}
.msp * { box-sizing: border-box; }
.msp-copy { position: absolute; left: 7%; top: 50%; translate: 0 -50%; width: 52%; }
.msp-l { display: block; white-space: nowrap; font-size: 4.7cqw; }
.msp-pay { font-size: 9.2cqw; color: rgb(var(--c-gold)); padding-top: 0.08em; }
.msp-frame { position: absolute; right: 6%; top: 50%; width: 34%; aspect-ratio: 4 / 3; translate: 0 -50%; display: block; }
.msp-pic {
  position: absolute; inset: 0; display: block;
  background:
    radial-gradient(circle at 70% 34%, #fff6e0 0 7%, transparent 8%),
    linear-gradient(to bottom, transparent 62%, rgb(var(--c-navy) / 0.85) 62%),
    linear-gradient(165deg, rgb(var(--c-cream)) 0%, rgb(var(--c-gold)) 38%, #4d608a 78%);
}

/* Ink Fill */
.msp-ink-w { opacity: 0.15; animation: msp-ink 4.4s ease infinite; animation-delay: calc(var(--i) * 0.16s); }
@keyframes msp-ink { 0% { opacity: 0.15 } 8% { opacity: 1 } 70% { opacity: 1 } 80%, 100% { opacity: 0.15 } }
.msp-ink-pop { animation: msp-pop 4.4s infinite; }
@keyframes msp-pop {
  0%, 26% { transform: scale(0.8); opacity: 0; animation-timing-function: cubic-bezier(0.34, 1.8, 0.64, 1); }
  42%, 84% { transform: none; opacity: 1; }
  94%, 100% { transform: scale(0.8); opacity: 0; }
}

/* Curtain Call */
.msp-cc { position: relative; display: inline-block; }
.msp-cc-bar {
  position: absolute; inset: 0.04em -0.08em 0.08em; display: block; background: rgb(var(--c-gold));
  transform: scaleX(0); transform-origin: left center;
  animation: msp-cc-bar 4.4s cubic-bezier(0.65, 0, 0.35, 1) infinite both; animation-delay: var(--d);
}
.msp-cc-frame .msp-cc-bar { inset: 0; }
.msp-cc-t { animation: msp-cc-t 4.4s linear infinite both; animation-delay: var(--d); }
@keyframes msp-cc-bar {
  0% { transform: scaleX(0); transform-origin: left center; }
  9% { transform: scaleX(1); transform-origin: left center; }
  11% { transform: scaleX(1); transform-origin: right center; }
  20%, 100% { transform: scaleX(0); transform-origin: right center; }
}
@keyframes msp-cc-t { 0%, 9.9% { opacity: 0 } 10%, 86% { opacity: 1 } 92%, 100% { opacity: 0 } }

/* Stardust */
.msp-sd-stars {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(1px 1px at 12% 22%, #fff, transparent), radial-gradient(1px 1px at 78% 18%, #fff, transparent),
    radial-gradient(1px 1px at 88% 70%, rgb(var(--c-gold)), transparent), radial-gradient(1px 1px at 30% 82%, #fff, transparent),
    radial-gradient(1px 1px at 55% 12%, rgb(var(--c-gold)), transparent), radial-gradient(1px 1px at 64% 88%, #fff, transparent);
  animation: msp-twinkle 2.6s ease-in-out infinite alternate;
}
@keyframes msp-twinkle { from { opacity: 0.35 } to { opacity: 1 } }
.msp-sd-dots {
  --cell: 1.55cqw; position: absolute; left: 50%; top: 50%;
  width: calc(var(--cols) * var(--cell)); height: calc(7 * var(--cell)); translate: -50% -50%;
}
.msp-sd-dot {
  position: absolute; width: calc(var(--cell) * 0.72); height: calc(var(--cell) * 0.72); border-radius: 9999px;
  background: rgb(var(--c-gold)); box-shadow: 0 0 3px rgb(var(--c-gold) / 0.8);
  animation: msp-dust 4.8s cubic-bezier(0.65, 0, 0.35, 1) infinite both; animation-delay: var(--d);
}
@keyframes msp-dust {
  0% { transform: translate(var(--dx), var(--dy)) rotate(40deg); opacity: 0.2; }
  40%, 76% { transform: none; opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(40deg); opacity: 0.2; }
}

/* Go Big */
.msp-gb-lines {
  position: absolute; left: 0; right: 0; top: 24%; text-align: center; font-size: 4.2cqw; line-height: 1.05;
  animation: msp-gb-lines 4.8s infinite;
}
@keyframes msp-gb-lines { 0%, 14% { opacity: 1 } 26%, 94% { opacity: 0 } 100% { opacity: 1 } }
.msp-gb-pay {
  position: absolute; left: 50%; top: 58%; translate: -50% -50%; font-size: 10cqw; white-space: nowrap;
  transform-origin: 15% 52%; animation: msp-gb-zoom 4.8s infinite;
}
.msp-gb-gold { color: rgb(var(--c-gold)); }
.msp-gb-win {
  position: absolute; inset: 0; color: transparent;
  background: linear-gradient(165deg, rgb(var(--c-cream)) 0%, rgb(var(--c-gold)) 40%, #4d608a 85%);
  -webkit-background-clip: text; background-clip: text;
  animation: msp-gb-win 4.8s infinite;
}
@keyframes msp-gb-zoom {
  0% { transform: none; opacity: 0; }
  4%, 18% { transform: none; opacity: 1; }
  40% { transform: scale(1.7); }
  54% { transform: scale(4); }
  66% { transform: scale(11); }
  74% { transform: scale(30); }
  80%, 92% { transform: scale(60); opacity: 1; }
  96%, 100% { transform: scale(60); opacity: 0; }
}
@keyframes msp-gb-win { 0%, 12% { opacity: 0 } 24%, 100% { opacity: 1 } }
.msp-gb-full {
  position: absolute; inset: 0; opacity: 0;
  background: linear-gradient(165deg, rgb(var(--c-cream)) 0%, rgb(var(--c-gold)) 40%, #4d608a 85%);
  animation: msp-gb-full 4.8s infinite;
}
@keyframes msp-gb-full { 0%, 75% { opacity: 0 } 80%, 92% { opacity: 1 } 98%, 100% { opacity: 0 } }

/* Departures */
.msp-df-board {
  --tw: 5.6cqw; --th: 8cqw;
  position: absolute; left: 50%; top: 50%; translate: -50% -50%; display: flex; gap: 0.5cqw;
}
.msp-df-tile {
  position: relative; display: block; width: var(--tw); height: var(--th); overflow: hidden; border-radius: 1px;
  background: linear-gradient(to bottom, rgb(var(--c-navy-soft)) 50%, rgb(var(--c-navy-soft) / 0.75) 50%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.5);
}
.msp-df-tile::after { content: ""; position: absolute; left: 0; right: 0; top: calc(50% - 0.5px); height: 1px; background: rgb(0 0 0 / 0.6); }
.msp-df-strip {
  display: flex; flex-direction: column; font-size: 6cqw;
  animation: msp-df 4.8s infinite both; animation-delay: var(--d);
}
.msp-df-strip > span { display: flex; height: var(--th); flex: none; align-items: center; justify-content: center; line-height: 1; }
.msp-df-gold { color: rgb(var(--c-gold)); }
@keyframes msp-df {
  0% { transform: none; animation-timing-function: steps(3, end); }
  16%, 46% { transform: translateY(calc(-3 * var(--th))); animation-timing-function: steps(3, end); }
  58%, 90% { transform: translateY(calc(-6 * var(--th))); opacity: 1; }
  96%, 100% { transform: translateY(calc(-6 * var(--th))); opacity: 0; }
}

/* Gravity */
.msp-gv-c {
  display: inline-block; white-space: pre;
  animation: msp-drop 4.6s infinite both; animation-delay: var(--d);
}
.msp-gv-pay .msp-gv-c { animation-name: msp-thud; }
@keyframes msp-drop {
  0% { transform: translateY(-40cqw) rotate(var(--r)); animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45); }
  14% { transform: none; animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1); }
  20% { transform: translateY(-3.5cqw); animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45); }
  26% { transform: none; animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1); }
  29% { transform: translateY(-1cqw); animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45); }
  32%, 86% { transform: none; opacity: 1; }
  94%, 100% { transform: none; opacity: 0; }
}
@keyframes msp-thud {
  0% { transform: translateY(-50cqw); animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45); }
  14% { transform: none; animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1); }
  18% { transform: translateY(-1.2cqw); animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45); }
  21%, 70% { transform: none; opacity: 1; }
  78%, 100% { transform: none; opacity: 0; }
}
.msp-gv-swing { transform-origin: 50% 0; animation: msp-swing 4.6s infinite both; }
@keyframes msp-swing {
  0% { transform: translateY(-120%) rotate(-10deg); animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45); }
  12% { transform: rotate(7deg); animation-timing-function: ease-in-out; }
  20% { transform: rotate(-4deg); animation-timing-function: ease-in-out; }
  27% { transform: rotate(2deg); animation-timing-function: ease-in-out; }
  33%, 86% { transform: none; opacity: 1; }
  94%, 100% { transform: none; opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .msp *, .msp *::after { animation: none !important; }
}
`;
