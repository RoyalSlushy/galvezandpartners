"use client";

import { useEffect, useState } from "react";

/** contentEditable="plaintext-only" support, detected once on the client. */
let plaintextSupport: boolean | null = null;

export function usePlaintextSupport(): boolean {
  const [supported, setSupported] = useState(plaintextSupport ?? true);
  useEffect(() => {
    if (plaintextSupport === null) {
      const probe = document.createElement("div");
      try {
        probe.contentEditable = "plaintext-only";
        plaintextSupport = probe.contentEditable === "plaintext-only";
      } catch {
        plaintextSupport = false;
      }
    }
    setSupported(plaintextSupport);
  }, []);
  return supported;
}

/** Put the caret where the user clicked (falling back to the end). */
export function placeCaret(el: HTMLElement, point: { x: number; y: number } | null) {
  const sel = window.getSelection();
  if (!sel) return;
  let range: Range | null = null;
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (point) {
    if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(point.x, point.y);
    } else if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(point.x, point.y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
      }
    }
    if (range && !el.contains(range.startContainer)) range = null;
  }
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function normalizeText(raw: string, multiline: boolean): string {
  const spaced = raw.replace(/\u00A0/g, " ");
  if (multiline) {
    return spaced.replace(/\n{3,}/g, "\n\n").trim();
  }
  return spaced.replace(/\s*\n+\s*/g, " ").trim();
}
