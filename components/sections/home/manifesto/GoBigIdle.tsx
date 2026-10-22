"use client";

import { useEffect, useState, type AnimationEvent, type RefObject } from "react";
import { resolveImage } from "@/lib/adminClient";
import PhotoCard from "@/components/ui/PhotoCard";
import type { ManifestoIdleId } from "./idle";

/** How long each photo holds inside the letters. */
const LETTERS_MS = 5200;
/** How often a word flashes, and how long it stays filled. */
const FLASH_EVERY_MS = 2400;
const FLASH_HOLD_MS = 1700;

/**
 * The composed Go Big title's idle animation (see idle.ts). It works on the
 * title already in the page: the static lines are found inside `copyRef` and
 * dressed with classes and a photo (see the .gb-idle-* rules in globals.css),
 * and Gallery drift adds its own polaroids behind the copy. Nothing runs while
 * the title is off screen, and the copy fading out for the dive takes all of it
 * along.
 */
export default function GoBigIdle({
  idle,
  gallery,
  copyRef,
}: {
  idle: ManifestoIdleId;
  gallery: string[];
  copyRef: RefObject<HTMLElement>;
}) {
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = copyRef.current;
    if (!el || idle === "none") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [copyRef, idle]);

  // Through the letters / Gold sheen: the static lines take a class, and the
  // letters version swaps the photo behind them on a timer, dipping the line
  // for the change.
  useEffect(() => {
    const copy = copyRef.current;
    if (!copy || (idle !== "letters" && idle !== "sheen")) return;
    if (idle === "letters" && gallery.length === 0) return;
    const lines = Array.from(copy.querySelectorAll<HTMLElement>("[data-line]:not([data-payoff])"));
    const cls = idle === "letters" ? "gb-idle-letters" : "gb-idle-sheen";
    lines.forEach((l) => l.classList.add(cls));
    let n = 0;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const show = (i: number) =>
      lines.forEach((l) => l.style.setProperty("--idle-img", `url("${resolveImage(gallery[i % gallery.length], 1200, 600)}")`));
    if (idle === "letters") show(0);
    const id =
      idle === "letters" && onScreen && gallery.length > 1
        ? setInterval(() => {
            lines.forEach((l) => l.classList.add("gb-idle-dip"));
            swap = setTimeout(() => {
              show(++n);
              lines.forEach((l) => l.classList.remove("gb-idle-dip"));
            }, 450);
          }, LETTERS_MS)
        : undefined;
    return () => {
      clearInterval(id);
      clearTimeout(swap);
      lines.forEach((l) => {
        l.classList.remove(cls, "gb-idle-dip");
        l.style.removeProperty("--idle-img");
      });
    };
  }, [idle, gallery, copyRef, onScreen]);

  // Word flash: one word of the static lines at a time fills with a photo.
  useEffect(() => {
    const copy = copyRef.current;
    if (!copy || idle !== "flash" || !onScreen || gallery.length === 0) return;
    const words = Array.from(copy.querySelectorAll<HTMLElement>("[data-line]:not([data-payoff]) [data-word]"));
    if (words.length === 0) return;
    let n = 0;
    let last = -1;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const flash = () => {
      let w = Math.floor(Math.random() * words.length);
      if (w === last && words.length > 1) w = (w + 1) % words.length;
      last = w;
      const el = words[w];
      el.style.setProperty("--idle-img", `url("${resolveImage(gallery[n++ % gallery.length], 600, 400)}")`);
      el.classList.add("gb-idle-flash");
      const t = setTimeout(() => {
        el.classList.remove("gb-idle-flash");
        timers.delete(t);
      }, FLASH_HOLD_MS);
      timers.add(t);
    };
    flash();
    const id = setInterval(flash, FLASH_EVERY_MS);
    return () => {
      clearInterval(id);
      timers.forEach(clearTimeout);
      words.forEach((el) => {
        el.classList.remove("gb-idle-flash");
        el.style.removeProperty("--idle-img");
      });
    };
  }, [idle, gallery, copyRef, onScreen]);

  if (idle !== "drift" || gallery.length === 0) return null;
  return <Drift gallery={gallery} />;
}

/** Where the drifting polaroids sit around the headline, and their timings. */
const DRIFT = [
  { pos: "left-[4%] top-[14%]", w: "w-24 sm:w-32", rot: "-8deg", dur: "12s", delay: "-3s", phaseDur: "9s", phaseDelay: "-2s" },
  { pos: "right-[5%] top-[10%]", w: "w-28 sm:w-36", rot: "7deg", dur: "14s", delay: "-8s", phaseDur: "11s", phaseDelay: "-6s" },
  { pos: "left-[9%] bottom-[14%]", w: "w-24 sm:w-32", rot: "5deg", dur: "13s", delay: "-5s", phaseDur: "10s", phaseDelay: "-8s" },
  { pos: "right-[8%] bottom-[16%]", w: "w-24 sm:w-32", rot: "-6deg", dur: "11s", delay: "-1s", phaseDur: "12.5s", phaseDelay: "-4s" },
  { pos: "left-[42%] top-[4%]", w: "w-20 sm:w-28", rot: "3deg", dur: "15s", delay: "-10s", phaseDur: "13s", phaseDelay: "-10s" },
];

function Drift({ gallery }: { gallery: string[] }) {
  // Each card moves on to the next unseen photo at the dimmest point of its
  // fade, so the set keeps changing without a swap ever being seen.
  const [turns, setTurns] = useState<number[]>(() => DRIFT.map(() => 0));
  const onCycle = (i: number) => (e: AnimationEvent<HTMLElement>) => {
    if (e.animationName !== "photocard-phase" || gallery.length <= DRIFT.length) return;
    setTurns((t) => t.map((n, j) => (j === i ? n + 1 : n)));
  };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-60">
      {DRIFT.map((c, i) => (
        <PhotoCard
          key={i}
          src={resolveImage(gallery[(i + turns[i] * DRIFT.length) % gallery.length], 300, 375)}
          rot={c.rot}
          positionClassName={c.pos}
          widthClassName={c.w}
          motion={{ dur: c.dur, delay: c.delay, phaseDur: c.phaseDur, phaseDelay: c.phaseDelay }}
          onAnimationIteration={onCycle(i)}
          style={{ ["--phase-min" as string]: "0" }}
        />
      ))}
    </div>
  );
}
