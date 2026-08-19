"use client";

import { type CSSProperties, type ElementType, type ReactNode } from "react";
import { useInView } from "./useInView";
import { useMotionStyle, type MotionStyle } from "@/components/motion/MotionProvider";

/**
 * Fade a block into view as it scrolls in — the site's default arrival, used by
 * nearly every section header and card.
 *
 * How it arrives follows the site-wide motion setting. The curves are the
 * spring tokens generated from Remotion's spring solver (see
 * scripts/generate-motion-curves.mjs), so "kinetic" really does overshoot and
 * settle rather than approximating a spring with a bezier guess.
 *
 * `delay` (seconds) staggers siblings; the `.reveal` rule in globals.css is
 * still the belt-and-braces `prefers-reduced-motion` stop.
 */

type Variant = {
  /** Resting (pre-reveal) transform. */
  from: string;
  /** Opacity before revealing — 1 would mean "no fade". */
  fromOpacity: number;
  easing: string;
  ms: string;
};

const VARIANTS: Record<Exclude<MotionStyle, "off">, Variant> = {
  // The motion the site shipped with: a short rise, no overshoot.
  classic: {
    from: "translate3d(0, 28px, 0)",
    fromOpacity: 0,
    easing: "var(--spring-soft)",
    ms: "var(--spring-soft-ms)",
  },
  // More travel, a touch of scale, and a curve that overshoots and settles.
  kinetic: {
    from: "translate3d(0, 56px, 0) scale(0.94)",
    fromOpacity: 0,
    easing: "var(--spring-bounce)",
    ms: "var(--spring-bounce-ms)",
  },
  // Arrival only — nothing travels, it just resolves.
  minimal: {
    from: "none",
    fromOpacity: 0,
    easing: "var(--ease-out-expo)",
    ms: "520ms",
  },
};

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
  const style = useMotionStyle();

  if (style === "off") {
    return (
      <Tag ref={ref} className={className}>
        {children}
      </Tag>
    );
  }

  const v = VARIANTS[style];
  const css: CSSProperties = {
    transitionProperty: "opacity, transform",
    transitionDuration: v.ms,
    transitionTimingFunction: v.easing,
    transitionDelay: `${delay}s`,
    opacity: inView ? 1 : v.fromOpacity,
    transform: inView ? "none" : v.from,
  };

  return (
    <Tag ref={ref} style={css} className={`reveal ${inView ? "reveal-in" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
