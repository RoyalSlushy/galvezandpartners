import PhotoCard, { type PhotoCardMotion } from "@/components/ui/PhotoCard";
import { resolveImage } from "@/lib/adminClient";

/**
 * Placements for the lander's polaroids. They keep to the upper band and the
 * right, so the bottom-left stays clear for the heading and its letterform, and
 * each carries its own drift and phase timing (negative delays start them
 * mid-cycle) so photographs surface and recede independently rather than
 * pulsing together.
 */
const SLOTS: (PhotoCardMotion & { pos: string; w: string; rot: string })[] = [
  { pos: "right-[5%] top-[9%]", w: "w-40 min-[1600px]:w-52", rot: "7deg", dur: "14s", delay: "-9s", phaseDur: "10.5s", phaseDelay: "-8s" },
  { pos: "right-[27%] top-[30%]", w: "w-36 min-[1600px]:w-48", rot: "-6deg", dur: "12s", delay: "-1s", phaseDur: "13.5s", phaseDelay: "-2s" },
  { pos: "right-[9%] bottom-[14%]", w: "w-40 min-[1600px]:w-52", rot: "-9deg", dur: "15s", delay: "-6s", phaseDur: "9.5s", phaseDelay: "-5s" },
  { pos: "left-[7%] top-[8%]", w: "w-32 min-[1600px]:w-44", rot: "-8deg", dur: "13s", delay: "-2s", phaseDur: "9s", phaseDelay: "-1s" },
  { pos: "left-[29%] top-[22%]", w: "w-36 min-[1600px]:w-48", rot: "6deg", dur: "16s", delay: "-7s", phaseDur: "12.5s", phaseDelay: "-6s" },
  { pos: "right-[44%] top-[6%]", w: "w-32 min-[1600px]:w-44", rot: "10deg", dur: "11s", delay: "-4s", phaseDur: "8s", phaseDelay: "-3s" },
];

/**
 * The Our Team lander's gallery: the team-together photographs as polaroids
 * scattered over the office backdrop, each fading in and out on its own cycle.
 * Purely decorative, and desktop-only — the placements assume gutters a phone
 * doesn't have.
 *
 * One photograph per slot, so only the first few uploaded are shown; raising
 * that means adding placements here.
 */
export default function LanderPhotoCards({ images }: { images: string[] }) {
  const shown = images.filter(Boolean).slice(0, SLOTS.length);
  if (!shown.length) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] hidden overflow-hidden sm:block"
    >
      {shown.map((raw, i) => {
        const slot = SLOTS[i];
        return (
          <PhotoCard
            key={i}
            src={resolveImage(raw, 400, 500)}
            rot={slot.rot}
            positionClassName={slot.pos}
            widthClassName={slot.w}
            motion={{
              dur: slot.dur,
              delay: slot.delay,
              phaseDur: slot.phaseDur,
              phaseDelay: slot.phaseDelay,
            }}
          />
        );
      })}
    </div>
  );
}
