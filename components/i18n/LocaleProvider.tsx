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
import { translate, type Locale } from "@/content/i18n";

const STORAGE_KEY = "gp-locale";

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
 * assistive tech. Translation is source-string based (see content/i18n.ts), so
 * components translate by wrapping their English copy in `t(...)`, and changing
 * language cross-fades the copy that changed rather than snapping (see
 * `setLocale` and ::view-transition-* in globals.css).
 */
export default function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

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
      startViewTransition?: (update: () => void) => unknown;
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof doc.startViewTransition !== "function") {
      commit();
      return;
    }
    doc.startViewTransition(() => flushSync(commit));
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (source: string) => translate(locale, source) }),
    [locale, setLocale],
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
