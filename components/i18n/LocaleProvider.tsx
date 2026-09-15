"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { translate, type Locale, type TranslationTable } from "@/content/i18n";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { noteSource } from "./sourceRegistry";

const STORAGE_KEY = "gp-locale";

/** Marks the document while a language swap is being pictured, so anything that
 * moves under its own steam can hold still for it (see globals.css). */
const SWAPPING_ATTR = "data-gp-swapping";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate an English source string into the active locale. */
  t: (source: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Site-wide language state. The active locale is persisted to localStorage so
 * it survives navigation and reloads, and mirrored onto `<html lang>` for
 * assistive tech.
 *
 * Translation is source-string based (see content/i18n.ts), so components
 * translate by wrapping their English copy in `t(...)`. Two tables are consulted:
 * the one in the CMS first, then the one in the code. The CMS one is what makes
 * edited copy translatable at all — a string typed into the editor can't have
 * been written into content/i18n.ts ahead of time.
 *
 * Changing language cross-fades the copy that changed rather than snapping (see
 * `setLocale` and ::view-transition-* in globals.css).
 */
export default function LocaleProvider({
  children,
  translations: serverTranslations,
}: {
  children: React.ReactNode;
  /** The CMS translation table, server-rendered. */
  translations: TranslationTable;
}) {
  const [locale, setLocaleState] = useState<Locale>("en");
  // Draft-aware, so an admin sees a translation take effect as they type it.
  const translations = useCmsValue<TranslationTable>("site.translations", serverTranslations);

  // Restore the saved locale on mount (client-only, avoids hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") setLocaleState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    const commit = () => {
      setLocaleState(l);
      try {
        localStorage.setItem(STORAGE_KEY, l);
      } catch {
        /* private mode / storage disabled — the in-memory locale still works */
      }
    };

    // Switching language rewrites copy all over the page at once, which lands as
    // a hard snap. A view transition has the browser hold a picture of the page
    // as it was, swap the language, and cross-fade the two — and since the only
    // thing that differs between those two pictures is the copy that changed,
    // only that copy appears to move. It costs nothing per string: no component
    // has to know it is being translated.
    //
    // The swap has to happen synchronously inside the callback for the browser
    // to capture the finished page, hence flushSync. Where view transitions
    // aren't supported the language changes as it always did, and under reduced
    // motion it changes outright on purpose.
    const doc = document as Document & {
      startViewTransition?: (update: () => void) => { ready: Promise<void> };
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof doc.startViewTransition !== "function") {
      commit();
      return;
    }
    // The two pictures are taken a moment apart, so anything still moving is in
    // a different place in each and ghosts against itself as they cross-fade —
    // the drifting letterforms behind the mobile menu especially, being a
    // repeating pattern. Hold the page still until both have been taken, which
    // is what `ready` means. Not until `finished`: by then the pictures are all
    // that is on screen, so the page may as well carry on behind them and be
    // where it should be when it comes back. `ready` rejects if the transition
    // is abandoned, so release on either outcome.
    const root = document.documentElement;
    root.setAttribute(SWAPPING_ATTR, "");
    const release = () => root.removeAttribute(SWAPPING_ATTR);
    doc.startViewTransition(() => flushSync(commit)).ready.then(release, release);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (source: string) => {
        // Noting it here rather than inside translate() keeps the record to the
        // client, where the panel that reads it lives.
        noteSource(source);
        return translate(locale, source, translations);
      },
    }),
    [locale, setLocale, translations],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

/** Convenience hook returning just the translate function. */
export function useT(): (source: string) => string {
  return useLocale().t;
}

/**
 * The translator for CMS-managed copy. Same as `t`, except in an edit session,
 * where the English source is handed back untranslated: an admin edits the
 * English, and would otherwise be typing over the Spanish and saving it as the
 * source. The string is still noted as translatable, so the translations panel
 * knows about copy it can only have seen in edit mode.
 */
export function useEditableT(): (source: string) => string {
  const { t } = useLocale();
  const editMode = useEditMode();
  return (source: string) => {
    if (!editMode) return t(source);
    noteSource(source);
    return source;
  };
}
