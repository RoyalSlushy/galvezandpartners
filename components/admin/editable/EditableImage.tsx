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
  /** Whether a video source autoplays on mount (default true, matching prior
   * behavior). Callers that drive playback manually (e.g. on hover) pass
   * false so the video starts paused. */
  autoPlayVideo?: boolean;
  /** Whether a video source loops (default true). Callers that drive looping
   * manually (e.g. only while hovered) pass false. */
  loopVideo?: boolean;
  /** Exposes the underlying <video> element so a caller can drive playback
   * (play/pause/loop/currentTime) imperatively. No-op for image sources. */
  videoRef?: React.Ref<HTMLVideoElement>;
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
  autoPlayVideo = true,
  loopVideo = true,
  videoRef: externalVideoRef,
}: EditableImageProps) {
  const editMode = useEditMode();
  const admin = useAdmin();
  const reduced = usePrefersReducedMotion();
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const fieldLabel = label ?? labelFor(path);

  // Attaches the internal ref (used by this component's own effects below)
  // and forwards the same node to the caller's ref, if one was passed.
  const setVideoRef = (el: HTMLVideoElement | null) => {
    internalVideoRef.current = el;
    if (typeof externalVideoRef === "function") externalVideoRef(el);
    else if (externalVideoRef) (externalVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
  };

  // Reduced-motion visitors get a still first frame rather than a looping clip
  // (the hook corrects after first paint, so pause any playback that slipped
  // through). Videos are used as backgrounds — the hero especially — so this
  // keeps an autoplaying loop from becoming un-pausable motion (WCAG 2.2.2).
  useEffect(() => {
    const v = internalVideoRef.current;
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
    const v = internalVideoRef.current;
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
        ref={setVideoRef}
        src={src}
        className={className}
        autoPlay={autoPlayVideo && !reduced}
        muted
        loop={loopVideo && !reduced}
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
