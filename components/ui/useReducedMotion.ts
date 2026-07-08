"use client";

import { useEffect, useState } from "react";

/**
 * Live `prefers-reduced-motion` flag. SSR/first paint returns false (motion
 * on) and corrects itself on mount; sections use it to swap scroll-driven
 * layouts for static ones.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}
