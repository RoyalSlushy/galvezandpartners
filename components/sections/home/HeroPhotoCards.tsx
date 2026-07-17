import { CASE_STUDIES } from "@/content/caseStudies";
import { wixImage } from "@/lib/wix";

/**
 * Small decorative "photocards" of work pulled from the case studies, scattered
 * into the hero's side gutters — away from the body content — as a subtle
 * sprinkled-in flourish that slowly falls in place. Purely decorative
 * (aria-hidden, pointer-transparent) and shown from min-[1440px] where the side
 * gutters first open up; the cards then grow at min-[1600px] as the gutters get
 * roomier, and stay clear of the body even after it widens on ultrawide (see the
 * --site-max tiers in globals.css).
 */

type Card = {
  study: number;
  img: number;
  /** Edge anchor + vertical placement. */
  pos: string;
  /** Card width — modest where the gutter first opens, larger once it widens. */
  w: string;
  /** Resting tilt, kept off the animated (translate) transform. */
  rot: string;
  /** Fall timing — staggered + negative-offset so the cards drift out of sync. */
  dur: string;
  delay: string;
};

// A spread of images across the four case studies, each pinned to a fixed spot
// hugging the left/right edge and tilted a little so they read as loose
// snapshots rather than a tidy grid.
const CARDS: Card[] = [
  { study: 0, img: 0, pos: "left-[0.75rem] top-[13%]", w: "w-28 min-[1600px]:w-36", rot: "-8deg", dur: "13s", delay: "-2s" },
  { study: 2, img: 1, pos: "left-[1.25rem] top-[43%]", w: "w-32 min-[1600px]:w-40", rot: "6deg", dur: "16s", delay: "-7s" },
  { study: 1, img: 4, pos: "left-[0.5rem] bottom-[11%]", w: "w-28 min-[1600px]:w-36", rot: "-5deg", dur: "11s", delay: "-4s" },
  { study: 3, img: 2, pos: "right-[0.75rem] top-[11%]", w: "w-32 min-[1600px]:w-40", rot: "7deg", dur: "14s", delay: "-9s" },
  { study: 1, img: 6, pos: "right-[1.25rem] top-[45%]", w: "w-28 min-[1600px]:w-36", rot: "-6deg", dur: "12s", delay: "-1s" },
  { study: 0, img: 5, pos: "right-[0.5rem] bottom-[13%]", w: "w-32 min-[1600px]:w-40", rot: "9deg", dur: "15s", delay: "-6s" },
];

export default function HeroPhotoCards() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden min-[1440px]:block"
    >
      {CARDS.map((card, i) => {
        const study = CASE_STUDIES[card.study];
        const id = study?.gallery[card.img];
        if (!id) return null;
        return (
          <figure
            key={i}
            className={`photocard-fall absolute ${card.pos} ${card.w}`}
            style={{ animationDuration: card.dur, animationDelay: card.delay }}
          >
            <div
              className="rounded-md bg-white/95 p-2 opacity-90 shadow-2xl shadow-black/40 ring-1 ring-black/10"
              style={{ transform: `rotate(${card.rot})` }}
            >
              <img
                src={wixImage(id, 300, 375)}
                alt=""
                loading="lazy"
                className="block aspect-[4/5] w-full rounded-sm object-cover"
              />
            </div>
          </figure>
        );
      })}
    </div>
  );
}
