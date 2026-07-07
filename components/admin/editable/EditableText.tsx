"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useAdmin, useEditMode } from "@/components/admin/AdminProvider";
import { labelFor } from "@/lib/adminSchema";
import LinkChip, { type LinkSpec } from "./LinkChipPopover";
import { normalizeText, placeCaret, usePlaintextSupport } from "./editingUtils";

type EditableTextProps = {
  /** Content path, e.g. "home.hero.headline". */
  path: string;
  /** The value currently rendered (draft-aware — pass the useCmsValue result). */
  value: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  /** Hover/status label; defaults to a label derived from the path. */
  label?: string;
  /** Allow Shift+Enter newlines (render the field with whitespace-pre-line). */
  multiline?: boolean;
  /** Attach a link-editing chip (e.g. a CTA's href or a work item's slug). */
  link?: LinkSpec;
} & Omit<HTMLAttributes<HTMLElement>, "children"> & { href?: string; target?: string; rel?: string };

/**
 * Inline-editable text. Renders exactly `<Tag className>{value}</Tag>` for
 * visitors; in admin edit mode the element highlights, and clicking it turns
 * it into a plain-text contentEditable. Enter commits to the pending edit set,
 * Shift+Enter inserts a newline (multiline fields only), Escape cancels.
 */
export default function EditableText({
  path,
  value,
  as = "span",
  className,
  label,
  multiline = false,
  link,
  ...rest
}: EditableTextProps) {
  const editMode = useEditMode();
  const admin = useAdmin();
  const [editing, setEditing] = useState(false);
  const elRef = useRef<HTMLElement | null>(null);
  const initialRef = useRef("");
  const clickPointRef = useRef<{ x: number; y: number } | null>(null);
  // Guards against double commits: Enter finishes, then the blur it causes
  // (and any later blur before re-render) must be a no-op.
  const doneRef = useRef(true);

  const fieldLabel = label ?? labelFor(path);
  const supportsPlaintext = usePlaintextSupport();

  // Once editing starts, React must never rewrite the node the user is typing
  // in: keep rendering the frozen activation-time value until editing ends.
  const display = editing ? initialRef.current : value;

  useEffect(() => {
    if (!editing) return;
    const el = elRef.current;
    if (!el) return;
    el.focus();
    placeCaret(el, clickPointRef.current);
    clickPointRef.current = null;
    admin.setEditingInfo({ label: fieldLabel, multiline });
    return () => admin.setEditingInfo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Leaving edit mode while an edit is open: cancel it.
  useEffect(() => {
    if (!editMode && editing) {
      doneRef.current = true;
      setEditing(false);
    }
  }, [editMode, editing]);

  function finish(commit: boolean) {
    if (doneRef.current) return;
    doneRef.current = true;
    const el = elRef.current;
    if (!el) return;
    const raw = el.innerText ?? "";
    const text = commit ? normalizeText(raw, multiline) : initialRef.current;
    // Normalize the DOM ourselves: the browser may have left <br>/<div> litter
    // that React's text diff wouldn't clean up when strings compare equal.
    el.textContent = text;
    setEditing(false);
    if (commit && text !== initialRef.current) admin.setValue(path, text);
    el.blur();
  }

  const editProps = editMode
    ? {
        "data-gp-editable": "",
        title: editing ? undefined : `Edit ${fieldLabel}`,
        onClickCapture: (e: React.MouseEvent) => {
          // Swallow clicks so wrapping <Link>/<button> ancestors don't act.
          e.preventDefault();
          e.stopPropagation();
          if (!editing) {
            initialRef.current = value;
            clickPointRef.current = { x: e.clientX, y: e.clientY };
            doneRef.current = false;
            setEditing(true);
          }
        },
        ...(editing
          ? {
              "data-gp-editing": "",
              contentEditable: supportsPlaintext ? ("plaintext-only" as const) : true,
              suppressContentEditableWarning: true,
              spellCheck: true,
              onPointerDownCapture: (e: React.PointerEvent) => {
                // Caret drags must not start carousel swipes.
                e.stopPropagation();
              },
              onKeyDown: (e: React.KeyboardEvent) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  finish(true);
                } else if (e.key === "Enter" && e.shiftKey) {
                  if (!multiline) {
                    e.preventDefault();
                  } else if (!supportsPlaintext) {
                    e.preventDefault();
                    document.execCommand("insertLineBreak");
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  finish(false);
                }
              },
              onPaste: (e: React.ClipboardEvent) => {
                e.preventDefault();
                let text = e.clipboardData.getData("text/plain");
                if (!multiline) text = text.replace(/\s*\n+\s*/g, " ");
                document.execCommand("insertText", false, text);
              },
              onBlur: () => finish(true),
            }
          : null),
      }
    : null;

  const children: ReactNode = display;
  const mergedClassName = [className, editing && multiline ? "whitespace-pre-line" : null]
    .filter(Boolean)
    .join(" ") || undefined;

  const node = createElement(
    as,
    {
      ...rest,
      ...editProps,
      ref: elRef,
      className: mergedClassName,
    },
    children,
  );

  if (editMode && link) {
    return (
      <>
        {node}
        <LinkChip link={link} />
      </>
    );
  }
  return node;
}
