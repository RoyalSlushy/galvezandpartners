"use client";

import { useEffect, useState } from "react";
import { useEditMode } from "@/components/admin/AdminProvider";
import { useMotionStyle } from "./MotionProvider";

/** How long to wait for the veil's signal before making the entrance anyway. */
const FAILSAFE_MS = 6000;

/**
 * Timing for a landing section's entrance.
 *
 * A page is only *seen* when the load veil lifts (see PageReveal), so a landing
 * section that animated on mount would play to the back of the veil and be over
 * before anyone looked. This hook returns the phase to put on the section's
 * `data-gp-hero` attribute, which the [data-gp-hero] rules in globals.css read:
 *
 *   null   — no attribute at all. Server-rendered, motion off, or edit mode:
 *            the section is simply there, as it is for a visitor with no JS.
 *   "wait" — hydrated, holding at the start of the sequence behind the veil.
 *   "in"   — the veil has lifted; play.
 *
 * Sections tag their parts with data-hero-wipe / -line / -rise / -open and a
 * `--d` delay each, and the shared CSS handles the rest, including what each
 * motion style makes of it.
 */
export function useRevealPhase(): null | "wait" | "in" {
  const motion = useMotionStyle();
  const editMode = useEditMode();
  const [phase, setPhase] = useState<null | "wait" | "in">(null);

  useEffect(() => {
    if (motion === "off" || editMode) {
      setPhase(null);
      return;
    }
    // Already revealed — a client-side navigation, or a section that mounted
    // late. Make the entrance now rather than waiting for a signal that has
    // been and gone.
    if (document.documentElement.hasAttribute("data-gp-revealed")) {
      setPhase("in");
      return;
    }
    setPhase("wait");
    const enter = () => setPhase("in");
    window.addEventListener("gp:revealed", enter, { once: true });
    // The veil has its own deadline; this is the backstop for the case where
    // its signal never arrives at all, so a section can never stay hidden.
    const failsafe = window.setTimeout(enter, FAILSAFE_MS);
    return () => {
      window.removeEventListener("gp:revealed", enter);
      window.clearTimeout(failsafe);
    };
  }, [motion, editMode]);

  return phase;
}
