"use client";

import { useEffect, useRef } from "react";
import { useAdmin, useEditMode } from "@/components/admin/AdminProvider";
import { isVideoUrl } from "@/lib/adminClient";
import { labelFor } from "@/lib/adminSchema";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

type EditableImageProps = {
  /** Content path of the stored image string, e.g. "team.members.0.photo". */
  path: string;
  /** The stored value (full URL or bare Wix media id) — draft-aware. */
  raw: string;
  /** The resolved URL actually rendered (caller applies its own sizing). */
  src: string;
  alt: string;
  className?: string;
  label?: string;
  /** Playback speed for video sources (1 = normal). Not a real HTML attribute,
   * so it's applied imperatively via a ref effect. */
  playbackRate?: number;
};

/**
 * A CMS-managed <img> (or <video>, when the field holds an uploaded video).
 * Renders exactly as today for visitors; in edit mode it highlights and
 * clicking it opens the visual media picker for this field. Videos play as a
 * muted, looping background so they drop into any image slot seamlessly.
 */
export default function EditableImage({
  path,
  raw,
  src,
  alt,
  className,
  label,
  playbackRate = 1,
}: EditableImageProps) {
  const editMode = useEditMode();
  const admin = useAdmin();
  const reduced = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fieldLabel = label ?? labelFor(path);

  // Reduced-motion visitors get a still first frame rather than a looping clip
  // (the hook corrects after first paint, so pause any playback that slipped
  // through). Videos are used as backgrounds — the hero especially — so this
  // keeps an autoplaying loop from becoming un-pausable motion (WCAG 2.2.2).
  useEffect(() => {
    const v = videoRef.current;
    if (v && reduced) {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* not seekable yet — first frame shows anyway */
      }
    }
  }, [reduced, src]);

  // Apply the playback speed imperatively — browsers can reset it when a new
  // source loads, so re-set it on `loadedmetadata` too, not just on mount.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = playbackRate;
    const onLoaded = () => {
      v.playbackRate = playbackRate;
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [playbackRate, src]);

  const editProps = editMode
    ? {
        "data-gp-editable": "",
        title: `Change ${fieldLabel}`,
        onClickCapture: (e: React.MouseEvent) => {
          // Swallow the click so wrapping <Link> cards don't navigate.
          e.preventDefault();
          e.stopPropagation();
          admin.openImagePicker({ path, raw });
        },
      }
    : null;

  if (isVideoUrl(raw)) {
    return (
      <video
        ref={videoRef}
        src={src}
        className={className}
        autoPlay={!reduced}
        muted
        loop={!reduced}
        playsInline
        preload={reduced ? "metadata" : "auto"}
        // Pause playback in edit mode so clicks target the picker, not controls.
        controls={false}
        aria-label={alt}
        {...editProps}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} {...editProps} />;
}
