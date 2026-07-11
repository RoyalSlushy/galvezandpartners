"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { useAdmin, useEditMode } from "@/components/admin/AdminProvider";
import { labelFor } from "@/lib/adminSchema";
import { placeCaret, usePlaintextSupport } from "./editingUtils";

type EditableLinesProps = {
  /** Content path to a string[] field, e.g. "home.multicultural.titleLines". */
  path: string;
  /** The lines currently rendered (draft-aware). */
  values: string[];
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  /** Class for each rendered line span (matches today's markup exactly). */
  lineClassName: (line: string, index: number, all: string[]) => string;
  /** Extra class applied to the block while editing (e.g. base font size that
   * normally lives on the line spans). */
  editingClassName?: string;
  label?: string;
};

/**
 * A string-array field rendered as per-line spans, edited as ONE text block:
 * click to edit, Shift+Enter adds a line, Enter commits (the text is split on
 * newlines back into the array), Escape cancels. Adding/removing lines is
 * therefore just typing — no extra list controls needed.
 */
export default function EditableLines({
  path,
  values,
  as = "div",
  className,
  lineClassName,
  editingClassName,
  label,
}: EditableLinesProps) {
  const editMode = useEditMode();
  const admin = useAdmin();
  const [editing, setEditing] = useState(false);
  const elRef = useRef<HTMLElement | null>(null);
  const initialRef = useRef("");
  const clickPointRef = useRef<{ x: number; y: number } | null>(null);
  const doneRef = useRef(true);

  const fieldLabel = label ?? labelFor(path);
  const supportsPlaintext = usePlaintextSupport();

  useEffect(() => {
    if (!editing) return;
    const el = elRef.current;
    if (!el) return;
    el.focus();
    placeCaret(el, clickPointRef.current);
    clickPointRef.current = null;
    admin.setEditingInfo({ label: fieldLabel, multiline: true });
    return () => admin.setEditingInfo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

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
    // Leave the DOM as a single text node so React can cleanly swap back to
    // the per-line spans (the browser may have split/mangled nodes while
    // editing, and React must not try to remove nodes it never rendered).
    el.textContent = commit ? raw : initialRef.current;
    setEditing(false);
    if (commit) {
      const lines = raw
        .replace(/\u00A0/g, " ")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 0 && JSON.stringify(lines) !== JSON.stringify(values)) {
        admin.setValue(path, lines);
      }
    }
    el.blur();
  }

  const editProps = editMode
    ? {
        "data-gp-editable": "",
        title: editing ? undefined : `Edit ${fieldLabel} (Shift+Enter adds a line)`,
        onClickCapture: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (!editing) {
            initialRef.current = values.join("\n");
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
              onPointerDownCapture: (e: React.PointerEvent) => e.stopPropagation(),
              onKeyDown: (e: React.KeyboardEvent) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  finish(true);
                } else if (e.key === "Enter" && e.shiftKey && !supportsPlaintext) {
                  e.preventDefault();
                  document.execCommand("insertLineBreak");
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  finish(false);
                }
              },
              onPaste: (e: React.ClipboardEvent) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
              },
              onBlur: () => finish(true),
            }
          : null),
      }
    : null;

  const children = editing
    ? initialRef.current
    : values.map((line, i) => (
        <span key={i} className={lineClassName(line, i, values)}>
          {line}
        </span>
      ));

  const mergedClassName =
    [className, editing ? "whitespace-pre-line" : null, editing ? editingClassName : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return createElement(as, { ...editProps, ref: elRef, className: mergedClassName }, children);
}
