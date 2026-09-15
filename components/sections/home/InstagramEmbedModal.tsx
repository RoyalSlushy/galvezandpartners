"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/components/i18n/LocaleProvider";

/**
 * Lightbox holding Instagram's own post embed.
 *
 * The strip's cards stay the site's tilted squares; opening one frames the
 * real post here instead, so the visitor gets Instagram's live rendering (its
 * current caption, its video, its like count) without Instagram's white card
 * chrome landing in the middle of the design — and only one third-party frame
 * is ever loaded, on demand, rather than one per card on the marquee.
 *
 * The frame can still fail — a privacy blocker or a deleted post leaves it
 * blank — so the post's own link is always present underneath as the way out.
 *
 * Dialog behavior follows the team modal: focus moves in on open and back to
 * the opener on close, Escape and a backdrop click close, Tab cycles inside.
 */
export default function InstagramEmbedModal({
  embedUrl,
  postUrl,
  caption,
  onClose,
}: {
  embedUrl: string;
  postUrl: string;
  caption?: string;
  onClose: () => void;
}) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Focus the close button on open; hand focus back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      // The iframe's own contents belong to Instagram and are outside our
      // cycle; these are the controls this dialog owns.
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('button, a[href], iframe, [tabindex]:not([tabindex="-1"])'),
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portaled to the body: the homepage stacks its sections inside a z-10
  // wrapper, which would otherwise cap where this dialog can paint.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("Instagram post")} className="fixed inset-0 z-[60]">
      <div aria-hidden className="absolute inset-0 bg-black/75" />
      {/* The click-out layer is this one, not the backdrop beneath it: it spans
          the viewport and sits on top, so it is what a click outside the panel
          actually lands on. */}
      <div onClick={onClose} className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          className="relative flex w-full max-w-[420px] flex-col"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className="self-end p-2 font-heading text-sm uppercase tracking-widest text-white/80 transition hover:text-gold"
          >
            {t("Close")}
          </button>
          <div className="relative h-[min(78svh,640px)] w-full overflow-hidden bg-white">
            {!loaded && (
              <p className="absolute inset-0 flex items-center justify-center font-body text-sm text-navy/50">
                {t("Loading…")}
              </p>
            )}
            <iframe
              src={embedUrl}
              title={caption || t("Instagram post")}
              onLoad={() => setLoaded(true)}
              scrolling="no"
              allowFullScreen
              className="relative h-full w-full border-0"
            />
          </div>
          {/* Always reachable, so a blocked or removed embed is never a dead end. */}
          <a
            href={postUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 self-center font-heading text-sm uppercase tracking-widest text-gold transition hover:text-white"
          >
            {t("Open on Instagram")}
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
