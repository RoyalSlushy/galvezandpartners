"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "@/components/admin/AdminProvider";
import { getByPath } from "@/lib/adminClient";
import { templateFor } from "@/lib/adminSchema";
import { PlusIcon, TrashIcon } from "@/components/admin/icons";
import { STICKER_FINISHES, type Sticker } from "@/content/team";

/**
 * Edit-mode popover for one sticker: its artwork (an uploaded image or an
 * emoji), which card it is stuck to, size, rotation and finish. Position is
 * set by dragging the sticker itself, so it isn't repeated here.
 */
export default function StickerPopover({
  listPath,
  index,
  pos,
  onClose,
}: {
  listPath: string;
  index: number;
  pos: { top: number; left: number };
  onClose: () => void;
}) {
  const admin = useAdmin();
  const cardRef = useRef<HTMLDivElement>(null);
  const sticker = (getByPath(admin.drafts, `${listPath}.${index}`) ?? {}) as Partial<Sticker>;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Beat the profile card's own Escape handler.
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

  const set = (key: keyof Sticker, value: unknown) =>
    admin.setValue(`${listPath}.${index}.${key}`, value);

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Edit sticker"
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[85] w-72 border border-white/10 bg-navy-soft p-4 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <p className="font-heading text-xs uppercase tracking-widest text-white/50">Sticker</p>
        <div className="flex items-center gap-0.5">
          <MiniButton
            label="Add another sticker"
            onClick={() => {
              admin.listOp(listPath, {
                type: "insert",
                index: index + 1,
                item: templateFor(listPath),
              });
              onClose();
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </MiniButton>
          <MiniButton
            label="Remove this sticker"
            danger
            onClick={() => {
              if (window.confirm("Remove this sticker? (Takes effect when you save.)")) {
                admin.listOp(listPath, { type: "remove", index });
                onClose();
              }
            }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </MiniButton>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() =>
            admin.openImagePicker({ path: `${listPath}.${index}.img`, raw: sticker.img ?? "" })
          }
          className="flex-1 border border-white/10 px-3 py-2 text-xs text-white/80 transition hover:border-gold hover:text-gold"
        >
          {sticker.img ? "Change image" : "Choose image"}
        </button>
        {sticker.img && (
          <button
            type="button"
            onClick={() => set("img", "")}
            title="Use the emoji instead"
            className="border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {!sticker.img && (
        <label className="mt-2 block">
          <span className="text-[10px] uppercase tracking-widest text-white/40">Emoji</span>
          <input
            value={sticker.emoji ?? ""}
            onChange={(e) => set("emoji", e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="⭐"
            className="mt-1 w-full border border-white/10 bg-navy px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-gold"
          />
        </label>
      )}

      <Row label="Card">
        {(["photo", "details"] as const).map((c) => (
          <Chip key={c} on={(sticker.card ?? "details") === c} onClick={() => set("card", c)}>
            {c === "photo" ? "Photo" : "Details"}
          </Chip>
        ))}
      </Row>

      <Slider
        label="Size"
        value={sticker.size ?? 18}
        min={4}
        max={60}
        suffix="%"
        onChange={(v) => set("size", v)}
      />
      <Slider
        label="Rotation"
        value={sticker.rotate ?? 0}
        min={-180}
        max={180}
        suffix="°"
        onChange={(v) => set("rotate", v)}
      />

      <Row label="Finish">
        {STICKER_FINISHES.map((f) => (
          <Chip key={f} on={(sticker.finish ?? "plain") === f} onClick={() => set("finish", f)}>
            {f}
          </Chip>
        ))}
      </Row>

      <p className="mt-3 text-[10px] leading-relaxed text-white/35">
        Drag the sticker to move it. It can hang over the card&apos;s margin but is clipped at
        the border.
      </p>
    </div>,
    document.body,
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`border px-2.5 py-1 text-xs capitalize transition ${
        on
          ? "border-gold bg-gold/15 text-gold"
          : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mt-3 block">
      <span className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
        {label}
        <span className="text-white/60">
          {Math.round(value)}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={(e) => e.stopPropagation()}
        className="mt-1 w-full accent-gold"
      />
    </label>
  );
}

function MiniButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center transition ${
        danger ? "text-red-400 hover:bg-red-400/15" : "text-white/70 hover:bg-white/10 hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}
