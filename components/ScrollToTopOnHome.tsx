"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Force the homepage to open at the very top whenever it becomes the active
 * route. The home hero is `position: sticky`, so any scroll offset carried over
 * from a previous visit — a browser/Next.js back-navigation restoration, or a
 * stale position left after a client transition — parks the page on the
 * sections below the hero instead of on the hero itself. Snapping to the top on
 * entry (and again on the next frame, to beat any restoration that runs after
 * this effect) guarantees we always land at the top of home.
 */
export default function ScrollToTopOnHome() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/") return;
    const toTop = () => window.scrollTo(0, 0);
    toTop();
    const raf = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);
  return null;
}
