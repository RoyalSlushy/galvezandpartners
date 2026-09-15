"use client";

import { useEffect, useState } from "react";

/**
 * Live media-query flag. SSR/first paint returns false and corrects itself on
 * mount (same contract as `usePrefersReducedMotion`), so it is only safe for
 * swapping *behavior* — never for anything the server-rendered markup depends
 * on.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}
