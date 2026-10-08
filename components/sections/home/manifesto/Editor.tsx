"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableLines from "@/components/admin/editable/EditableLines";
import EditableImage from "@/components/admin/editable/EditableImage";
import { PLACEHOLDER_IMG, resolveImage } from "@/lib/adminClient";
import { ManifestoColumns, ManifestoShell, type Multicultural } from "./shared";
import { manifestoStyleMeta, type ManifestoStyleId } from "./styles";

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
  const meta = manifestoStyleMeta(style);

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
              onClick={() => setPicking((v) => !v)}
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
