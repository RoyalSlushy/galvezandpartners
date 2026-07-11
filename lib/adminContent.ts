import { supabase } from "@/lib/supabase";
import { CONTENT_KEYS, DEFAULTS, mergeDeep, type ContentKey } from "@/lib/cms";

/**
 * Current merged content for every section, straight from the DB (anon read).
 * Lives in its own module so the supabase-js client is only downloaded when an
 * admin actually starts an edit session (AdminProvider imports this lazily).
 */
export async function fetchMergedSections(): Promise<Record<ContentKey, unknown>> {
  const { data, error } = await supabase.from("site_content").select("key, value");
  if (error) throw new Error(error.message);
  const byKey = new Map((data ?? []).map((row) => [row.key as string, row.value as unknown]));
  const out = {} as Record<ContentKey, unknown>;
  for (const key of CONTENT_KEYS) {
    out[key] = structuredClone(mergeDeep(DEFAULTS[key], byKey.get(key)));
  }
  return out;
}
