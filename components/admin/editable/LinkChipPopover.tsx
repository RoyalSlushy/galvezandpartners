"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "@/components/admin/AdminProvider";
import { getByPath } from "@/lib/adminClient";
import { templateFor } from "@/lib/adminSchema";
import { LinkIcon } from "@/components/admin/icons";

export type LinkSpec = {
  /** Content path of the link value, e.g. "home.hero.ctaHref". */
  path: string;
  /** Current value (draft-aware). */
  value: string;
  /** "slug" values get slugified and empty means "no link" (null). */
  kind?: "href" | "slug";
  /** Offer to stage a case study for a slug that has no matching study. */
  createCaseStudy?: boolean;
};

/**
 * Small chip rendered next to link-ish editable text in edit mode. Clicking it
 * opens a popover to change where the element points (the destination has no
 * visible text of its own, so it can't be edited in place).
 */
export default function LinkChip({ link }: { link: LinkSpec }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const chipRef = useRef<HTMLButtonElement>(null);

  const display = link.value
    ? link.value.length > 24
      ? `${link.value.slice(0, 24)}…`
      : link.value
    : link.kind === "slug"
      ? "no page"
      : "no link";

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        title={link.kind === "slug" ? "Edit case study link" : "Edit link destination"}
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = chipRef.current?.getBoundingClientRect();
          if (rect) {
            setPos({
              top: Math.min(rect.bottom + 8, window.innerHeight - 180),
              left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
            });
          }
          setOpen(true);
        }}
        className="relative z-30 ml-2 inline-flex max-w-[12rem] items-center gap-1 truncate border border-gold/40 bg-navy-soft/90 px-2 py-0.5 align-middle font-body text-[10px] normal-case tracking-normal text-gold transition hover:border-gold"
      >
        <LinkIcon className="h-3 w-3 shrink-0" />
        <span className="truncate">{display}</span>
      </button>
      {open && pos && (
        <LinkPopover link={link} pos={pos} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function LinkPopover({
  link,
  pos,
  onClose,
}: {
  link: LinkSpec;
  pos: { top: number; left: number };
  onClose: () => void;
}) {
  const admin = useAdmin();
  const [text, setText] = useState(link.value);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const isSlug = link.kind === "slug";

  function commit() {
    if (isSlug) {
      const slug = slugify(text);
      admin.setValue(link.path, slug || null);
    } else {
      admin.setValue(link.path, text.trim());
    }
    onClose();
  }

  const studies = (getByPath(admin.drafts, "case_studies.studies") ?? []) as { slug?: string }[];
  const slug = isSlug ? slugify(text) : "";
  const offerCreate =
    Boolean(link.createCaseStudy) && isSlug && slug.length > 0 && !studies.some((s) => s.slug === slug);

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Edit link"
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[85] w-72 border border-white/10 bg-navy-soft p-4 shadow-2xl"
    >
      <p className="font-heading text-xs uppercase tracking-widest text-white/50">
        {isSlug ? "Case study slug" : "Link destination"}
      </p>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        placeholder={isSlug ? "e.g. la-bombita (empty = no page)" : "e.g. /contact-us or https://…"}
        className="mt-2 w-full border border-white/10 bg-navy px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-gold"
      />
      {isSlug && (
        <p className="mt-2 text-[11px] leading-snug text-white/50">
          Links the card to /case-study/{slug || "…"}. Clear it to unlink.
        </p>
      )}
      {offerCreate && (
        <button
          type="button"
          onClick={() => {
            const item = {
              ...(templateFor("case_studies.studies") as Record<string, unknown>),
              slug,
            };
            admin.listOp("case_studies.studies", {
              type: "insert",
              index: Number.MAX_SAFE_INTEGER,
              item,
            });
            admin.setValue(link.path, slug);
            admin.notify("Case study staged — save, then open its page to edit it");
            onClose();
          }}
          className="mt-3 w-full border border-dashed border-gold/50 px-3 py-2 text-xs text-gold transition hover:border-gold hover:bg-gold/10"
        >
          + Create case study page for “{slug}”
        </button>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-white/60 transition hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={commit}
          className="bg-gold px-3 py-1.5 font-heading text-xs text-navy transition hover:bg-cream"
        >
          Apply
        </button>
      </div>
    </div>,
    document.body,
  );
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
