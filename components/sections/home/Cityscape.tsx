"use client";

import { useState } from "react";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import CityscapePopover from "@/components/admin/editable/CityscapePopover";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { isVideoUrl, resolveImage } from "@/lib/adminClient";
import type { CityscapeContent } from "@/content/home";

/**
 * Downtown skyline silhouette that caps the top of the rising content block, so
 * it comes up together with that section as the page scrolls over the pinned
 * hero. The block is pulled up by one `--cityscape-h` band (see page.tsx), so at
 * rest the skyline overlaps the hero's bare bottom band: it has no panel behind
 * it — the buildings stand directly against the hero gradient, and the gaps show
 * the gradient through. The front row is painted in the content's base color so
 * its bases fuse with the opaque panel below as the section rises. `none` keeps
 * the row spanning the full width at the fixed band height on every viewport.
 *
 * CMS-managed (home.cityscape): it can be hidden, each row recolored, or the
 * drawn skyline swapped for uploaded artwork. In edit mode the band is one
 * editable target that opens its settings (see CityscapePopover); hidden, it
 * stays there as a faint ghost so there is something to click to bring it back.
 */
export default function Cityscape({ cityscape: serverCityscape }: { cityscape: CityscapeContent }) {
  const cityscape = useCmsValue("home.cityscape", serverCityscape);
  const editMode = useEditMode();
  const reduced = useMotionOff();
  const [editing, setEditing] = useState<{ top: number; left: number } | null>(null);

  if (!cityscape.show && !editMode) return null;

  const image = cityscape.image;
  const band = "block h-[var(--cityscape-h)] w-full";

  return (
    <>
    <div
      aria-hidden
      className={`relative z-10 -mb-px w-full leading-[0] ${
        cityscape.show ? "" : "opacity-25"
      }`}
      {...(editMode
        ? {
            "data-gp-editable": "",
            title: "Edit skyline",
            onClickCapture: (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              // Open above the click where there is room (the band sits at the
              // foot of the first screen), kept inside the viewport.
              setEditing({
                top: Math.max(8, Math.min(e.clientY - 360, window.innerHeight - 380)),
                left: Math.max(8, Math.min(e.clientX - 144, window.innerWidth - 296)),
              });
            },
          }
        : null)}
    >
      {image ? (
        isVideoUrl(image) ? (
          <video
            src={image}
            className={`${band} object-cover object-bottom`}
            autoPlay={!reduced}
            muted
            loop={!reduced}
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImage(image, 1920, 260)}
            alt=""
            className={`${band} object-cover object-bottom`}
          />
        )
      ) : (
        <svg viewBox="0 0 800 150" preserveAspectRatio="none" className={band}>
          {/* Back row: taller, hazier towers in the panel tint for depth. */}
          <g
            className="fill-navy-soft"
            style={cityscape.backColor ? { fill: cityscape.backColor } : undefined}
          >
            <rect x="20" y="55" width="34" height="95" />
            <rect x="95" y="30" width="28" height="120" />
            <rect x="107" y="12" width="3" height="18" />
            <rect x="165" y="62" width="40" height="88" />
            <rect x="270" y="25" width="30" height="125" />
            <rect x="283" y="8" width="3" height="17" />
            <rect x="350" y="52" width="36" height="98" />
            <rect x="455" y="38" width="30" height="112" />
            <rect x="530" y="60" width="42" height="90" />
            <rect x="635" y="30" width="32" height="120" />
            <rect x="649" y="12" width="3" height="18" />
            <rect x="720" y="64" width="40" height="86" />
          </g>
          {/* Front row: the content's base color, so bases fuse with the panel. */}
          <g
            className="fill-navy"
            style={cityscape.frontColor ? { fill: cityscape.frontColor } : undefined}
          >
            <rect x="0" y="92" width="52" height="58" />
            <rect x="68" y="78" width="48" height="72" />
            <rect x="135" y="100" width="52" height="50" />
            <rect x="205" y="84" width="46" height="66" />
            <rect x="280" y="104" width="58" height="46" />
            <rect x="360" y="88" width="50" height="62" />
            <rect x="440" y="74" width="44" height="76" />
            <rect x="505" y="100" width="54" height="50" />
            <rect x="580" y="84" width="48" height="66" />
            <rect x="648" y="104" width="54" height="46" />
            <rect x="715" y="80" width="40" height="70" />
            <rect x="770" y="100" width="30" height="50" />
          </g>
        </svg>
      )}
    </div>
    {/* A sibling, not a child: the popover portals out to <body>, but React
        events still bubble through the component tree, and the band's click
        capture would swallow every click inside it. */}
    {editing && (
      <CityscapePopover
        cityscape={cityscape}
        pos={editing}
        onClose={() => setEditing(null)}
      />
    )}
    </>
  );
}
