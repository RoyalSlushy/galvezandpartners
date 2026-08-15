"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAdmin, useCmsValue } from "./AdminProvider";
import { SpinnerIcon } from "./icons";
import { collectSources } from "@/components/i18n/sourceRegistry";
import { hasTranslation, translate, type TranslationTable } from "@/content/i18n";

/**
 * Español panel: the Spanish for every English string the site has asked to
 * translate.
 *
 * Copy written in the editor can't be translated by content/i18n.ts — nobody
 * knew the wording when that file was written — so a client's own headline or
 * blurb would sit in English however the site was set. This is where its Spanish
 * is written, keyed the same way, by the English it replaces: fill one in and
 * every place that string is used reads it.
 *
 * What is listed comes from the rendering itself rather than a list kept by
 * hand: strings are noted as they pass through `t` (see sourceRegistry), so a
 * field that is never translated never appears here to be filled in pointlessly.
 * It follows that a page has to have been seen for its copy to be listed —
 * hence the note at the foot of the panel.
 */
export default function TranslationsPopover({ onClose }: { onClose: () => void }) {
  const admin = useAdmin();
  // Read from the draft session rather than through the locale: this panel is
  // admin chrome, which sits outside the language (see app/layout.tsx).
  const table = useCmsValue<TranslationTable>("site.translations", {});
  const cardRef = useRef<HTMLDivElement>(null);
  const [showDone, setShowDone] = useState(false);

  // Writing a translation is a draft edit like any other — make sure a session
  // is live.
  useEffect(() => {
    if (!admin.editMode && !admin.startingEdit) void admin.toggleEditMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (cardRef.current && !cardRef.current.contains(target)) onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [onClose]);

  const ready = admin.editMode && admin.drafts;
  // Snapshot on open: the list would otherwise reshuffle under the cursor as
  // more of the page renders.
  const sources = useMemo(() => collectSources(), []);

  const missing = sources.filter((s) => !hasTranslation("es", s, table));
  const shown = showDone ? sources : missing;

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Español"
      className="absolute bottom-full right-0 mb-3 w-[24rem] border border-white/10 bg-navy-soft p-5 shadow-2xl"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-heading text-xs uppercase tracking-widest text-white/50">Español</p>
        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          className="text-[10px] uppercase tracking-widest text-white/40 transition hover:text-gold"
        >
          {showDone ? `${missing.length} missing` : `show all ${sources.length}`}
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-white/40">
        The Spanish for copy written here in the editor, which the built-in
        dictionary can&apos;t know about. Leave one blank to fall back to the
        built-in translation, or to the English itself.
      </p>

      {!ready ? (
        <div className="flex items-center justify-center py-8 text-white/50">
          <SpinnerIcon className="h-5 w-5" />
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-5 text-[11px] italic text-white/35">
          {sources.length === 0
            ? "Nothing translatable has rendered yet."
            : "Everything on the pages you have visited is translated."}
        </p>
      ) : (
        <div className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
          {shown.map((source) => (
            <Row key={source} source={source} table={table} setTranslation={admin.setTranslation} />
          ))}
        </div>
      )}

      <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-snug text-white/30">
        Lists what the pages you have visited this session have asked to
        translate. Visit a page to add its copy to the list.
      </p>
    </div>
  );
}

/** One English string and its Spanish. Kept local while it is being typed, so
 * every keystroke isn't a draft edit; committed on blur or Enter. */
function Row({
  source,
  table,
  setTranslation,
}: {
  source: string;
  table: TranslationTable;
  setTranslation: (locale: string, source: string, text: string) => void;
}) {
  const stored = table.es?.[source] ?? "";
  // What the site currently shows for this string, so the built-in translation
  // (if there is one) is visible as the starting point rather than a blank.
  const current = stored || translate("es", source, table);
  const [text, setText] = useState(stored);
  const commit = () => {
    if (text !== stored) setTranslation("es", source, text.trim());
  };

  return (
    <label className="block">
      <span className="block truncate text-[11px] text-white/55" title={source}>
        {source}
      </span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        placeholder={current === source ? "Español…" : current}
        className="mt-1 w-full border border-white/10 bg-navy px-2.5 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-gold"
      />
    </label>
  );
}
