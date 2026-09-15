import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_PASSWORD = "atrainrulez";
const ALLOWED_KEYS = new Set([
  "site",
  "home",
  "team",
  "work",
  "case_studies",
  "partners",
  "contact",
]);
const BUCKET = "site-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

/* ---------------- machine translation ---------------- */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TRANSLATE_MODEL = "claude-opus-5";
/** Locales we can machine-translate into, named as the translator should think
 * of them. Adding one is a line here plus a line in content/i18n.ts. */
const TRANSLATE_LOCALES: Record<string, string> = {
  es: "Latin American Spanish, as spoken in northern Mexico and South Texas",
};
// Ceilings on one request. The panel sends the blanks in small batches (see
// translateSources), so these are a guard against a runaway call rather than a
// limit anyone should meet in normal use.
const MAX_SOURCES = 100;
const MAX_SOURCE_CHARS = 24_000;

const TRANSLATE_SYSTEM = `You translate copy for the website of Galvez & Partners, a bilingual advertising agency in the Rio Grande Valley on the Texas–Mexico border. The strings you are given are taken straight from the site: headings, navigation labels, buttons, job titles, and marketing prose.

Rules:
- Match the register and the length of the source. Ad copy stays punchy ad copy; a heading stays a heading; a two-word button label stays a two-word button label. Never expand a short label into a sentence.
- Address the reader informally (tú), never usted.
- Leave proper nouns as they are: Galvez & Partners, client and brand names, people's names, place names, product names.
- Keep the capitalization style (ALL CAPS stays ALL CAPS, Title Case stays Title Case) and any trailing punctuation.
- Return a string unchanged when translating it would be wrong or meaningless: it is already in the target language, or it is a number, an emoji, a URL, or a proper noun on its own.
- Give the translation only. No quotes around it, no notes, no alternatives.`;

/** The reply's shape, enforced by the API rather than asked for in the prompt.
 * Every object needs `additionalProperties: false` for a schema to be accepted. */
