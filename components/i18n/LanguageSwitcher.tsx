"use client";

import { useLocale } from "./LocaleProvider";
import FlagIcon from "./FlagIcon";

/**
 * One-tap language toggle (the site is bilingual EN/ES, so a dropdown is
 * overkill). The button advertises the OTHER language, in that language —
 * "🇲🇽 En Español" while browsing English, "🇺🇸 In English" while browsing
 * Spanish — and a tap switches instantly (no reload) via the LocaleProvider.
 */
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const next = locale === "en" ? ("es" as const) : ("en" as const);

  return (
    <button
      type="button"
      // Announced in the language it switches to, for the reader who needs it.
      aria-label={next === "es" ? "Cambiar a Español" : "Switch to English"}
      onClick={() => setLocale(next)}
      className={`flex items-center gap-2 py-1 font-heading text-base leading-none tracking-wide text-white/90 transition hover:text-gold ${className}`}
    >
      <FlagIcon code={next} />
      <span>{next === "es" ? "En Español" : "In English"}</span>
    </button>
  );
}
