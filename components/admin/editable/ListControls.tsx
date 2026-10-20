"use client";

import { useAdmin, useEditMode } from "@/components/admin/AdminProvider";
import { templateFor } from "@/lib/adminSchema";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";

/**
 * Edit-mode-only overlay controls for one item of an editable list:
 * move up/down, add another after it, delete. Render inside a container that
 * gets `relative` while edit mode is on.
 */
export default function ListControls({
  listPath,
  index,
  count,
  label,
  className = "-top-3 right-2",
  jumps,
}: {
  listPath: string;
  index: number;
  count: number;
  /** Singular item name for tooltips/confirms, e.g. "team member". */
  label: string;
  /** Positioning classes (absolute offsets) for the chip bar. */
  className?: string;
  /** Extra "jump" sizes (e.g. [5, 20]) shown as ±N buttons for long lists. */
  jumps?: number[];
}) {
  const editMode = useEditMode();
  const admin = useAdmin();
  if (!editMode) return null;

  const act = (e: React.MouseEvent, fn: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  // Clamp so a big jump near either end lands on the first/last slot.
  const moveBy = (delta: number) => {
    const to = Math.max(0, Math.min(count - 1, index + delta));
    if (to !== index) admin.listOp(listPath, { type: "move", from: index, to });
  };

  return (
    <div
      className={`absolute z-20 flex items-center gap-0.5 border border-white/15 bg-navy-soft/95 p-0.5 shadow-lg backdrop-blur ${className}`}
      onClick={(e) => {
        // Catch clicks on the bar itself (buttons stop their own) so a
        // wrapping <Link> card never navigates.
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <ControlButton
        label={`Move ${label} up`}
        disabled={index === 0}
        onClick={(e) => act(e, () => admin.listOp(listPath, { type: "move", from: index, to: index - 1 }))}
      >
        <ArrowUpIcon className="h-3.5 w-3.5" />
      </ControlButton>
      <ControlButton
        label={`Move ${label} down`}
        disabled={index === count - 1}
        onClick={(e) => act(e, () => admin.listOp(listPath, { type: "move", from: index, to: index + 1 }))}
      >
        <ArrowDownIcon className="h-3.5 w-3.5" />
      </ControlButton>
      {jumps?.map((n) => (
        <span key={n} className="flex items-center">
          <ControlButton
            label={`Move ${label} up ${n} spaces`}
            disabled={index === 0}
            wide
            onClick={(e) => act(e, () => moveBy(-n))}
          >
            ↑{n}
          </ControlButton>
          <ControlButton
            label={`Move ${label} down ${n} spaces`}
            disabled={index === count - 1}
            wide
            onClick={(e) => act(e, () => moveBy(n))}
          >
            ↓{n}
          </ControlButton>
        </span>
      ))}
      <ControlButton
        label={`Add ${label} after this one`}
        onClick={(e) =>
          act(e, () =>
            admin.listOp(listPath, { type: "insert", index: index + 1, item: templateFor(listPath) }),
          )
        }
      >
        <PlusIcon className="h-3.5 w-3.5" />
      </ControlButton>
      <ControlButton
        label={`Delete this ${label}`}
        danger
        onClick={(e) =>
          act(e, () => {
            if (window.confirm(`Delete this ${label}? (Takes effect when you save.)`)) {
              admin.listOp(listPath, { type: "remove", index });
            }
          })
        }
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  label,
  disabled,
  danger,
  wide,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  wide?: boolean;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-6 ${wide ? "min-w-6 px-1 text-[10px] font-semibold tabular-nums" : "w-6"} items-center justify-center transition ${
        danger ? "text-red-400 hover:bg-red-400/15" : "text-white/75 hover:bg-white/10 hover:text-gold"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

/** Trailing "+ add" chip for an editable list (covers the empty-list case). */
export function AddChip({
  listPath,
  label,
  className = "",
}: {
  listPath: string;
  label: string;
  className?: string;
  /** Extra "jump" sizes (e.g. [5, 20]) shown as ±N buttons for long lists. */
  jumps?: number[];
}) {
  const editMode = useEditMode();
  const admin = useAdmin();
  if (!editMode) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        admin.listOp(listPath, { type: "insert", index: Number.MAX_SAFE_INTEGER, item: templateFor(listPath) });
      }}
      className={`border border-dashed border-gold/50 px-4 py-2 font-heading text-sm text-gold transition hover:border-gold hover:bg-gold/10 ${className}`}
    >
      + Add {label}
    </button>
  );
}
