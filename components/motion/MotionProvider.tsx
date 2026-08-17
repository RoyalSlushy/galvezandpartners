"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

/**
 * Site-wide motion setting.
 *
 * Three characters plus off. Every animated section reads the active style and
 * picks its own interpretation of it, so one control changes the whole site's
 * behavior without any section having to know about the others:
 *
 *   classic — the motion the site shipped with: scroll-linked, unhurried.
 *   kinetic — springier and more physical; more travel, overshoot, tilt.
 *   minimal — arrivals only. Things fade in and hold still.
 *   off     — no animation anywhere, including background video.
 *
 * The choice is remembered across visits. With no choice saved, the OS
 * `prefers-reduced-motion` setting decides the default, and while that setting
 * is on it holds the site at `off` regardless of what is saved — a visitor who
 * has asked their system for less motion should not have to find a control on
 * every site that has one.
 */

export const MOTION_STYLES = ["off", "classic", "kinetic", "minimal"] as const;
export type MotionStyle = (typeof MOTION_STYLES)[number];

const STORAGE_KEY = "gp-motion";
const DEFAULT_STYLE: MotionStyle = "classic";

type MotionContextValue = {
  /** The style in force right now (already accounts for reduced motion). */
  style: MotionStyle;
  /** What the visitor picked, before reduced motion is applied. */
  chosen: MotionStyle;
  setStyle: (s: MotionStyle) => void;
  /** True when the OS asked for reduced motion, which pins `style` to "off". */
  systemReduced: boolean;
};

const MotionContext = createContext<MotionContextValue | null>(null);

function isStyle(v: unknown): v is MotionStyle {
  return typeof v === "string" && (MOTION_STYLES as readonly string[]).includes(v);
}

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const systemReduced = usePrefersReducedMotion();
  const [chosen, setChosen] = useState<MotionStyle>(DEFAULT_STYLE);

  // Restore on mount rather than during render: the server has no idea what is
  // saved, and rendering a different style than it sent would be a hydration
  // mismatch. First paint is the default style, same as the locale.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isStyle(saved)) setChosen(saved);
    } catch {
      /* private mode — the in-memory default still works */
    }
  }, []);

  const style: MotionStyle = systemReduced ? "off" : chosen;

  // Exposed on <html> so CSS can vary without every animated element needing a
  // React subscription (see the [data-gp-motion] rules in globals.css).
  useEffect(() => {
    document.documentElement.setAttribute("data-gp-motion", style);
    return () => document.documentElement.removeAttribute("data-gp-motion");
  }, [style]);

  const setStyle = useCallback((s: MotionStyle) => {
    setChosen(s);
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* as above */
    }
  }, []);

  const value = useMemo(
    () => ({ style, chosen, setStyle, systemReduced }),
    [style, chosen, setStyle, systemReduced],
  );
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

/** Full motion state. Safe outside the provider (admin previews, tests), where
 * it reports the default style and a no-op setter. */
export function useMotion(): MotionContextValue {
  return (
    useContext(MotionContext) ?? {
      style: DEFAULT_STYLE,
      chosen: DEFAULT_STYLE,
      setStyle: () => {},
      systemReduced: false,
    }
  );
}

/** The active motion style — what a section switches its variant on. */
export function useMotionStyle(): MotionStyle {
  return useMotion().style;
}

/**
 * True when nothing should move. Sections use this exactly where they used to
 * use `usePrefersReducedMotion`, so the control reaches every existing
 * animation as well as the new ones.
 */
export function useMotionOff(): boolean {
  return useMotion().style === "off";
}
