import { resolveImage } from "@/lib/adminClient";
import PhotoCard from "@/components/ui/PhotoCard";

/**
 * Small decorative "photocards" of work — images from the work gallery and the
 * social media marquee (videos left out), passed in as `photos` — scattered
 * into the hero's side gutters — away from the body content — as a subtle
 * sprinkled-in flourish that slowly falls in place. Purely decorative
 * (aria-hidden, pointer-transparent) and shown from min-[1440px] where the side
 * gutters first open up; the cards then grow at min-[1600px] as the gutters get
 * roomier, and stay clear of the body even after it widens on ultrawide (see the
 * --site-max tiers in globals.css).
 */

type Card = {
  /** Edge anchor + vertical placement. */
  pos: string;
  /** Card width — modest where the gutter first opens, larger once it widens. */
  w: string;
  /** Resting tilt, kept off the animated (translate) transform. */
  rot: string;
  /** Fall timing — staggered + negative-offset so the cards drift out of sync. */
  dur: string;
  delay: string;
  /** Opacity phase-in/out timing — a different cycle from the fall, staggered so
   * each card surfaces and recedes independently of the rest of the set. */
  phaseDur: string;
  phaseDelay: string;
};

// Six spots, each pinned to a fixed spot
// hugging the left/right edge and tilted a little so they read as loose
// snapshots rather than a tidy grid.
const CARDS: Card[] = [
  { pos: "left-[0.75rem] top-[13%]", w: "w-32 min-[1600px]:w-44", rot: "-8deg", dur: "13s", delay: "-2s", phaseDur: "9s", phaseDelay: "-1s" },
  { pos: "left-[1.25rem] top-[43%]", w: "w-36 min-[1600px]:w-48", rot: "6deg", dur: "16s", delay: "-7s", phaseDur: "12.5s", phaseDelay: "-6s" },
  { pos: "left-[0.5rem] bottom-[11%]", w: "w-32 min-[1600px]:w-44", rot: "-5deg", dur: "11s", delay: "-4s", phaseDur: "8s", phaseDelay: "-3s" },
  { pos: "right-[0.75rem] top-[11%]", w: "w-36 min-[1600px]:w-48", rot: "7deg", dur: "14s", delay: "-9s", phaseDur: "10.5s", phaseDelay: "-8s" },
  { pos: "right-[1.25rem] top-[45%]", w: "w-32 min-[1600px]:w-44", rot: "-6deg", dur: "12s", delay: "-1s", phaseDur: "13.5s", phaseDelay: "-2s" },
  { pos: "right-[0.5rem] bottom-[13%]", w: "w-36 min-[1600px]:w-48", rot: "9deg", dur: "15s", delay: "-6s", phaseDur: "9.5s", phaseDelay: "-5s" },
];

export default function HeroPhotoCards({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden min-[1440px]:block"
    >
      {CARDS.map((card, i) => {
        const id = photos[i % photos.length];
        return (
          <PhotoCard
            key={i}
            src={resolveImage(id, 300, 375)}
            rot={card.rot}
            positionClassName={card.pos}
            widthClassName={card.w}
            motion={{
              dur: card.dur,
              delay: card.delay,
              phaseDur: card.phaseDur,
              phaseDelay: card.phaseDelay,
            }}
          />
        );
      })}
    </div>
  );
}
