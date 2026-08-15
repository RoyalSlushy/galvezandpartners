"use client";

import { useCallback, useEffect, useRef, useState, type AnimationEvent } from "react";
import PhotoCard, { type PhotoCardMotion } from "@/components/ui/PhotoCard";
import { resolveImage } from "@/lib/adminClient";

/** How many may share the screen — fewer on a phone, where there is far less
 * room left once the copy has taken its share. */
const MAX_CARDS_WIDE = 5;
const MAX_CARDS_NARROW = 3;
/** The `sm` breakpoint, which is also where the lander's copy grows. */
const NARROW_MAX = 750;

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
const EDGE_PAD = 16;
const CARD_GAP = 22;
/** Attempts before giving up on finding a card a clear spot. */
const MAX_TRIES = 240;
/** Whole-layout attempts before falling back to lanes (see `layout`). */
const DEAL_ROUNDS = 12;

type Rect = { left: number; top: number; width: number; height: number };
/** Placement as percentages of the lander, so it holds through a resize. */
type Placement = { leftPct: number; topPct: number; widthPct: number };
type Card = { src: string; place: Placement };

type Geometry = {
  boxW: number;
  boxH: number;
  /** Regions the lander already spends on content — the copy. */
  keepOut: Rect[];
  /** Horizontal span of the site's body column, within the lander. */
  bodyLeft: number;
  bodyRight: number;
  cardW: number;
  cardH: number;
  maxCards: number;
};

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.left < b.left + b.width + gap &&
    a.left + a.width + gap > b.left &&
    a.top < b.top + b.height + gap &&
    a.top + a.height + gap > b.top
  );
}

/** Fisher-Yates, so which photographs get their turn varies between visits. */
function shuffled<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const toRect = (p: Placement, g: Geometry): Rect => ({
  left: (p.leftPct / 100) * g.boxW,
  top: (p.topPct / 100) * g.boxH,
  width: g.cardW,
  height: g.cardH,
});

/**
 * Find a spot for one card. The card's centre is required to land inside the
 * site's body column — the frame the rest of the page is written to — so a
 * photograph is never stranded out in the gutter, though its corners may hang
 * past it. Candidates are rejected if they would cover the lander's copy or a
 * card already placed, so nothing lands on anything else.
 */
function centreSpan(g: Geometry): [number, number] {
  const half = g.cardW / 2;
  // Prefer centres that also keep the whole card on screen; if the body column
  // is too narrow for that, fall back to the column itself.
  const tight: [number, number] = [
    Math.max(g.bodyLeft, half + EDGE_PAD),
    Math.min(g.bodyRight, g.boxW - half - EDGE_PAD),
  ];
  return tight[0] <= tight[1] ? tight : [g.bodyLeft, g.bodyRight];
}

function pickPlacement(g: Geometry, taken: Rect[], lane?: [number, number]): Placement | null {
  const half = g.cardW / 2;
  const [cLo, cHi] = lane ?? centreSpan(g);
  const spanY = Math.max(0, g.boxH - g.cardH - EDGE_PAD * 2);

  for (let tries = 0; tries < MAX_TRIES; tries++) {
    const cx = cLo + Math.random() * Math.max(0, cHi - cLo);
    const rect: Rect = {
      left: cx - half,
      top: EDGE_PAD + Math.random() * spanY,
      width: g.cardW,
      height: g.cardH,
    };
    if (g.keepOut.some((k) => overlaps(rect, k, CARD_GAP))) continue;
    if (taken.some((t) => overlaps(rect, t, CARD_GAP))) continue;
    return {
      leftPct: (rect.left / g.boxW) * 100,
      topPct: (rect.top / g.boxH) * 100,
      widthPct: (g.cardW / g.boxW) * 100,
    };
  }
  return null;
}

/**
 * Spots for a whole set of cards. Sampling each one independently can paint
 * itself into a corner — on a laptop the clear strip above the copy is only
 * about one card tall, so a few unlucky draws leave no room for the last card —
 * so the deal is attempted several times over and the fullest result wins.
 *
 * If none of those rounds seats every card, the set falls back to lanes: the
 * body column split into one vertical strip per card, which separates them
 * horizontally by construction while leaving their exact spot and height to
 * chance. Free sampling is tried first because lanes, repeated, read as a row.
 */
function layout(g: Geometry): Placement[] {
  let best: Placement[] = [];

  const round = (lanes: boolean): Placement[] => {
    const [cLo, cHi] = centreSpan(g);
    const step = (cHi - cLo) / g.maxCards;
    const taken: Rect[] = [];
    const out: Placement[] = [];
    for (let i = 0; i < g.maxCards; i++) {
      const lane: [number, number] | undefined = lanes
        ? [cLo + i * step, cLo + (i + 1) * step]
        : undefined;
      const place = pickPlacement(g, taken, lane);
      if (!place) continue; // this one found nowhere clear; the rest still might
      taken.push(toRect(place, g));
      out.push(place);
    }
    return out;
  };

  for (let r = 0; r < DEAL_ROUNDS && best.length < g.maxCards; r++) {
    const out = round(false);
    if (out.length > best.length) best = out;
  }
  if (best.length < g.maxCards) {
    const out = round(true);
    if (out.length > best.length) best = out;
  }
  return best;
}

