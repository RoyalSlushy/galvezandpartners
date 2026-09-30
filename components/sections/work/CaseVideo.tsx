"use client";

import { useEffect, useRef, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { isVideoUrl, resolveImage } from "@/lib/adminClient";

/** How long a case has to have been the snapped one, showing its thumbnail,
 * before its video takes over (ms). */
export const VIDEO_DELAY_MS = 1000;

/**
 * A case card's video (work.items.*.video), laid over its thumbnail — shared
 * by the homepage's featured work and the Our Works cases. Render it inside
 * the card's frame (a positioned, clipped box); it fills it.
 *
 * Only while `playing` (the case is the snapped one, on screen, visitors with
 * motion on) is the video mounted — so the other cards cost nothing — and it
 * starts VIDEO_DELAY_MS after that, fading in over the thumbnail once it is
 * actually playing. It plays once through: at its end `onEnded` is called (the
 * row moves on to the next case). Losing the snap fades it back out to the
 * thumbnail and lets it go.
 */
export function CaseVideo({
  video: raw,
  playing,
  onEnded,
}: {
  video?: string;
  playing: boolean;
  onEnded?: () => void;
}) {
  const video = raw && isVideoUrl(raw) ? resolveImage(raw) : "";
  const want = !!video && playing;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useEffect(() => {
    if (want && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (want) {
      let live = true;
      setMounted(true);
      const timer = setTimeout(() => {
        const v = videoRef.current;
        if (!v || !live) return;
        try {
          v.currentTime = 0;
        } catch {
          /* not seekable yet — it starts from the top anyway */
        }
        v.play()
          .then(() => {
            if (live) setShown(true);
          })
          .catch(() => {});
      }, VIDEO_DELAY_MS);
      return () => {
        live = false;
        clearTimeout(timer);
      };
    }
    setShown(false);
    videoRef.current?.pause();
    // Let the fade out finish before the element goes.
    const timer = setTimeout(() => setMounted(false), 600);
    return () => clearTimeout(timer);
  }, [want]);

  if (!mounted || !video) return null;
  return (
    <video
      ref={videoRef}
      src={video}
      muted
      playsInline
      preload="auto"
      aria-hidden
      onEnded={() => endedRef.current?.()}
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

/** Edit mode: the way into a case's video field (a video has no slot of its
 * own on the card to click), and a way to clear it. Sits in the card's
 * top-left corner. */
export function VideoChip({ index, video }: { index: number; video: string }) {
  const admin = useAdmin();
  const path = `work.items.${index}.video`;
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <div className="absolute left-2 top-2 z-20 flex items-center gap-1" onClick={stop}>
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          admin.openImagePicker({ path, raw: video });
        }}
        className="border border-dashed border-white/30 bg-navy/80 px-3 py-1 font-heading text-xs text-white/70 transition hover:border-gold/60 hover:text-gold"
      >
        {video ? "video" : "add video"}
      </button>
      {video && (
        <button
          type="button"
          aria-label="Remove video"
          title="Remove video"
          onClick={(e) => {
            stop(e);
            admin.setValue(path, "");
          }}
          className="border border-white/20 bg-navy/80 px-2 py-1 font-heading text-xs text-white/60 transition hover:border-red-400/60 hover:text-red-300"
        >
          ✕
        </button>
      )}
    </div>
  );
}
