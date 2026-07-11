"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
 * components translate by wrapping their English copy in `t(...)`.
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
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* private mode / storage disabled — the in-memory locale still works */
    }
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
