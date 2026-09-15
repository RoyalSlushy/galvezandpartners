"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "@/components/admin/AdminProvider";
import { getByPath } from "@/lib/adminClient";
import { templateFor } from "@/lib/adminSchema";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";
import { FACT_PROMPTS } from "@/content/team";

/**
 * Edit-mode popover for one profile-card fact: pick its prompt from the shared
 * FACT_PROMPTS library, and reorder / add / remove the line. The answer itself
 * stays inline-editable on the card, so this only owns the question.
 */
export default function PromptPicker({
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
  const facts = (getByPath(admin.drafts, listPath) ?? []) as { prompt?: string }[];
  const current = facts[index]?.prompt ?? "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Beat the profile card's own Escape handler — closing the picker
        // shouldn't also close the card behind it.
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

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Choose a question"
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[85] w-72 border border-white/10 bg-navy-soft p-4 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <p className="font-heading text-xs uppercase tracking-widest text-white/50">Question</p>
        <div className="flex items-center gap-0.5">
          <MiniButton
            label="Move this line up"
            disabled={index === 0}
            onClick={() => {
              admin.listOp(listPath, { type: "move", from: index, to: index - 1 });
              onClose();
            }}
          >
            <ArrowUpIcon className="h-3.5 w-3.5" />
          </MiniButton>
          <MiniButton
            label="Move this line down"
            disabled={index === facts.length - 1}
            onClick={() => {
              admin.listOp(listPath, { type: "move", from: index, to: index + 1 });
              onClose();
            }}
          >
            <ArrowDownIcon className="h-3.5 w-3.5" />
          </MiniButton>
          <MiniButton
            label="Add another line"
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
            label="Remove this line"
            danger
            onClick={() => {
              if (window.confirm("Remove this line? (Takes effect when you save.)")) {
                admin.listOp(listPath, { type: "remove", index });
                onClose();
              }
            }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </MiniButton>
        </div>
      </div>

      <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
        {FACT_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            aria-pressed={current === prompt}
            onClick={() => {
              admin.setValue(`${listPath}.${index}.prompt`, prompt);
              onClose();
            }}
            className={`block w-full border px-3 py-1.5 text-left text-xs transition ${
              current === prompt
                ? "border-gold bg-gold/15 text-gold"
                : "border-transparent text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            {prompt}
          </button>
        ))}
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
