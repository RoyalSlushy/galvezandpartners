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
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

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
    if (typeof body.contentType !== "string" || !body.contentType.startsWith("image/")) {
      return json({ error: "Only image uploads are allowed" }, 400);
    }
    if ((body.data.length * 3) / 4 > MAX_UPLOAD_BYTES) {
      return json({ error: "Image is too large (max 5 MB)" }, 400);
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
      .upload(path, bytes, { contentType: body.contentType });
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

  return json({ error: "Unknown action" }, 400);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
