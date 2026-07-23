"use client";

import { useEffect, useRef } from "react";
import { useAdmin, useCmsValue } from "./AdminProvider";
import { SpinnerIcon } from "./icons";
import { DEFAULT_THEME_ID, THEMES } from "@/lib/themes";

/**
 * Theme picker for the admin drawer. Selecting a theme stages it as a draft
 * edit to `site.theme` — ThemeApplier repaints the site live, and the change is
 * persisted on Save like any other content edit.
 */
export default function ThemePopover({ onClose }: { onClose: () => void }) {
  const admin = useAdmin();
  const cardRef = useRef<HTMLDivElement>(null);

  // Selecting a theme is a draft edit like any other — make sure a session is live.
  useEffect(() => {
    if (!admin.editMode && !admin.startingEdit) void admin.toggleEditMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [onClose]);

  const ready = admin.editMode && admin.drafts;
  const active = useCmsValue<string>("site.theme", DEFAULT_THEME_ID);

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Site theme"
      className="absolute bottom-full right-0 mb-3 w-80 border border-white/10 bg-navy-soft p-5 shadow-2xl"
    >
      <p className="font-heading text-xs uppercase tracking-widest text-white/50">
        Site theme
      </p>
      <p className="mt-1 text-[11px] leading-snug text-white/40">
        Recolors the whole site. Pick one to preview it live, then Save to
        publish.
      </p>
      {!ready ? (
        <div className="flex items-center justify-center py-8 text-white/50">
          <SpinnerIcon className="h-5 w-5" />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {THEMES.map((theme) => {
            const selected = theme.id === active;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => admin.setValue("site.theme", theme.id)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-3 border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  selected
                    ? "border-gold bg-gold/10"
                    : "border-white/10 hover:border-white/25 hover:bg-white/5"
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 flex-wrap overflow-hidden border border-white/10"
                  aria-hidden
                >
                  {theme.swatches.map((rgb, i) => (
                    <span
                      key={i}
                      className="h-1/2 w-1/2"
                      style={{ backgroundColor: `rgb(${rgb})` }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-sm text-white">
                    {theme.label}
                  </span>
                  <span className="block truncate text-[11px] leading-snug text-white/45">
                    {theme.description}
                  </span>
                </span>
                {selected && (
                  <span className="shrink-0 font-heading text-[10px] uppercase tracking-widest text-gold">
                    On
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
