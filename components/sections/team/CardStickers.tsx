"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useAdmin, useEditMode } from "@/components/admin/AdminProvider";
import { resolveImage } from "@/lib/adminClient";
import type { Sticker } from "@/content/team";
import StickerPopover from "./StickerPopover";

/** How far a press may travel before it counts as a drag rather than a click. */
const DRAG_SLOP = 4;

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/** Sticker artwork can be an uploaded URL, an inline data URI or a file served
 * from the app itself; only a bare media id needs resolving against the CDN. */
function stickerSrc(raw: string): string {
  if (!raw) return "";
  return /^(https?:|data:|\/)/.test(raw) ? raw : resolveImage(raw, 320, 320);
}

/**
 * The sticker layer for one card. Stickers sit on top of the card rather than
 * inside it: the layer never clips, so a sticker overhangs the card's edges
 * the way a real one would, instead of being sliced off at the border. Their
 * anchor point is a percentage of the card's box — clamped to it, so a
 * sticker's centre always lands on the card while its edges are free to hang
 * past it — which also keeps each sticker on its card at any size.
 *
 * The layer lives inside the card so stickers ride the card's entrance and
 * exit transforms. The cost is that each animated card is its own stacking
 * context, so a sticker overhanging far enough to reach the *other* card is
 * drawn behind it.
 *
 * In edit mode each sticker is draggable, and a click (a press that didn't
 * travel) opens its editor.
 */
export default function CardStickers({
  stickers,
  listPath,
  card,
}: {
  stickers: Sticker[];
  /** Content path of the member's sticker list. */
  listPath: string;
  card: Sticker["card"];
}) {
  const editMode = useEditMode();
  const admin = useAdmin();
  const layerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<{ index: number; top: number; left: number } | null>(
    null,
  );
  // Live position while dragging, so the draft is written once, on release.
  const [drag, setDrag] = useState<{ index: number; x: number; y: number } | null>(null);

  // Keep each sticker's index in the full list — that's what the content paths
  // and list operations address.
  const mine = stickers
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s && (s.card ?? "details") === card);

  if (!mine.length) return null;

  const startDrag = (e: ReactPointerEvent<HTMLElement>, i: number) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const layer = layerRef.current;
    if (!layer) return;
    const box = layer.getBoundingClientRect();
    const el = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    const at = (ev: PointerEvent) => ({
      x: clampPct(((ev.clientX - box.left) / box.width) * 100),
      y: clampPct(((ev.clientY - box.top) / box.height) * 100),
    });

    const onMove = (ev: PointerEvent) => {
      if (!moved) {
        moved =
          Math.abs(ev.clientX - startX) > DRAG_SLOP || Math.abs(ev.clientY - startY) > DRAG_SLOP;
        if (!moved) return;
      }
      const p = at(ev);
      setDrag({ index: i, ...p });
    };
    const onUp = (ev: PointerEvent) => {
      el.releasePointerCapture?.(ev.pointerId);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      if (moved) {
        const p = at(ev);
        admin.setValue(`${listPath}.${i}.x`, Math.round(p.x * 10) / 10);
        admin.setValue(`${listPath}.${i}.y`, Math.round(p.y * 10) / 10);
      } else {
        const r = el.getBoundingClientRect();
        setEditing({
          index: i,
          top: Math.min(r.bottom + 8, window.innerHeight - 380),
          left: Math.max(8, Math.min(r.left, window.innerWidth - 300)),
        });
      }
      setDrag(null);
    };
    el.setPointerCapture?.(e.pointerId);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={layerRef}
      // Sized against the card so sticker sizes can be given in cqw.
      style={{ containerType: "inline-size" }}
      className="pointer-events-none absolute inset-0 z-30"
    >
      {mine.map(({ s, i }) => {
        const live = drag?.index === i ? drag : null;
        const size = s.size ?? 18;
        const src = stickerSrc(s.img);
        const style: CSSProperties = {
          left: `${live ? live.x : (s.x ?? 50)}%`,
          top: `${live ? live.y : (s.y ?? 50)}%`,
          // An explicit width, rather than shrinking to fit the artwork: an
          // absolutely positioned box near an edge has very little room left
          // between its offset and the card's far side, and would be squeezed
          // down to that gap instead of keeping its size.
          width: `${size}cqw`,
          transform: `translate(-50%, -50%) rotate(${s.rotate ?? 0}deg)`,
          // The finish is masked by the artwork's alpha, so it never shows
          // through the transparent parts of a PNG or SVG.
          ...(src ? ({ ["--sticker-mask" as string]: `url("${src}")` } as CSSProperties) : null),
        };
        // Only artwork can carry a finish — an emoji has no image to mask
        // against, so a finish would paint as a block over its whole box.
        const finish = src ? `gp-sticker-${s.finish ?? "plain"}` : "";
        return (
          <div
            key={i}
            onPointerDown={(e) => startDrag(e, i)}
            title={editMode ? "Drag to move, click to edit" : undefined}
            style={style}
            className={`gp-sticker absolute ${finish} ${
              editMode ? "pointer-events-auto cursor-move" : ""
            }`}
          >
            {src ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={src}
                alt=""
                draggable={false}
                className="block h-auto w-full select-none"
              />
            ) : (
              <span
                style={{ fontSize: `${size}cqw`, lineHeight: 1 }}
                className="block select-none whitespace-nowrap"
              >
                {s.emoji || "⭐"}
              </span>
            )}
          </div>
        );
      })}

      {editing && (
        <StickerPopover
          listPath={listPath}
          index={editing.index}
          pos={{ top: editing.top, left: editing.left }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
