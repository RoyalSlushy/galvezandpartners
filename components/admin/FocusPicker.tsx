"use client";

import { useRef, useState } from "react";
import { readFocus, stripFocus, withFocus } from "@/lib/wix";
import { resolveImage } from "@/lib/adminClient";

/**
 * Focal-point picker for the image editor. Lets an admin mark the point of a
 * case-study frame that must stay in view when it is cropped to fill the very
 * tall hero on a phone (object-cover). Dragging on the image sets the point;
 * a thin phone-shaped preview shows the resulting crop live. The point is
 * encoded back into the media string (`#focus=x,y`) via `onChange`, so it is
 * saved and reordered with the image itself — no separate field to keep in sync.
 */
export default function FocusPicker({
  raw,
  onChange,
}: {
  raw: string;
  onChange: (next: string) => void;
}) {
  const focus = readFocus(raw) ?? { x: 50, y: 50 };
  const src = resolveImage(stripFocus(raw), 900, 900);
  const boxRef = useRef<HTMLDivElement>(null);
  // Match the box to the image's aspect so object-cover fills it exactly (no
  // letterbox), keeping the pointer→image mapping 1:1.
  const [aspect, setAspect] = useState<string>("4 / 3");
  const dragging = useRef(false);
  const isSet = !!readFocus(raw);

  const apply = (clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    onChange(withFocus(raw, x, y));
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="font-heading text-xs uppercase tracking-widest text-white/50">
          Focus point (narrow crops)
        </p>
        <button
          type="button"
          onClick={() => onChange(stripFocus(raw))}
          disabled={!isSet}
          className="text-[11px] text-white/50 transition hover:text-gold disabled:opacity-40"
        >
          Reset to center
        </button>
      </div>
      <p className="mt-1 text-[11px] text-white/40">
        Drag the dot to the part that should stay in view when the image is
        cropped tall (e.g. the case-study hero on a phone).
      </p>

      <div className="mt-3 flex gap-3">
        {/* Draggable focus target over the whole image. */}
        <div
          ref={boxRef}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            apply(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (dragging.current) apply(e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          style={{ aspectRatio: aspect }}
          className="relative min-w-0 flex-1 cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-white/10 bg-navy"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              if (el.naturalWidth && el.naturalHeight) {
                setAspect(`${el.naturalWidth} / ${el.naturalHeight}`);
              }
            }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <span
            aria-hidden
            style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
            className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold bg-gold/20 shadow-[0_0_0_2px_rgba(20,25,36,0.6)]"
          >
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold" />
          </span>
        </div>

        {/* Live thin-crop preview (roughly a phone hero's proportions). */}
        <div className="shrink-0">
          <div className="h-40 w-[4.75rem] overflow-hidden rounded-md border border-white/10 bg-navy">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-1 text-center text-[10px] text-white/40">crop</p>
        </div>
      </div>
    </div>
  );
}
