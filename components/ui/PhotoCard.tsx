import type { AnimationEvent, CSSProperties } from "react";

/** Fall + opacity-phase timings for one card. The two cycles are independent so
 * a card's drift and its surfacing/receding never march in step. */
export type PhotoCardMotion = {
  /** Fall timing — negative delays start cards mid-drift, out of sync. */
  dur: string;
  delay: string;
  phaseDur: string;
  phaseDelay: string;
};

/**
 * The polaroid itself: a photo in a thick white frame, tilted. Kept apart from
 * the drifting card below so anything else can borrow the look without borrowing
 * the motion — the Our Team lander's cursor trail does exactly that. The tilt
 * lives here rather than on the parent, so it never fights an animated transform
 * on the element above it.
 */
export function PhotoFrame({ src, rot }: { src: string; rot: string }) {
  return (
    <div
      className="bg-white/95 p-2 opacity-90 shadow-2xl shadow-black/40 ring-1 ring-black/10"
      style={{ transform: `rotate(${rot})` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" className="block aspect-[4/5] w-full object-cover" />
    </div>
  );
}

/**
 * One decorative "polaroid", drifting slowly and phasing in and out (see
 * .photocard-fall in globals.css, which also stills it under reduced motion).
 * Used for the scattered cards in the home hero and, on narrow screens, for the
 * Our Team lander's gallery.
 */
export default function PhotoCard({
  src,
  rot,
  positionClassName = "",
  widthClassName = "",
  motion,
  style,
  onAnimationIteration,
}: {
  src: string;
  /** Resting tilt, e.g. "-8deg". */
  rot: string;
  /** Edge anchor + vertical placement, e.g. "left-4 top-[13%]". */
  positionClassName?: string;
  widthClassName?: string;
  motion: PhotoCardMotion;
  /** Placement set at runtime instead of by class, for measured layouts. */
  style?: CSSProperties;
  /** Fires at each turn of the fall and phase cycles. Callers that re-dress a
   * card mid-flight watch for the phase cycle, whose turn is its dimmest point. */
  onAnimationIteration?: (e: AnimationEvent<HTMLElement>) => void;
}) {
  return (
    <figure
      onAnimationIteration={onAnimationIteration}
      className={`photocard-fall absolute ${positionClassName} ${widthClassName}`}
      style={
        {
          "--fall-dur": motion.dur,
          "--fall-delay": motion.delay,
          "--phase-dur": motion.phaseDur,
          "--phase-delay": motion.phaseDelay,
          ...style,
        } as CSSProperties
      }
    >
      <PhotoFrame src={src} rot={rot} />
    </figure>
  );
}
