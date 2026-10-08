"use client";

import { createPortal } from "react-dom";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { manifestoStyleMeta, type ManifestoStyleId } from "./styles";

/**
 * The bar shown while an admin previews a manifesto style: which style is
 * playing, a way to play it again from the top, and the way back to editing.
 * Fixed to the top of the screen so it stays in reach through a scroll-driven
 * style, and portalled so nothing on the page can clip it.
 */
export default function PreviewBar({
  style,
  onReplay,
  onDone,
}: {
  style: ManifestoStyleId;
  onReplay: () => void;
  onDone: () => void;
}) {
  const meta = manifestoStyleMeta(style);
  const off = useMotionOff();
  const hint = off
    ? "Motion is off on this device, so it holds still"
    : meta.cue.startsWith("Scroll")
      ? "Scroll to play it"
      : "As visitors will see it";

  return createPortal(
    <div
      role="status"
      aria-label={`Previewing the ${meta.name} manifesto style`}
      className="fixed left-1/2 top-3 z-[65] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1 border border-gold/40 bg-navy-soft/95 p-1 pl-3 shadow-2xl shadow-black/50 backdrop-blur"
    >
      <span className="hidden font-heading text-[10px] uppercase tracking-widest text-white/50 min-[420px]:inline">
        Preview
      </span>
      <span className="ml-1 shrink-0 font-heading text-xs text-gold">{meta.name}</span>
      <span className="ml-1 hidden truncate text-[11px] text-white/45 sm:inline">· {hint}</span>
      <span className="mx-1.5 h-5 w-px bg-white/10" aria-hidden />
      <button
        type="button"
        onClick={onReplay}
        aria-label="Replay"
        className="flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 font-heading text-[10px] uppercase tracking-widest text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-3.5 w-3.5"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        <span className="hidden min-[420px]:inline">Replay</span>
      </button>
      <button
        type="button"
        onClick={onDone}
        className="shrink-0 bg-gold px-3 py-1.5 font-heading text-[10px] uppercase tracking-widest text-navy transition hover:bg-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Back to editing
      </button>
    </div>,
    document.body,
  );
}