const TRANSLATE_SCHEMA = {
  type: "object",
  properties: {
    translations: {
      type: "array",
      description: "One entry per string given, in the order they were given.",
      items: {
        type: "object",
        properties: {
          i: { type: "integer", description: "The index the string was given under." },
          t: { type: "string", description: "The translation." },
        },
        required: ["i", "t"],
        additionalProperties: false,
      },
    },
  },
  required: ["translations"],
  additionalProperties: false,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expected = Deno.env.get("ADMIN_PASSWORD") ?? DEFAULT_PASSWORD;
  let body: {
    password?: string;
    action?: string;
    key?: string;
    value?: unknown;
    filename?: string;
    contentType?: string;
    data?: string;
    locale?: string;
    sources?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.password || body.password !== expected) {
    return json({ error: "Invalid password" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  if (body.action === "verify") {
    return json({ ok: true });
  }

  if (body.action === "save") {
    if (!body.key || !ALLOWED_KEYS.has(body.key)) {
      return json({ error: "Unknown key" }, 400);
    }
    if (body.value === undefined || body.value === null) {
      return json({ error: "Missing value" }, 400);
    }
    const { error } = await supabase.from("site_content").upsert({
      key: body.key,
      value: body.value,
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (body.action === "upload") {
    if (typeof body.data !== "string" || !body.data) {
      return json({ error: "Missing file data" }, 400);
    }
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const isImage = contentType.startsWith("image/");
    const isVideo = contentType.startsWith("video/");
    if (!isImage && !isVideo) {
      return json({ error: "Only image or video uploads are allowed" }, 400);
    }
    const approxBytes = (body.data.length * 3) / 4;
    if (isImage && approxBytes > MAX_IMAGE_BYTES) {
      return json({ error: "Image is too large (max 5 MB)" }, 400);
    }
    if (isVideo && approxBytes > MAX_VIDEO_BYTES) {
      return json({ error: "Video is too large (max 40 MB)" }, 400);
    }
    let bytes: Uint8Array;
    try {
      const bin = atob(body.data);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return json({ error: "Invalid file data" }, 400);
    }
    const safeName = (body.filename || "image")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(-80);
    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType });
    if (error) return json({ error: error.message }, 500);
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return json({ ok: true, url: pub.publicUrl });
  }

  if (body.action === "list_images") {
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) return json({ error: error.message }, 500);
    const urls = (data ?? [])
      .filter((f) => f.name && f.id)
      .map((f) => supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl);
    return json({ ok: true, urls });
  }

  // A first pass at the Spanish for copy written in the editor, which the
  // built-in dictionary can't know about. The reply is written into the admin's
  // draft, not into the site: nothing reaches a visitor until it has been looked
  // over and saved like any other edit.
  if (body.action === "translate") {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "Translation isn't set up (ANTHROPIC_API_KEY is missing)" }, 400);
    }
    const locale = typeof body.locale === "string" ? body.locale : "es";
    const language = TRANSLATE_LOCALES[locale];
    if (!language) return json({ error: `Can't translate into "${locale}"` }, 400);

    const sources = Array.isArray(body.sources)
      ? body.sources.filter((s): s is string => typeof s === "string" && s.trim() !== "")
      : [];
    if (sources.length === 0) return json({ error: "Nothing to translate" }, 400);
    if (sources.length > MAX_SOURCES) {
      return json({ error: `Too many strings at once (max ${MAX_SOURCES})` }, 400);
    }
    const chars = sources.reduce((n, s) => n + s.length, 0);
    if (chars > MAX_SOURCE_CHARS) {
      return json({ error: "Too much copy at once — translate it in smaller batches" }, 400);
    }

    const prompt = [
      `Translate each of these strings into ${language}.`,
      "",
      JSON.stringify(sources.map((text, i) => ({ i, text }))),
      "",
      "Return one entry per string: `i` is the index it was given here, `t` is the",
      "translation. Include every index exactly once, in order.",
    ].join("\n");

    let res: Response;
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: TRANSLATE_MODEL,
          // Spanish runs longer than English and each string is wrapped in a
          // little JSON, so budget well over the source and cap it.
          max_tokens: Math.min(16000, 512 + Math.ceil(chars * 1.5)),
          // Translating to a written spec is not a reasoning problem, and a
          // person is watching a spinner. Thinking is on by default on this
          // model, so it has to be turned off deliberately (only allowed at
          // effort `high` or below, hence the explicit effort).
          thinking: { type: "disabled" },
          output_config: {
            effort: "low",
            // The reply is a data structure rather than prose, so have the API
            // guarantee its shape instead of asking for JSON and hoping.
            format: { type: "json_schema", schema: TRANSLATE_SCHEMA },
          },
          system: TRANSLATE_SYSTEM,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (err) {
      return json(
        { error: `Could not reach the translator: ${err instanceof Error ? err.message : "network error"}` },
        502,
      );
    }

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = payload?.error?.message;
      return json({ error: detail ? `Translator: ${detail}` : `Translator failed (${res.status})` }, 502);
    }

    if (payload?.stop_reason === "refusal") {
      return json({ error: "The translator declined this batch" }, 502);
    }
    const blocks: { type?: string; text?: string }[] = Array.isArray(payload?.content)
      ? payload.content
      : [];
    const text = blocks
      .filter((b) => b?.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    let parsed: { translations?: unknown };
    try {
      parsed = JSON.parse(text);
    } catch {
      // Schema-constrained output only fails to parse if it was cut short.
      const cut = payload?.stop_reason === "max_tokens" ? " (reply was cut short)" : "";
      return json({ error: `Could not read the translator's reply${cut}` }, 502);
    }
    const rows: unknown[] = Array.isArray(parsed?.translations) ? parsed.translations : [];

    const translations: Record<string, string> = {};
    for (const row of rows) {
      const i = (row as { i?: unknown })?.i;
      const t = (row as { t?: unknown })?.t;
      if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i >= sources.length) continue;
      if (typeof t !== "string" || !t.trim()) continue;
      translations[sources[i]] = t.trim();
    }
    return json({
      ok: true,
      translations,
      // How many it skipped, so the panel can say so rather than quietly
      // leaving rows blank.
      missed: sources.length - Object.keys(translations).length,
    });
  }

  return json({ error: "Unknown action" }, 400);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
