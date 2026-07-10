import { createClient } from "@supabase/supabase-js";

// Force every Supabase request through an uncached fetch. Next.js's Data Cache
// otherwise memoizes these GETs during server rendering, so saved admin edits
// would only appear in the in-browser preview (a fresh client fetch) and never
// on the live, server-rendered site. `no-store` disables that cache on the
// server and is a harmless hint in the browser.
const uncachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { global: { fetch: uncachedFetch } }
);
