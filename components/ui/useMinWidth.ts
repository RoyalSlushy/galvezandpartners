"use client";

import { useEffect, useState } from "react";

/**
 * Live min-width media-query flag. Defaults to true (desktop-first) so SSR and
 * the first paint match the wide layout, correcting on mount for narrow screens.
 */
export function useMinWidth(px: number): boolean {
  const [match, setMatch] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [px]);

  return match;
}
