import type { ContentKey } from "@/lib/cms";
import { wixImage } from "@/lib/wix";

// NOTE: keep this module free of `@/lib/supabase` / `@/lib/cms` value imports —
// it is statically bundled into every page via AdminProvider, and those pull
// the whole supabase-js client in. The draft fetching that needs them lives in
// lib/adminContent.ts, which AdminProvider imports dynamically on demand.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const FN_URL = `${SUPABASE_URL}/functions/v1/admin-content`;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const ADMIN_PW_KEY = "gp_admin_pw";
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function callAdmin(password: string, body: Record<string, unknown>) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
    },
    body: JSON.stringify({ password, ...body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export const verifyPassword = (password: string) => callAdmin(password, { action: "verify" });

export const saveSection = (password: string, key: ContentKey, value: unknown) =>
  callAdmin(password, { action: "save", key, value });

export async function uploadImage(password: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image is too large (max 5 MB)");
  const data = await fileToBase64(file);
  const res = await callAdmin(password, {
    action: "upload",
    filename: file.name,
    contentType: file.type,
    data,
  });
  return res.url as string;
}

export async function listUploadedImages(password: string): Promise<string[]> {
  const res = await callAdmin(password, { action: "list_images" });
  return (res.urls as string[]) ?? [];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

/* ---------------- content paths ---------------- */

export function parsePath(path: string): (string | number)[] {
  return path.split(".").map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg));
}

export function sectionOf(path: string): ContentKey {
  return path.split(".", 1)[0] as ContentKey;
}

export function getByPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of parsePath(path)) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string | number, unknown>)[seg];
  }
  return cur;
}

/** Immutable set: returns a copy of `obj` with the value at `path` replaced. */
export function setByPath<T>(obj: T, path: string, value: unknown): T {
  const segs = parsePath(path);
  const walk = (node: unknown, i: number): unknown => {
    if (i === segs.length) return value;
    const seg = segs[i];
    if (Array.isArray(node)) {
      const copy = node.slice();
      copy[seg as number] = walk(node[seg as number], i + 1);
      return copy;
    }
    const source = (node ?? {}) as Record<string | number, unknown>;
    return { ...source, [seg]: walk(source[seg], i + 1) };
  };
  return walk(obj, 0) as T;
}

export type ListOp =
  | { type: "insert"; index: number; item: unknown }
  | { type: "remove"; index: number }
  | { type: "move"; from: number; to: number };

export function listApply(arr: unknown[], op: ListOp): unknown[] {
  const next = arr.slice();
  if (op.type === "insert") {
    next.splice(op.index, 0, op.item);
  } else if (op.type === "remove") {
    next.splice(op.index, 1);
  } else {
    if (op.to < 0 || op.to >= next.length) return next;
    const [moved] = next.splice(op.from, 1);
    next.splice(op.to, 0, moved);
  }
  return next;
}

/* ---------------- images ---------------- */

export type ImageRef = { raw: string; previewUrl: string };

/** Neutral clickable placeholder for image fields that are still empty
 * (e.g. a freshly added team member). */
export const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#232a3d'/><g fill='none' stroke='#e6b367' stroke-width='6' opacity='0.8'><rect x='140' y='96' width='120' height='90' rx='10'/><circle cx='178' cy='128' r='11'/><path d='M150 178l32-30 24 22 20-16 34 24'/></g></svg>`,
  );

/** Resolve a stored image value (full URL or bare Wix media id) to a URL. */
export function resolveImage(raw: string, w = 400, h = 300): string {
  if (!raw) return PLACEHOLDER_IMG;
  return raw.startsWith("http") ? raw : wixImage(raw, w, h);
}

/** Every distinct image currently referenced across the site content. */
export function collectImages(sections: Partial<Record<ContentKey, unknown>>): ImageRef[] {
  const raws: string[] = [];
  const home = sections.home as { hero?: { image?: string } } | undefined;
  if (home?.hero?.image) raws.push(home.hero.image);
  const team = sections.team as { members?: { photo?: string }[] } | undefined;
  for (const m of team?.members ?? []) if (m?.photo) raws.push(m.photo);
  const work = sections.work as { items?: { img?: string }[] } | undefined;
  for (const w of work?.items ?? []) if (w?.img) raws.push(w.img);
  const cs = sections.case_studies as { studies?: { gallery?: string[] }[] } | undefined;
  for (const s of cs?.studies ?? []) for (const g of s?.gallery ?? []) if (g) raws.push(g);

  const seen = new Set<string>();
  const out: ImageRef[] = [];
  for (const raw of raws) {
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push({ raw, previewUrl: resolveImage(raw) });
  }
  return out;
}
