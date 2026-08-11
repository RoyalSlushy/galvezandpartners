"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useEditMode } from "@/components/admin/AdminProvider";
import { resolveImage } from "@/lib/adminClient";
import type { Sticker } from "@/content/team";
import StickerPopover from "./StickerPopover";
import { piece, type SweepDir } from "./memberUtils";

/** Width of a sticker at `size: 100`. Sizes are a share of this fixed reference
 * rather than of the margin a sticker sits in, since those run from a sliver on
 * a phone to a few hundred pixels on an ultrawide display — sized against one,
 * a sticker would change size with the viewport. Held to a share of the screen
 * as well, so a phone never gets a sticker wider than its margin can carry. */
const SIZE_REF_REM = 26;
const SIZE_MAX_VW = 10;

/** The band of the screen the stickers are spread down, as fractions of its
 * height: clear of the close button at the top and the member nav at the
 * bottom. */
const TOP_MIN = 0.12;
const TOP_MAX = 0.86;
/** How far from the centre of its own band a sticker may sit, as a fraction of
 * that band — small enough that neighbours stay evenly spaced, large enough that
 * no two ever line up. */
const BAND_JITTER = 0.2;

/** How far across its margin a sticker's centre may fall, measured from the
 * card's edge. */
const ACROSS_MIN = 0.2;
const ACROSS_MAX = 0.85;

/** Empty artwork means "use the emoji", so it must not fall back to the
 * placeholder image the way a normal media field does. */
const stickerSrc = (raw: string) => (raw ? resolveImage(raw, 320, 320) : "");

type Side = "left" | "right";
/** Where one sticker sits: which margin, and its centre as a percentage of that
 * margin's height and of its width. */
type Spot = { side: Side; topPct: number; acrossPct: number };

/**
 * Deal spots for a set of stickers: alternating sides so they stay balanced, and
 * one per equal band down each side so their spacing is even. Within its band a
 * sticker lands where it likes, which is what keeps an arrangement from looking
 * set out on a grid. Indexed to match the sticker list, since that is what the
 * content paths address.
 */
function deal(count: number): Spot[] {
  const out: Spot[] = new Array(count);
  (["left", "right"] as const).forEach((side) => {
    const mine: number[] = [];
    for (let i = side === "left" ? 0 : 1; i < count; i += 2) mine.push(i);
    const band = (TOP_MAX - TOP_MIN) / mine.length;
    mine.forEach((i, j) => {
      const centre = TOP_MIN + (j + 0.5) * band;
      const jitter = (Math.random() * 2 - 1) * BAND_JITTER * band;
      out[i] = {
        side,
        topPct: (centre + jitter) * 100,
        acrossPct: (ACROSS_MIN + Math.random() * (ACROSS_MAX - ACROSS_MIN)) * 100,
      };
    });
  });
  return out;
}

/**
 * The stickers for an open profile card, scattered down the margins either side
 * of it — the strips of screen outside the body column the page is written to.
 * They frame the card without ever covering what it says, and they arrive and
 * leave with it: rising from the same point below the screen and swept off the
 * same way (see .gp-emerge / .gp-sweep).
 *
 * Placement is decided here rather than stored, re-rolled each time a card is
 * opened, so the same person's stickers never sit twice the same way. The
 * margins are laid out by the flex row below — two lanes either side of a spacer
 * standing in for the card's own column — so no measuring is needed and they
 * track the body's width, including the wider column ultrawide displays get.
 * A lane is given a minimum width, since below about 1264px the body fills the
 * screen and there is no true margin at all; there, stickers hug the card's
 * edges and overhang them, the way one stuck half over the edge of a photograph
 * would. Each is held inside the screen horizontally whatever the lane's width.
 *
 * In edit mode a sticker can be clicked to open its editor. There is nothing to
 * drag: it has no stored position to change.
 */
