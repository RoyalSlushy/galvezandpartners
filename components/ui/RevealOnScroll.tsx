"use client";

import { type ElementType, type ReactNode } from "react";
import { useInView } from "./useInView";

/**
 * Fade + rise a block into view as it scrolls in. Replaces the old
 * Enhancements.tsx `initHomeEnter` / `initReveal` DOM surgery.
 * `delay` (seconds) staggers siblings; `prefers-reduced-motion` is honored
 * via the `.reveal` rule in globals.css.
 */
export default function RevealOnScroll({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}s` }}
      className={`reveal transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform] ${
        inView ? "reveal-in opacity-100 translate-y-0" : "opacity-0 translate-y-7"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
