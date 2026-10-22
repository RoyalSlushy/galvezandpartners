"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableLines from "@/components/admin/editable/EditableLines";
import EditableImage from "@/components/admin/editable/EditableImage";
import { PLACEHOLDER_IMG, resolveImage } from "@/lib/adminClient";
import { ManifestoColumns, ManifestoShell, type Multicultural } from "./shared";
import { manifestoStyleMeta, type ManifestoStyleId } from "./styles";
import { MANIFESTO_IDLES, resolveManifestoIdle } from "./idle";
import { useAdmin } from "@/components/admin/AdminProvider";

// The picker (with its animated previews) is only ever opened by an admin, so
// it is fetched the first time the chip is pressed rather than shipped with
// the page.
const ManifestoStylePopover = dynamic(
  () => import("@/components/admin/editable/ManifestoStylePopover"),
  { ssr: false },
);

/**
 * The manifesto in edit mode, whatever its style: the copy and the visual laid
 * out still, as the original Ink Fill composition, each one editable in place —
 * the title lines as one block (Shift+Enter adds a line), the intro, and the
 * visual through the media picker.
 *
 * A chip in the corner says which style is on and opens the picker to change
 * it, and a Preview button beside it plays the staged style full size, in
 * place, as visitors will see it (see MulticulturalReveal).
 */
export default function ManifestoEditor({
  multicultural,
  style,
  onPreview,
}: {
  multicultural: Multicultural;
  style: ManifestoStyleId;
  onPreview: () => void;
}) {
  const t = useT();
  const sectionRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const [picking, setPicking] = useState(false);
  const [pickingIdle, setPickingIdle] = useState(false);
  const meta = manifestoStyleMeta(style);
  const idle = resolveManifestoIdle(multicultural.idle);
  const idleMeta = MANIFESTO_IDLES.find((m) => m.id === idle) ?? MANIFESTO_IDLES[0];
  const admin = useAdmin();
  const idleRef = useRef<HTMLDivElement>(null);

  // The idle list closes on a press outside it, or on Escape.
  useEffect(() => {
    if (!pickingIdle) return;
    const onPointer = (e: PointerEvent) => {
      if (!idleRef.current?.contains(e.target as Node)) setPickingIdle(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickingIdle(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [pickingIdle]);

  return (
    <>
      <ManifestoShell
        sectionRef={sectionRef}
        stops={false}
        chevron={false}
        overlay={
          // The style, and the way to change and preview it, in the section's
          // top corner, clear of the copy. Not itself an editable field, so
          // presses here never reach the fields below.
          <div className="absolute right-3 top-3 z-30 flex items-stretch gap-1 sm:right-6 sm:top-5">
            <button
              ref={chipRef}
              type="button"
              onClick={() => {
                setPickingIdle(false);
                setPicking((v) => !v);
              }}
              aria-haspopup="dialog"
              aria-expanded={picking}
              title="Change how the manifesto animates"
              className="flex items-center gap-2.5 border border-gold/40 bg-navy-soft/95 py-2 pl-3 pr-3.5 shadow-lg backdrop-blur transition hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <SparkIcon className="h-4 w-4 shrink-0 text-gold" />
              <span className="hidden font-heading text-[10px] uppercase tracking-widest text-white/50 sm:inline">
                Manifesto style
              </span>
              <span className="font-heading text-xs text-gold">{meta.name}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
                className={`h-3.5 w-3.5 text-white/50 transition ${picking ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {/* The idle animation: what the composed title does while it
                waits for a scroll (see manifesto/idle.ts). */}
            <div ref={idleRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setPicking(false);
                  setPickingIdle((v) => !v);
                }}
                aria-haspopup="listbox"
                aria-expanded={pickingIdle}
                title="Pick what the title does while it waits"
                className="flex h-full items-center gap-2.5 border border-gold/40 bg-navy-soft/95 py-2 pl-3 pr-3.5 shadow-lg backdrop-blur transition hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span className="hidden font-heading text-[10px] uppercase tracking-widest text-white/50 sm:inline">
                  Idle animation
                </span>
                <span className="font-heading text-xs text-gold">{idleMeta.name}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                  className={`h-3.5 w-3.5 text-white/50 transition ${pickingIdle ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {pickingIdle && (
                <div
                  role="listbox"
                  aria-label="Idle animation"
                  className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-1.5rem))] border border-white/10 bg-navy-soft p-2 shadow-2xl shadow-black/60"
                >
                  <p className="px-1.5 pb-2 pt-1 text-[11px] leading-snug text-white/40">
                    What the title does while it waits for the visitor to scroll. Press Preview to see it,
                    then Save in the drawer to publish.
                  </p>
                  {MANIFESTO_IDLES.map((m) => {
                    const selected = m.id === idle;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          admin.setValue("home.multicultural.idle", m.id);
                          setPickingIdle(false);
                        }}
                        className={`mt-1 flex w-full flex-col border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                          selected ? "border-gold bg-gold/10" : "border-transparent hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-heading text-sm text-white">{m.name}</span>
                          {selected && (
                            <span className="font-heading text-[10px] uppercase tracking-widest text-gold">On</span>
                          )}
                        </span>
                        <span className="mt-0.5 text-[11px] leading-snug text-white/50">{m.blurb}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onPreview}
              title="Play this style full size, as visitors will see it"
              className="flex items-center gap-1.5 border border-white/15 bg-navy-soft/95 px-3 font-heading text-[10px] uppercase tracking-widest text-white/70 shadow-lg backdrop-blur transition hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 fill-current">
                <path d="M7 4.5v15l12.5-7.5z" />
              </svg>
              Preview
            </button>
          </div>
        }
      >
        <ManifestoColumns
          copy={
            <>
              <EditableLines
                path="home.multicultural.titleLines"
                values={multicultural.titleLines}
                as="h2"
                className="font-display text-white"
                lineClassName={(_, i, all) =>
                  `block text-f2 leading-[0.82] ${i === 0 ? "lowercase" : ""} ${
                    i === all.length - 1 ? "text-gold" : ""
                  }`
                }
                editingClassName="text-f2"
                label="title lines"
              />
              <EditableText
                path="home.multicultural.intro"
                value={multicultural.intro}
                as="p"
                multiline
                className="mt-1 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8"
              />
            </>
          }
          visual={
            <div className="relative order-first aspect-[4/3] w-full overflow-hidden sm:order-none">
              <EditableImage
                path="home.multicultural.image"
                raw={multicultural.image}
                src={
                  multicultural.image
                    ? resolveImage(multicultural.image, 1200, 900)
                    : PLACEHOLDER_IMG
                }
                alt={t("Galvez & Partners")}
                className="h-full w-full object-cover"
              />
            </div>
          }
        />
      </ManifestoShell>

      {picking && (
        <ManifestoStylePopover
          current={style}
          idle={multicultural.idle}
          anchorRef={chipRef}
          onClose={() => setPicking(false)}
          onPreview={() => {
            setPicking(false);
            onPreview();
          }}
        />
      )}
    </>
  );
}

/** A four-point spark — the "make it move" mark on the style chip. */
function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`fill-current ${className ?? ""}`}>
      <path d="M12 2.5c.5 4.6 2.9 7 9.5 9.5-6.6 2.5-9 4.9-9.5 9.5-.5-4.6-2.9-7-9.5-9.5 6.6-2.5 9-4.9 9.5-9.5Z" />
    </svg>
  );
}
