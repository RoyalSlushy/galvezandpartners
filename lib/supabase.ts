import { createClient } from "@supabase/supabase-js";

// Force every Supabase request through an uncached fetch. Next.js's Data Cache
// otherwise memoizes these GETs during server rendering, so saved admin edits
// would only appear in the in-browser preview (a fresh client fetch) and never
// on the live, server-rendered site. `no-store` disables that cache on the
// server and is a harmless hint in the browser.
const uncachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

// Fall back to harmless placeholders when the env vars are absent so `createClient`
// never throws at import time. Otherwise `next build` crashes while collecting page
// data (e.g. for /_not-found) merely because this module is imported — even though
// no Supabase request runs at build. With the real env vars set (locally / on the
// host) the client talks to the real project; without them requests simply fail and
// callers fall back to their defaults (see `fetchOne` in lib/cms.ts).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set; " +
      "using placeholders — CMS content and the contact form will be inert."
  );
}

export const supabase = createClient(url, anonKey, { global: { fetch: uncachedFetch } });