/**
 * The Our Team lander's gallery on a phone, where there is no cursor for the
 * trail to follow (LanderPhotoTrail takes over from `sm` up): team-together
 * photographs as polaroids over the office backdrop, each drifting and fading on
 * its own cycle. The sizing below still reads the lander's width rather than
 * assuming a phone, so moving that breakpoint doesn't quietly mis-size anything.
 *
 * A card re-dresses itself at the turn of its fade cycle — the one moment it is
 * fully transparent (see --phase-min) — taking the next photograph from the
 * pool and a fresh spot. So the set both turns over and rearranges, and every
 * uploaded photograph gets its turn rather than only the first few.
 *
 * Placement is measured, so it can only happen on the client; nothing renders
 * until it has, which also keeps this out of the server render. Purely
 * decorative.
 */
export default function LanderPhotoCards({ images }: { images: string[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<Card[]>([]);
  // The shuffled pool and how far through it we are, so successive swaps walk
  // the whole set before repeating.
  const poolRef = useRef<string[]>([]);
  const cursorRef = useRef(0);
  // The dealt set, mirrored: re-dressing one card needs to know what the others
  // hold, and drawing from the pool moves the cursor — a side effect that has no
  // business inside a state updater, which React may run more than once.
  const cardsRef = useRef<Card[]>([]);

  const commit = (next: Card[]) => {
    cardsRef.current = next;
    setCards(next);
  };

  const pool = images.filter(Boolean);
  const poolKey = pool.join("|");

  const measure = useCallback((): Geometry | null => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const box = wrap.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return null;
    const section = wrap.closest("section");

    const keepOut: Rect[] = [];
    section?.querySelectorAll<HTMLElement>("[data-gp-lander-keepout]").forEach((el) => {
      const r = el.getBoundingClientRect();
      keepOut.push({
        left: r.left - box.left,
        top: r.top - box.top,
        width: r.width,
        height: r.height,
      });
    });

    const bodyRect = section
      ?.querySelector<HTMLElement>("[data-gp-lander-bounds]")
      ?.getBoundingClientRect();
    const narrow = box.width <= NARROW_MAX;
    const cardW = narrow
      ? Math.max(92, Math.min(150, box.width * 0.3))
      : Math.max(140, Math.min(240, box.width * 0.13));
    return {
      boxW: box.width,
      boxH: box.height,
      keepOut,
      bodyLeft: bodyRect ? bodyRect.left - box.left : 0,
      bodyRight: bodyRect ? bodyRect.right - box.left : box.width,
      cardW,
      // 4:5 photo plus the white frame's padding.
      cardH: cardW * 1.25 + cardW * 0.12,
      maxCards: narrow ? MAX_CARDS_NARROW : MAX_CARDS_WIDE,
    };
  }, []);

  /** Next photograph in the pool, reshuffling once it has been walked, so every
   * uploaded picture gets its turn before any repeats. */
  const take = useCallback(() => {
    if (poolRef.current.length === 0) return "";
    if (cursorRef.current >= poolRef.current.length) {
      poolRef.current = shuffled(poolRef.current);
      cursorRef.current = 0;
    }
    return poolRef.current[cursorRef.current++];
  }, []);

  /** As `take`, but skipping anything already on screen — the walk can cross a
   * reshuffle mid-deal, which would otherwise show the same photograph twice.
   * Falls through when there is nothing else to show (fewer photographs
   * uploaded than cards). */
  const nextSrc = useCallback(
    (exclude: string[] = []) => {
      let src = take();
      for (let i = 0; i < poolRef.current.length && exclude.includes(src); i++) {
        src = take();
      }
      return src;
    },
    [take],
  );

  // Deal the initial set, and deal again when the lander's size settles — the
  // copy occupies a different area at a different width, and the phone shows
  // fewer cards than a desktop.
  useEffect(() => {
    if (pool.length === 0) return;

    const deal = () => {
      const g = measure();
      if (!g) {
        commit([]);
        return;
      }
      // A fresh shuffle per deal, so a re-deal can't pick up mid-pool and
      // repeat what it just dealt.
      poolRef.current = shuffled(pool);
      cursorRef.current = 0;
      const chosen: string[] = [];
      commit(
        layout(g).map((place) => {
          const src = nextSrc(chosen);
          chosen.push(src);
          return { src, place };
        }),
      );
    };

    deal();
    let settle: number | undefined;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(settle);
      settle = window.setTimeout(deal, 250);
    });
    ro.observe(wrapRef.current!);
    return () => {
      ro.disconnect();
      window.clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey, measure, nextSrc]);

  /** At the turn of a card's fade cycle it is invisible, so that is when its
   * photograph and its spot are both changed. */
  const onCycle = (i: number) => (e: AnimationEvent<HTMLElement>) => {
    if (e.animationName !== "photocard-phase") return;
    const g = measure();
    const cur = cardsRef.current;
    if (!g || !cur[i]) return;
    const others = cur.filter((_, j) => j !== i);
    const out = cur.slice();
    out[i] = {
      src: nextSrc(others.map((c) => c.src)),
      place: pickPlacement(g, others.map((c) => toRect(c.place, g))) ?? cur[i].place,
    };
    commit(out);
  };

  if (pool.length === 0) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      {cards.map(({ src, place }, i) => {
        const motion = MOTION[i % MOTION.length];
        return (
          <PhotoCard
            // Keyed by slot, not by photograph: the card stays put in the DOM so
            // its animation keeps running while its picture is swapped under it.
            key={i}
            src={resolveImage(src, 400, 500)}
            rot={motion.rot}
            motion={motion}
            onAnimationIteration={onCycle(i)}
            style={{
              left: `${place.leftPct}%`,
              top: `${place.topPct}%`,
              width: `${place.widthPct}%`,
              // Fully transparent at the turn, so the swap is never seen.
              ["--phase-min" as string]: "0",
            }}
          />
        );
      })}
    </div>
  );
}
