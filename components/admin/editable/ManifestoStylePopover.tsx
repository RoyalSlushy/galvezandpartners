"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "@/components/admin/AdminProvider";
import { XIcon } from "@/components/admin/icons";
import {
  MANIFESTO_STYLES,
  manifestoStyleMeta,
  type ManifestoStyleId,
} from "@/components/sections/home/manifesto/styles";
import {
  MANIFESTO_IDLES,
  resolveManifestoIdle,
} from "@/components/sections/home/manifesto/idle";

const PATH = "home.multicultural.style";
const IDLE_PATH = "home.multicultural.idle";

/**
 * The manifesto style picker: one card per style, each with a small looping
 * sketch of what the style does, its name and a line about it. Picking a card
 * stages the style like any other edit (the drawer's save publishes it); the
 * Preview button plays the staged style full size, in place, as visitors will
 * see it.
 *
 * The sketches are CSS only and live in this component (they are only ever
 * loaded for an admin), and opening the picker starts fetching every style's
 * code, so a preview of any of them starts at once. Below the styles, the idle
 * animation — what the composed title does while it waits — is picked the
 * same way.
 */
export default function ManifestoStylePopover({
  current,
  idle: storedIdle,
  anchorRef,
  onClose,
  onPreview,
}: {
  current: ManifestoStyleId;
  /** The stored idle animation (home.multicultural.idle). */
  idle?: string;
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
    void import("@/components/sections/home/manifesto/GoBig");
  }, []);

  const meta = manifestoStyleMeta(current);
  const idle = resolveManifestoIdle(storedIdle);

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

      <div className="border-t border-white/10 px-4 pb-3 pt-3">
        <p className="font-heading text-xs uppercase tracking-widest text-white/50">Idle animation</p>
        <p className="mt-1 text-[11px] leading-snug text-white/40">
          What the title does while it waits for the visitor to scroll. Most use the work gallery&rsquo;s
          photos inside the white line.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {MANIFESTO_IDLES.map((m) => {
            const selected = m.id === idle;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={selected}
                onClick={() => admin.setValue(IDLE_PATH, m.id)}
                className={`flex flex-col border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  selected ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/30 hover:bg-white/5"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-heading text-sm text-white">{m.name}</span>
                  {selected && (
                    <span className="font-heading text-[10px] uppercase tracking-widest text-gold">On</span>
                  )}
                </span>
                <span className="mt-0.5 text-[11px] leading-snug text-white/50">{m.blurb}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <p className="text-[11px] leading-snug text-white/40">
          Preview plays the style with the idle animation you picked.
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

const LINE_1 = "WHERE BRANDS COME TO DO";
const PAYOFF = "BIG THINGS";

function Sketch({ id }: { id: ManifestoStyleId }) {
  return (
    <span aria-hidden className={`msp msp-${id}`}>
      {id === "gobig" && <GoBigSketch />}
    </span>
  );
}

function GoBigSketch() {
  return (
    <>
      <span className="msp-gb-lines">
        {LINE_1}
      </span>
      <span className="msp-gb-pay">
        <span className="msp-gb-gold">{PAYOFF}</span>
        <span className="msp-gb-win">{PAYOFF}</span>
      </span>
      <span className="msp-gb-full" />
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

`;
