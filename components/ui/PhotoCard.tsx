import type { CSSProperties } from "react";

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
 * One decorative "polaroid": a photo in a thick white frame, tilted, drifting
 * slowly and phasing in and out (see .photocard-fall in globals.css, which also
 * stills it under reduced motion). Used for the scattered cards in the home
 * hero and for the Our Team lander's gallery.
 *
 * The resting tilt is kept on an inner element so it never fights the animated
 * transform on the frame itself.
 */
export default function PhotoCard({
  src,
  rot,
  positionClassName = "",
  widthClassName = "",
  motion,
  style,
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
}) {
  return (
    <figure
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
      <div
        className="bg-white/95 p-2 opacity-90 shadow-2xl shadow-black/40 ring-1 ring-black/10"
        style={{ transform: `rotate(${rot})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          className="block aspect-[4/5] w-full object-cover"
        />
      </div>
    </figure>
  );
}
