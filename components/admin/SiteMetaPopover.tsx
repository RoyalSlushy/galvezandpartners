"use client";

import { useEffect, useRef } from "react";
import { useAdmin, useCmsValue } from "./AdminProvider";
import EditableText from "./editable/EditableText";
import { SpinnerIcon } from "./icons";
import { faviconSrc } from "@/lib/adminClient";

/**
 * Popover for the site fields that have no visible spot on the page:
 * site name, brand, the meta description, and the favicon (site.favicon — the
 * browser-tab icon and the mark the page-load veil breathes). Rows use the same click-to-edit
 * interaction as the rest of the site.
 */
export default function SiteMetaPopover({ onClose }: { onClose: () => void }) {
  const admin = useAdmin();
  const cardRef = useRef<HTMLDivElement>(null);

  // These fields are draft edits like any other — make sure a session is live.
  useEffect(() => {
    if (!admin.editMode && !admin.startingEdit) void admin.toggleEditMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [onClose]);

  const ready = admin.editMode && admin.drafts;
  const name = useCmsValue<string>("site.site.name", "");
  const brand = useCmsValue<string>("site.site.brand", "");
  const tagline = useCmsValue<string>("site.tagline", "");
  const description = useCmsValue<string>("site.site.description", "");
  const favicon = useCmsValue<string>("site.favicon", "");

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Site name and description"
      className="absolute bottom-full right-0 mb-3 w-80 border border-white/10 bg-navy-soft p-5 shadow-2xl"
    >
      <p className="font-heading text-xs uppercase tracking-widest text-white/50">
        Site name &amp; description
      </p>
      <p className="mt-1 text-[11px] leading-snug text-white/40">
        Used in the browser tab and search results. Click a value to edit it.
      </p>
      {!ready ? (
        <div className="flex items-center justify-center py-8 text-white/50">
          <SpinnerIcon className="h-5 w-5" />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <MetaRow label="Site name">
            <EditableText path="site.site.name" value={name} as="p" className="text-sm text-white" />
          </MetaRow>
          <MetaRow label="Brand">
            <EditableText path="site.site.brand" value={brand} as="p" className="text-sm text-white" />
          </MetaRow>
          <MetaRow label="Tagline">
            <EditableText path="site.tagline" value={tagline} as="p" className="text-sm text-white" />
          </MetaRow>
          <MetaRow label="Meta description">
            <EditableText
              path="site.site.description"
              value={description}
              as="p"
              multiline
              className="whitespace-pre-line text-sm leading-snug text-white/85"
            />
          </MetaRow>
          <MetaRow label="Favicon">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={faviconSrc(favicon)}
                alt=""
                className="h-10 w-10 shrink-0 border border-white/10 bg-navy object-contain p-1"
              />
              <button
                type="button"
                onClick={() => admin.openImagePicker({ path: "site.favicon", raw: favicon })}
                className="border border-dashed border-white/30 px-3 py-1 font-heading text-xs text-white/70 transition hover:border-gold/60 hover:text-gold"
              >
                {favicon ? "change" : "upload"}
              </button>
              {favicon && (
                <button
                  type="button"
                  onClick={() => admin.setValue("site.favicon", "")}
                  className="font-heading text-xs text-white/50 transition hover:text-gold"
                >
                  use default
                </button>
              )}
            </div>
            <span className="mt-1 block text-[11px] leading-snug text-white/40">
              A square image (SVG or PNG, 256px or larger) works best.
            </span>
          </MetaRow>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block font-heading text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </span>
      {children}
    </div>
  );
}
