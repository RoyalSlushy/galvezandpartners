"use client";

import { useEffect, useRef, useState } from "react";
import PhotoCard, { type PhotoCardMotion } from "@/components/ui/PhotoCard";
import { resolveImage } from "@/lib/adminClient";

/** Never more than this many on screen at once, however many are uploaded. */
const MAX_CARDS = 5;
/** Tilt + timings per card. Negative delays start them mid-cycle, so
 * photographs surface and recede independently rather than pulsing together. */
const MOTION: (PhotoCardMotion & { rot: string })[] = [
  { rot: "7deg", dur: "14s", delay: "-9s", phaseDur: "10.5s", phaseDelay: "-8s" },
  { rot: "-6deg", dur: "12s", delay: "-1s", phaseDur: "13.5s", phaseDelay: "-2s" },
  { rot: "-9deg", dur: "15s", delay: "-6s", phaseDur: "9.5s", phaseDelay: "-5s" },
  { rot: "6deg", dur: "16s", delay: "-7s", phaseDur: "12.5s", phaseDelay: "-6s" },
  { rot: "-8deg", dur: "13s", delay: "-2s", phaseDur: "9s", phaseDelay: "-1s" },
];

/** Breathing room kept from the lander's edges and between cards, in px. */
const EDGE_PAD = 20;
const CARD_GAP = 24;
/** Attempts per card before giving up on finding it a clear spot. */
const MAX_TRIES = 500;

type Rect = { left: number; top: number; width: number; height: number };
/** Placement as percentages of the lander, so it holds through a resize. */
type Placement = { leftPct: number; topPct: number; widthPct: number };

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.left < b.left + b.width + gap &&
    a.left + a.width + gap > b.left &&
    a.top < b.top + b.height + gap &&
    a.top + a.height + gap > b.top
  );
}

/** Fisher-Yates, so which photographs get their turn varies between visits
 * rather than always being the first few uploaded. */
function shuffled<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The Our Team lander's gallery: team-together photographs as polaroids over the
 * office backdrop, each drifting and fading on its own cycle.
 *
 * Placements are random per visit rather than fixed, and chosen by rejection
 * sampling: a candidate spot is rejected if it would cover the lander's copy —
 * any element marked `data-gp-lander-keepout` — or land on a card already
 * placed. They are stored as percentages so a resize scales them rather than
 * stranding a card off-edge, and recomputed when the lander's size settles,
 * since the copy occupies a different area at a different width.
 *
 * Because the placement is measured, it can only happen on the client; nothing
 * renders until it has, which also keeps the markup out of the server render.
 * Purely decorative, and desktop-only — the placements assume gutters a phone
 * doesn't have.
 */
export default function LanderPhotoCards({ images }: { images: string[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<{ src: string; place: Placement }[]>([]);

  const pool = images.filter(Boolean);
  const poolKey = pool.join("|");

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || pool.length === 0) return;

    const place = () => {
      const box = wrap.getBoundingClientRect();
      // Hidden below sm, so there is nothing to measure (or to show).
      if (box.width < 1 || box.height < 1) {
        setCards([]);
        return;
      }

      // Whatever the lander already spends its space on — the heading block.
      const keepOut: Rect[] = [];
      wrap
        .closest("section")
        ?.querySelectorAll<HTMLElement>("[data-gp-lander-keepout]")
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          keepOut.push({
            left: r.left - box.left,
            top: r.top - box.top,
            width: r.width,
            height: r.height,
          });
        });

      const width = Math.max(140, Math.min(240, box.width * 0.13));
      // 4:5 photo plus the white frame's padding.
      const height = width * 1.25 + width * 0.12;
      const spanX = Math.max(0, box.width - width - EDGE_PAD * 2);
      const spanY = Math.max(0, box.height - height - EDGE_PAD * 2);

      const taken: Rect[] = [];
      const chosen: { src: string; place: Placement }[] = [];
      for (const src of shuffled(pool).slice(0, MAX_CARDS)) {
        let settled = false;
        for (let tries = 0; tries < MAX_TRIES; tries++) {
          const rect: Rect = {
            left: EDGE_PAD + Math.random() * spanX,
            top: EDGE_PAD + Math.random() * spanY,
            width,
            height,
          };
          if (keepOut.some((k) => overlaps(rect, k, CARD_GAP))) continue;
          if (taken.some((t) => overlaps(rect, t, CARD_GAP))) continue;
          taken.push(rect);
          chosen.push({
            src,
            place: {
              leftPct: (rect.left / box.width) * 100,
              topPct: (rect.top / box.height) * 100,
              widthPct: (width / box.width) * 100,
            },
          });
          settled = true;
          break;
        }
        // Nowhere clear left: stop rather than stack this one over the copy.
        if (!settled) break;
      }
      setCards(chosen);
    };

    place();
    // Re-place once the lander's size settles — the copy takes up a different
    // area at a different width, so old spots may no longer be clear.
    let settle: number | undefined;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(settle);
      settle = window.setTimeout(place, 250);
    });
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      window.clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey]);

  if (pool.length === 0) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] hidden overflow-hidden sm:block"
    >
      {cards.map(({ src, place }, i) => {
        const motion = MOTION[i % MOTION.length];
        return (
          <PhotoCard
            key={`${i}-${src}`}
            src={resolveImage(src, 400, 500)}
            rot={motion.rot}
            motion={motion}
            style={{
              left: `${place.leftPct}%`,
              top: `${place.topPct}%`,
              width: `${place.widthPct}%`,
            }}
          />
        );
      })}
    </div>
  );
}