export default function SideStickers({
  stickers,
  listPath,
  exiting,
  sweepDir,
}: {
  stickers: Sticker[];
  /** Content path of the member's sticker list. */
  listPath: string;
  exiting: boolean;
  sweepDir: SweepDir;
}) {
  const editMode = useEditMode();
  const [editing, setEditing] = useState<{ index: number; top: number; left: number } | null>(
    null,
  );

  const live = stickers.filter(Boolean);
  // Dealt afresh when the set changes size (a sticker added or removed in the
  // editor, or the layer remounting for another member) — but not on every
  // render, or they would jump about while a sticker is being edited. Only the
  // spots are held; each sticker's own look is read live.
  const spots = useMemo(() => deal(live.length), [live.length]);

  if (!live.length) return null;

  const lane = (side: Side) =>
    live.map((s, i) => (spots[i]?.side === side ? sticker(s, i, spots[i]) : null));

  return (
    <div
      // Lanes either side of a spacer the width of the body column. The spacer
      // is allowed to shrink so the lanes can keep their minimum, which is what
      // gives a sticker somewhere to sit on a screen narrower than the body.
      className="pointer-events-none absolute inset-0 z-20 flex overflow-hidden"
    >
      <div className="relative min-w-11 flex-1 sm:min-w-[4.5rem]">{lane("left")}</div>
      <div className="w-full max-w-md sm:max-w-site" aria-hidden />
      <div className="relative min-w-11 flex-1 sm:min-w-[4.5rem]">{lane("right")}</div>

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

  function sticker(s: Sticker, i: number, { side, topPct, acrossPct }: Spot) {
    const size = s.size ?? 18;
    const src = stickerSrc(s.img);
    // A share of the reference width, held to a share of the screen: a phone has
    // no margin to speak of, so a sticker there has to be small enough that
    // overhanging the card doesn't bury the copy under it.
    const width = `min(${((size / 100) * SIZE_REF_REM).toFixed(3)}rem, ${SIZE_MAX_VW}vw)`;
    // Measured inward from the lane's inner edge — its right on the left of the
    // screen, its left on the right — and capped so a sticker's centre stays far
    // enough inside the screen that none of it is cut off, however narrow the
    // lane. The margin is 0.71 rather than half its width because a tilted square
    // reaches further than a straight one, by up to that much at 45°. Past the cap
    // it hangs over the card, which is where a sticker wants to be anyway.
    const inset = `min(${acrossPct.toFixed(2)}%, calc(100% - ${width} * 0.71))`;
    const outer: CSSProperties = {
      top: `${topPct.toFixed(2)}%`,
      width,
      ...(side === "left"
        ? { right: inset, transform: "translate(50%, -50%)" }
        : { left: inset, transform: "translate(-50%, -50%)" }),
      // Border thickness scales with the sticker, so a small one doesn't end up
      // ringed like a big one (see .gp-sticker).
      ["--sticker-w" as string]: width,
    };
    // The finish is masked by the artwork's alpha, so it never shows through the
    // transparent parts of a PNG or SVG. Only artwork can carry one — an emoji
    // has no image to mask against, so a finish would paint as a block over its
    // whole box.
    const inner: CSSProperties = {
      ...piece(
        `${s.rotate ?? 0}deg`,
        `${(s.rotate ?? 0) - 70}deg`,
        // After the cards, in the order they were added.
        220 + i * 70,
        // The arm reaches the far side first: sweeping left, the right-hand
        // stickers go before the left-hand ones.
        { left: side === "right" ? 0 : 80, right: side === "left" ? 0 : 80 },
        exiting,
        sweepDir,
      ),
      ...(src ? { ["--sticker-mask" as string]: `url("${src}")` } : null),
    };
    const finish = src ? `gp-sticker-${s.finish ?? "plain"}` : "";

    return (
      // Outer element holds the placement, inner the animation: the entrance
      // and the sweep both set `transform`, which would otherwise wipe out the
      // half-width offset that centres a sticker on its spot.
      <div key={i} style={outer} className="absolute">
        <div
          data-gp-piece
          style={inner}
          onClick={
            editMode
              ? (e) => {
                  e.stopPropagation();
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setEditing({
                    index: i,
                    top: Math.min(r.bottom + 8, window.innerHeight - 340),
                    left: Math.max(8, Math.min(r.left, window.innerWidth - 300)),
                  });
                }
              : undefined
          }
          title={editMode ? "Click to edit this sticker" : undefined}
          className={`gp-sticker ${finish} ${exiting ? "gp-sweep" : "gp-emerge"} ${
            editMode ? "pointer-events-auto cursor-pointer" : ""
          }`}
        >
          {src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={src} alt="" draggable={false} className="block h-auto w-full select-none" />
          ) : (
            <span
              style={{ fontSize: width, lineHeight: 1 }}
              className="block select-none whitespace-nowrap"
            >
              {s.emoji || "⭐"}
            </span>
          )}
        </div>
      </div>
    );
  }
}
