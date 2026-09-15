"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "@/components/admin/AdminProvider";
import { getByPath } from "@/lib/adminClient";
import { templateFor } from "@/lib/adminSchema";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";

const ICONS = ["facebook", "instagram", "linkedin", "tiktok"] as const;

type Social = { label: string; href: string; icon: (typeof ICONS)[number] };

/**
 * Popover for one social link: label, URL, icon choice, and list actions.
 * Social icons are too small for on-page overlay controls, so everything for
 * them lives here.
 */
export default function SocialEditPopover({
  basePath,
  index,
  pos,
  onClose,
}: {
  basePath: string;
  index: number;
  pos: { top: number; left: number };
  onClose: () => void;
}) {
  const admin = useAdmin();
  const cardRef = useRef<HTMLDivElement>(null);
  const current = (getByPath(admin.drafts, `${basePath}.${index}`) ?? {
    label: "",
    href: "",
    icon: "instagram",
  }) as Social;
  const [label, setLabel] = useState(current.label);
  const [href, setHref] = useState(current.href);
  const count = ((getByPath(admin.drafts, basePath) ?? []) as unknown[]).length;

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

  function commit() {
    admin.setValue(`${basePath}.${index}`, {
      ...current,
      label: label.trim() || current.label,
      href: href.trim(),
    });
    onClose();
  }

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Edit social link"
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[85] w-72 border border-white/10 bg-navy-soft p-4 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <p className="font-heading text-xs uppercase tracking-widest text-white/50">Social link</p>
        <div className="flex items-center gap-0.5">
          <MiniButton
            label="Move left"
            disabled={index === 0}
            onClick={() => {
              admin.listOp(basePath, { type: "move", from: index, to: index - 1 });
              onClose();
            }}
          >
            <ArrowUpIcon className="h-3.5 w-3.5 -rotate-90" />
          </MiniButton>
          <MiniButton
            label="Move right"
            disabled={index === count - 1}
            onClick={() => {
              admin.listOp(basePath, { type: "move", from: index, to: index + 1 });
              onClose();
            }}
          >
            <ArrowDownIcon className="h-3.5 w-3.5 -rotate-90" />
          </MiniButton>
          <MiniButton
            label="Add social link"
            onClick={() => {
              admin.listOp(basePath, {
                type: "insert",
                index: index + 1,
                item: templateFor(basePath),
              });
              onClose();
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </MiniButton>
          <MiniButton
            label="Remove this social link"
            danger
            onClick={() => {
              if (window.confirm("Remove this social link? (Takes effect when you save.)")) {
                admin.listOp(basePath, { type: "remove", index });
                onClose();
              }
            }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </MiniButton>
        </div>
      </div>

      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
        }}
        placeholder="Label (e.g. Instagram)"
        className="mt-3 w-full border border-white/10 bg-navy px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-gold"
      />
      <input
        value={href}
        onChange={(e) => setHref(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
        }}
        placeholder="https://…"
        className="mt-2 w-full border border-white/10 bg-navy px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-gold"
      />

      <div className="mt-3 flex items-center gap-1.5">
        {ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            title={icon}
            aria-pressed={current.icon === icon}
            onClick={() => admin.setValue(`${basePath}.${index}.icon`, icon)}
            className={`border px-2.5 py-1.5 text-xs capitalize transition ${
              current.icon === icon
                ? "border-gold bg-gold/15 text-gold"
                : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

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

function MiniButton({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center transition ${
        danger ? "text-red-400 hover:bg-red-400/15" : "text-white/70 hover:bg-white/10 hover:text-gold"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}
