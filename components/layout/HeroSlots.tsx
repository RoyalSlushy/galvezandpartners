"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Two DOM sockets that let the masthead and the homepage hero trade places with
 * each other's chrome on mobile, where the hero is too tight to hold everything
 * at once:
 *
 *  - `headerMedia` — the mobile header's right-hand cell (where the header
 *    picture used to sit). The hero portals its services carousel up into it.
 *  - `heroCta` — the trailing end of the hero's CTA bar. The mobile menu portals
 *    its hamburger down into it, instead of floating it over the cityscape.
 *
 * A socket is registered by the component that owns the box (via its ref) and
 * filled by the component that owns the content, so each side keeps its own
 * state and context — a portal stays inside the React tree it was rendered
 * from. A socket is null wherever its owner isn't mounted (every page but the
 * homepage, for `heroCta`), and each filler falls back to its in-place home.
 */
type Sockets = {
  headerMedia: HTMLElement | null;
  heroCta: HTMLElement | null;
  setHeaderMedia: (el: HTMLElement | null) => void;
  setHeroCta: (el: HTMLElement | null) => void;
};

const HeroSlotsContext = createContext<Sockets>({
  headerMedia: null,
  heroCta: null,
  setHeaderMedia: () => {},
  setHeroCta: () => {},
});

export function useHeroSlots() {
  return useContext(HeroSlotsContext);
}

export default function HeroSlotsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [headerMedia, setHeaderMedia] = useState<HTMLElement | null>(null);
  const [heroCta, setHeroCta] = useState<HTMLElement | null>(null);
  const value = useMemo(
    () => ({ headerMedia, heroCta, setHeaderMedia, setHeroCta }),
    [headerMedia, heroCta],
  );
  return (
    <HeroSlotsContext.Provider value={value}>
      {children}
    </HeroSlotsContext.Provider>
  );
}
