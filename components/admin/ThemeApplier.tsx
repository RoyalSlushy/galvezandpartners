"use client";

import { useEffect } from "react";
import { useAdmin } from "./AdminProvider";
import { getTheme, type ThemeVars } from "@/lib/themes";

const VAR_NAMES = [
  "navy",
  "navy-soft",
  "gold",
  "gold-bright",
  "gold-dark",
  "cream",
  "brown-deep",
] as const;

/**
 * Live theme preview for the admin edit session. While editing, the draft
 * theme is applied as inline CSS variables on <html> (inline styles outrank the
 * server-rendered `:root:root{}` block), so picking a theme recolors the site
 * instantly. Leaving edit mode clears the overrides, falling back to the saved
 * theme from the layout. Anonymous visitors never mount this component.
 */
export default function ThemeApplier() {
  const { editMode, drafts } = useAdmin();
  const draftTheme =
    editMode && drafts?.site
      ? (drafts.site as { theme?: string }).theme
      : undefined;

  useEffect(() => {
    const root = document.documentElement;
    if (draftTheme === undefined) {
      for (const name of VAR_NAMES) root.style.removeProperty(`--c-${name}`);
      return;
    }
    const vars = getTheme(draftTheme).vars;
    for (const name of VAR_NAMES) {
      root.style.setProperty(`--c-${name}`, vars[name as keyof ThemeVars]);
    }
    return () => {
      for (const name of VAR_NAMES) root.style.removeProperty(`--c-${name}`);
    };
  }, [draftTheme]);

  return null;
}
