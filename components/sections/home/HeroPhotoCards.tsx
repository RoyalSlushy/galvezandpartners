import { CASE_STUDIES } from "@/content/caseStudies";
import { wixImage } from "@/lib/wix";

/**
 * Small decorative "photocards" of work pulled from the case studies, scattered
 * into the hero's side gutters — away from the body content — as a subtle
 * sprinkled-in flourish. Purely decorative (aria-hidden, pointer-transparent)
 * and only shown on wide desktops (min-[1440px]) where the gutters outside the
 * 1200px content column are wide enough to hold them without crowding the body.
 */

type Card = { study: number; img: number; className: string };

// Pull a spread of images across the four case studies and pin each to a fixed
// spot hugging the left/right edge, tilted a little so they read as loose
// snapshots rather than a tidy grid.
const CARDS: Card[] = [
  { study: 0, img: 0, className: "left-[0.75rem] top-[15%] w-24 -rotate-[8deg]" },
  { study: 2, img: 1, className: "left-[1.5rem] top-[45%] w-28 rotate-[6deg]" },
  { study: 1, img: 4, className: "left-[0.5rem] bottom-[12%] w-24 -rotate-[5deg]" },
  { study: 3, img: 2, className: "right-[0.75rem] top-[13%] w-28 rotate-[7deg]" },
  { study: 1, img: 6, className: "right-[1.5rem] top-[47%] w-24 -rotate-[6deg]" },
  { study: 0, img: 5, className: "right-[0.5rem] bottom-[14%] w-28 rotate-[9deg]" },
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
            className={`absolute rounded-md bg-white/95 p-1.5 shadow-2xl shadow-black/40 ring-1 ring-black/10 opacity-90 ${card.className}`}
          >
            <img
              src={wixImage(id, 220, 275)}
              alt=""
              loading="lazy"
              className="block aspect-[4/5] w-full rounded-sm object-cover"
            />
          </figure>
        );
      })}
    </div>
  );
}
