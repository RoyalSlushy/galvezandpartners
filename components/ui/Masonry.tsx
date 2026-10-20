"use client";

import { Children, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Cols = { base: number; sm?: number; lg?: number };
type Layout = { width: number; height: number; pos: { left: number; top: number }[] };

/**
 * A masonry wall whose order reads top to bottom on screen. CSS columns fill
 * one column top to bottom before starting the next, so item 2 can sit far
 * below item 5. Here each item goes into whichever column is currently
 * shortest, so every item starts no higher than the one before it. List order
 * (and the editor's move up/down) is then first-to-last by height on the page.
 *
 * It is server-rendered as a plain grid in the same order. Once the browser can
 * measure the items, each one is positioned absolutely, on the same elements,
 * so nothing remounts. It re-lays out whenever the wall or any item resizes
 * (an image loading, a breakpoint).
 */
export default function Masonry({
  cols,
  gap,
  gridClassName,
  children,
}: {
  /** Column count at each breakpoint (sm = 751px, lg = 1024px). */
  cols: Cols;
  /** Gap between items in px, both ways. */
  gap: number;
  /** Tailwind grid-cols classes matching `cols`, for the server render. */
  gridClassName: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const columnCount = () =>
      window.matchMedia("(min-width: 1024px)").matches && cols.lg
        ? cols.lg
        : window.matchMedia("(min-width: 751px)").matches && cols.sm
          ? cols.sm
          : cols.base;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const n = columnCount();
        const width = (root.clientWidth - gap * (n - 1)) / n;
        const heights = new Array<number>(n).fill(0);
        const pos = itemRefs.current.slice(0, items.length).map((el) => {
          let c = 0;
          for (let i = 1; i < n; i++) if (heights[i] < heights[c]) c = i;
          const p = { left: c * (width + gap), top: heights[c] };
          heights[c] += (el?.offsetHeight ?? 0) + gap;
          return p;
        });
        setLayout({ width, height: Math.max(0, Math.max(...heights) - gap), pos });
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    for (const el of itemRefs.current.slice(0, items.length)) if (el) ro.observe(el);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [items.length, cols.base, cols.sm, cols.lg, gap]);

  const placed = layout && layout.pos.length === items.length;
  return (
    <div
      ref={rootRef}
      className={placed ? "relative" : `grid items-start ${gridClassName}`}
      style={placed ? { height: layout.height } : { gap }}
    >
      {items.map((child, i) => (
        <div
          key={(child as { key?: string | null }).key ?? i}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          style={
            placed
              ? { position: "absolute", left: layout.pos[i].left, top: layout.pos[i].top, width: layout.width }
              : undefined
          }
        >
          {child}
        </div>
      ))}
    </div>
  );
}
