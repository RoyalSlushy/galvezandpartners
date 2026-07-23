"use client";

import { useEffect, useRef, useState } from "react";
import { useAdmin } from "./AdminProvider";
import SiteMetaPopover from "./SiteMetaPopover";
import ThemePopover from "./ThemePopover";
import GlyphsPopover from "./GlyphsPopover";
import {
  ChevronDownIcon,
  EyeIcon,
  GlyphsIcon,
  PaletteIcon,
  PencilIcon,
  PowerIcon,
  SaveIcon,
  SlidersIcon,
  SpinnerIcon,
  UndoIcon,
} from "./icons";

/**
 * The floating admin drawer: a minimized FAB pinned to the bottom-right that
 * expands into an icon-only toolbar. No form inputs — every control is a
 * toggle/action icon with a tooltip.
 */
export default function AdminDrawer() {
  const admin = useAdmin();
  const [open, setOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [glyphsOpen, setGlyphsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // The footer gear (or anything else) can ask the drawer to open itself.
  const firstPoke = useRef(true);
  useEffect(() => {
    if (firstPoke.current) {
      firstPoke.current = false;
      return;
    }
    setOpen(true);
  }, [admin.drawerPoke]);

  // Escape collapses the drawer (editing elements stop propagation, so this
  // never fires while a text edit is in progress).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMetaOpen(false);
        setThemeOpen(false);
        setGlyphsOpen(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const dirty = admin.dirtyCount;

  if (!open) {
    return (
      <div className="fixed bottom-4 right-4 z-[70]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open site editor"
          title="Open site editor"
          className="relative flex h-12 w-12 items-center justify-center border border-white/10 bg-navy-soft text-gold shadow-xl transition hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <PencilIcon className="h-5 w-5" />
          {dirty > 0 && <Badge count={dirty} />}
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="fixed bottom-4 right-4 z-[70]">
      {metaOpen && <SiteMetaPopover onClose={() => setMetaOpen(false)} />}
      {themeOpen && <ThemePopover onClose={() => setThemeOpen(false)} />}
      {glyphsOpen && <GlyphsPopover onClose={() => setGlyphsOpen(false)} />}
      <div className="flex items-center gap-1 border border-white/10 bg-navy-soft p-1.5 shadow-xl">
        <DrawerButton
          label={admin.editMode ? "Preview site (edit mode off)" : "Edit site content"}
          active={admin.editMode}
          onClick={() => void admin.toggleEditMode()}
        >
          {admin.startingEdit ? (
            <SpinnerIcon className="h-5 w-5" />
          ) : admin.editMode ? (
            <EyeIcon className="h-5 w-5" />
          ) : (
            <PencilIcon className="h-5 w-5" />
          )}
        </DrawerButton>

        <DrawerButton
          label="Site name & description"
          active={metaOpen}
          onClick={() => {
            setThemeOpen(false);
            setGlyphsOpen(false);
            setMetaOpen((v) => !v);
          }}
        >
          <SlidersIcon className="h-5 w-5" />
        </DrawerButton>

        <DrawerButton
          label="Site theme & colors"
          active={themeOpen}
          onClick={() => {
            setMetaOpen(false);
            setGlyphsOpen(false);
            setThemeOpen((v) => !v);
          }}
        >
          <PaletteIcon className="h-5 w-5" />
        </DrawerButton>

        <DrawerButton
          label="Letters (custom SVG glyphs)"
          active={glyphsOpen}
          onClick={() => {
            setMetaOpen(false);
            setThemeOpen(false);
            setGlyphsOpen((v) => !v);
          }}
        >
          <GlyphsIcon className="h-5 w-5" />
        </DrawerButton>

        <span className="mx-0.5 h-6 w-px bg-white/10" aria-hidden />

        <DrawerButton
          label={dirty > 0 ? `Save ${dirty} change${dirty === 1 ? "" : "s"}` : "Nothing to save"}
          disabled={dirty === 0 || admin.saving}
          onClick={() => void admin.saveAll()}
        >
          {admin.saving ? <SpinnerIcon className="h-5 w-5" /> : <SaveIcon className="h-5 w-5" />}
          {dirty > 0 && <Badge count={dirty} />}
        </DrawerButton>

        <DrawerButton
          label="Discard unsaved changes"
          disabled={dirty === 0 || admin.saving}
          onClick={() => {
            if (window.confirm("Discard all unsaved changes?")) admin.discardAll();
          }}
        >
          <UndoIcon className="h-5 w-5" />
        </DrawerButton>

        <span className="mx-0.5 h-6 w-px bg-white/10" aria-hidden />

        <DrawerButton label="Log out" onClick={admin.logout}>
          <PowerIcon className="h-5 w-5" />
        </DrawerButton>

        <DrawerButton
          label="Minimize"
          onClick={() => {
            setMetaOpen(false);
            setThemeOpen(false);
            setGlyphsOpen(false);
            setOpen(false);
          }}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </DrawerButton>
      </div>
    </div>
  );
}

function DrawerButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-tip={label}
      aria-pressed={active}
      className={`gp-tip relative flex h-10 w-10 items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
        active ? "bg-gold/20 text-gold" : "text-white/75 hover:bg-white/10 hover:text-white"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-gold px-1 font-heading text-[10px] leading-none text-navy">
      {count > 99 ? "99+" : count}
    </span>
  );
}
