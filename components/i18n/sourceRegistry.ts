"use client";

/**
 * Every English string the site has actually asked to translate, gathered as it
 * renders (see the `t` in LocaleProvider).
 *
 * The translations panel needs a list of what is translatable, and the only
 * authority on that is the rendering itself: copy typed into the editor has no
 * entry in content/i18n.ts to be found in, and plenty of editable fields — a
 * name, an address, a URL — are never translated at all. Watching which strings
 * go through `t` answers both, with nothing to keep in step by hand.
 *
 * It accumulates across a session, so the panel shows what has been seen so far
 * rather than only what is on screen this instant.
 */
const seen = new Set<string>();

export function noteSource(source: string): void {
  if (source) seen.add(source);
}

/** A snapshot, alphabetical, for the panel to list. */
export function collectSources(): string[] {
  return [...seen].sort((a, b) => a.localeCompare(b));
}
