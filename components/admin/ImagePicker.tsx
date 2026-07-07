"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "./AdminProvider";
import {
  collectImages,
  isVideoUrl,
  listUploadedImages,
  resolveImage,
  uploadImage,
} from "@/lib/adminClient";
import { labelFor } from "@/lib/adminSchema";
import { SpinnerIcon, UploadIcon, XIcon } from "./icons";

/**
 * Visual image chooser: shows the current image, accepts drag-drop/file
 * uploads (stored in the site-images bucket), offers every image already used
 * on the site plus previously uploaded ones, and — as a fallback — a paste-URL
 * row with live preview. Applying stages the change like any other edit.
 */
export default function ImagePicker() {
  const admin = useAdmin();
  const picker = admin.picker!;
  const [selected, setSelected] = useState(picker.raw);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [urlText, setUrlText] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Body scroll lock + Escape to close (same pattern as MobileMenu).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        admin.closeImagePicker();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Images already uploaded to the bucket (best effort — the gallery of
  // in-use images below works even if this call fails).
  useEffect(() => {
    let alive = true;
    listUploadedImages(admin.password)
      .then((urls) => {
        if (alive) setUploaded(urls);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gallery = useMemo(() => {
    const used = collectImages(admin.drafts ?? {});
    const seen = new Set(used.map((i) => i.raw));
    const extra = uploaded
      .filter((url) => !seen.has(url))
      .map((url) => ({ raw: url, previewUrl: url }));
    return [...extra, ...used];
  }, [admin.drafts, uploaded]);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    try {
      const url = await uploadImage(admin.password, file);
      setUploaded((prev) => [url, ...prev]);
      setSelected(url);
      setPreviewError(false);
      admin.notify(file.type.startsWith("video/") ? "Video uploaded" : "Image uploaded");
    } catch (err) {
      admin.notify(err instanceof Error ? err.message : "Upload failed", "err");
    } finally {
      setUploading(false);
    }
  }

  function onUrlChange(text: string) {
    setUrlText(text);
    clearTimeout(urlDebounce.current);
    urlDebounce.current = setTimeout(() => {
      const trimmed = text.trim();
      if (trimmed) {
        setSelected(trimmed);
        setPreviewError(false);
      }
    }, 400);
  }

  const changed = selected !== picker.raw && selected.trim().length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-navy/80 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) admin.closeImagePicker();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Change ${labelFor(picker.path)}`}
    >
      <div className="mx-auto my-8 w-[min(42rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-navy-soft p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl text-white">
              Change <span className="text-gold">{labelFor(picker.path)}</span>
            </h2>
            <p className="mt-1 text-xs text-white/50">
              Upload a new image or video, pick one already on the site, or paste a URL.
            </p>
          </div>
          <button
            type="button"
            onClick={admin.closeImagePicker}
            aria-label="Close"
            className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-navy">
          <div className="relative flex max-h-64 min-h-40 items-center justify-center">
            {selected ? (
              isVideoUrl(selected) ? (
                <video
                  key={selected}
                  src={resolveImage(selected, 800, 500)}
                  controls
                  playsInline
                  onError={() => setPreviewError(true)}
                  onLoadedData={() => setPreviewError(false)}
                  className="max-h-64 w-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={selected}
                  src={resolveImage(selected, 800, 500)}
                  alt="Selected"
                  onError={() => setPreviewError(true)}
                  onLoad={() => setPreviewError(false)}
                  className="max-h-64 w-full object-contain"
                />
              )
            ) : (
              <span className="py-14 text-sm text-white/40">No media selected</span>
            )}
            {previewError && (
              <span className="absolute inset-x-0 bottom-0 bg-red-950/90 px-3 py-1.5 text-center text-xs text-red-200">
                This file could not be loaded — check the URL.
              </span>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-3 py-1.5 text-[11px] text-white/40">
            <span>{changed ? "New image (applies when you press Apply)" : "Current image"}</span>
            <span className="max-w-[50%] truncate">{selected}</span>
          </div>
        </div>

        {/* Upload */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            dragOver ? "border-gold bg-gold/10" : "border-white/15 hover:border-gold/60"
          }`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
        >
          {uploading ? (
            <SpinnerIcon className="h-6 w-6 text-gold" />
          ) : (
            <UploadIcon className="h-6 w-6 text-gold" />
          )}
          <p className="text-sm text-white/80">
            {uploading ? "Uploading…" : "Drop an image or video here or click to browse"}
          </p>
          <p className="text-[11px] text-white/40">
            Images (JPG, PNG, WebP, SVG…) up to 5 MB · Videos (MP4, WebM…) up to 40 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Gallery */}
        {gallery.length > 0 && (
          <div className="mt-4">
            <p className="font-heading text-xs uppercase tracking-widest text-white/50">
              Images on this site
            </p>
            <div className="mt-2 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
              {gallery.map((img) => (
                <button
                  key={img.raw}
                  type="button"
                  onClick={() => {
                    setSelected(img.raw);
                    setPreviewError(false);
                  }}
                  className={`group relative aspect-[4/3] overflow-hidden rounded-lg border transition ${
                    selected === img.raw
                      ? "border-gold ring-2 ring-gold"
                      : "border-white/10 hover:border-white/40"
                  }`}
                >
                  {isVideoUrl(img.raw) ? (
                    <>
                      <video
                        src={resolveImage(img.raw, 240, 180)}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-navy/80 px-1 text-[9px] font-heading uppercase tracking-wide text-gold">
                        Video
                      </span>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImage(img.raw, 240, 180)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* URL fallback */}
        <div className="mt-4">
          <p className="font-heading text-xs uppercase tracking-widest text-white/50">
            Or paste an image URL
          </p>
          <input
            value={urlText}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://… (or a Wix media id)"
            className="mt-2 w-full rounded-lg border border-white/10 bg-navy px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-gold"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={admin.closeImagePicker}
            className="rounded-lg px-4 py-2 text-sm text-white/60 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!changed}
            onClick={() => {
              admin.setValue(picker.path, selected.trim());
              admin.closeImagePicker();
            }}
            className="rounded-lg bg-gold px-5 py-2 font-heading text-sm text-navy transition hover:bg-cream disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
