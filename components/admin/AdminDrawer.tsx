"use client";

import { useEffect, useRef, useState } from "react";
import { useAdmin } from "./AdminProvider";
import { useMinWidth } from "@/components/ui/useMinWidth";
import SiteMetaPopover from "./SiteMetaPopover";
import ThemePopover from "./ThemePopover";
import GlyphsPopover from "./GlyphsPopover";
import TranslationsPopover from "./TranslationsPopover";
import {
  ChevronDownIcon,
  DotsIcon,
  EyeIcon,
  GlyphsIcon,
  LanguagesIcon,
  PaletteIcon,
  PencilIcon,
  PowerIcon,
  SaveIcon,
  SlidersIcon,
  SpinnerIcon,
  UndoIcon,
} from "./icons";

/** Which settings panel is showing (only ever one). */
type Panel = "meta" | "theme" | "glyphs" | "lang";

/**
 * The site-wide settings, as opposed to the actions. On a wide bar each gets its
 * own icon; on a narrow one they go behind a single control, since a phone has
 * no room for nine buttons in a row. `short` is the name in that menu, where
 * there is a label to read and no tooltip to lean on.
 */
const PANELS: { key: Panel; label: string; short: string; Icon: typeof SlidersIcon }[] = [
  { key: "meta", label: "Site name & description", short: "Site details", Icon: SlidersIcon },
  { key: "theme", label: "Site theme & colors", short: "Theme & colors", Icon: PaletteIcon },
  { key: "glyphs", label: "Letters (custom SVG glyphs)", short: "Letters", Icon: GlyphsIcon },
  { key: "lang", label: "Español (translations)", short: "Español", Icon: LanguagesIcon },
];

/**
 * The floating admin drawer: a minimized FAB pinned to the bottom-right that
 * expands into an icon-only toolbar. No form inputs — every control is a
 * toggle/action icon with a tooltip.
 *
 * The toolbar keeps its actions — edit, save, discard, log out, minimize —
 * whatever the screen. The settings panels are what gives: on a phone they fold
 * behind one control rather than run the bar off the side of the screen.
 */
export default function AdminDrawer() {
  const admin = useAdmin();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const phone = !useMinWidth(751);

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
        setPanel(null);
        setOptionsOpen(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // The options menu dismisses on a press anywhere outside the drawer, the way
  // the panels it leads to do.
  useEffect(() => {
    if (!optionsOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOptionsOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [optionsOpen]);

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
      {panel === "meta" && <SiteMetaPopover onClose={() => setPanel(null)} />}
      {panel === "theme" && <ThemePopover onClose={() => setPanel(null)} />}
      {panel === "glyphs" && <GlyphsPopover onClose={() => setPanel(null)} />}
      {panel === "lang" && <TranslationsPopover onClose={() => setPanel(null)} />}

      {/* The settings, as a menu, for a bar too narrow to carry them as icons.
          Labelled rather than iconic: there is room here for the name, and no
          hover to bring a tooltip up on a touch screen. */}
      {optionsOpen && (
        <div
          role="menu"
          aria-label="Site settings"
          className="absolute bottom-full right-0 mb-3 w-56 border border-white/10 bg-navy-soft p-1.5 shadow-2xl"
        >
          {PANELS.map(({ key, short, Icon }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOptionsOpen(false);
                setPanel(key);
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="font-din text-xs uppercase tracking-wide">{short}</span>
            </button>
          ))}
        </div>
      )}

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

        {phone ? (
          <DrawerButton
            label="Site settings"
            active={optionsOpen || panel !== null}
            onClick={() => {
              setPanel(null);
              setOptionsOpen((v) => !v);
            }}
          >
            <DotsIcon className="h-5 w-5" />
          </DrawerButton>
        ) : (
          PANELS.map(({ key, label, Icon }) => (
            <DrawerButton
              key={key}
              label={label}
              active={panel === key}
              onClick={() => setPanel((p) => (p === key ? null : key))}
            >
              <Icon className="h-5 w-5" />
            </DrawerButton>
          ))
        )}

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
            setPanel(null);
            setOptionsOpen(false);
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
