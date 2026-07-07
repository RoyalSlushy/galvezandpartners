"use client";

import { useEffect, useState } from "react";
import type {
  CaseStudiesContent,
  HomeContent,
  SiteContent,
  TeamContent,
  WorkContent,
} from "@/lib/cms";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const FN_URL = `${SUPABASE_URL}/functions/v1/admin-content`;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_KEY = "gp_admin_pw";

type AllContent = {
  site: SiteContent;
  home: HomeContent;
  team: TeamContent;
  work: WorkContent;
  case_studies: CaseStudiesContent;
};

type TabKey = "site" | "home" | "team" | "work" | "case_studies";

const TABS: { key: TabKey; label: string }[] = [
  { key: "site", label: "Site" },
  { key: "home", label: "Home" },
  { key: "team", label: "Team" },
  { key: "work", label: "Work" },
  { key: "case_studies", label: "Case Studies" },
];

async function callAdmin(password: string, body: Record<string, unknown>) {
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

export default function AdminApp({ initial }: { initial: Record<string, unknown> }) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<TabKey>("site");
  const [content, setContent] = useState<AllContent>(initial as AllContent);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!saved) {
      setChecking(false);
      return;
    }
    callAdmin(saved, { action: "verify" })
      .then(() => {
        setPassword(saved);
        setAuthed(true);
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setChecking(false));
  }, []);

  async function tryLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    try {
      await callAdmin(password, { action: "verify" });
      localStorage.setItem(STORAGE_KEY, password);
      setAuthed(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
    setPassword("");
  }

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-navy text-white/70">
        Loading...
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-navy px-4">
        <form
          onSubmit={tryLogin}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-soft p-8 shadow-xl"
        >
          <h1 className="font-heading text-2xl text-white">Admin Access</h1>
          <p className="mt-2 text-sm text-white/60">Enter the temporary admin password.</p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-6 w-full rounded-lg border border-white/10 bg-navy px-4 py-3 text-white placeholder-white/40 outline-none focus:border-gold"
            placeholder="Password"
          />
          {authError && (
            <p className="mt-3 text-sm text-red-400">{authError}</p>
          )}
          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-gold px-4 py-3 font-heading text-navy transition hover:bg-cream"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  function updateSection<K extends TabKey>(key: K, value: AllContent[K]) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-navy pb-24 text-white">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-heading text-3xl text-white">Site CMS</h1>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/70 transition hover:border-gold hover:text-gold"
          >
            Log out
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg px-4 py-2 text-sm font-heading transition ${
                tab === t.key
                  ? "bg-navy-soft text-gold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "site" && (
            <SiteEditor
              value={content.site}
              onChange={(v) => updateSection("site", v)}
              password={password}
            />
          )}
          {tab === "home" && (
            <HomeEditor
              value={content.home}
              onChange={(v) => updateSection("home", v)}
              password={password}
            />
          )}
          {tab === "team" && (
            <TeamEditor
              value={content.team}
              onChange={(v) => updateSection("team", v)}
              password={password}
            />
          )}
          {tab === "work" && (
            <WorkEditor
              value={content.work}
              onChange={(v) => updateSection("work", v)}
              password={password}
            />
          )}
          {tab === "case_studies" && (
            <CaseStudyEditor
              value={content.case_studies}
              onChange={(v) => updateSection("case_studies", v)}
              password={password}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- reusable primitives ---------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-heading uppercase tracking-widest text-white/50">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-white/10 bg-navy-soft px-3 py-2 text-white outline-none focus:border-gold ${
        props.className ?? ""
      }`}
    />
  );
}

function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-white/10 bg-navy-soft px-3 py-2 text-white outline-none focus:border-gold ${
        props.className ?? ""
      }`}
    />
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-soft/60 p-6">
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading text-xl text-gold">{children}</h2>
  );
}

function SaveBar({
  password,
  keyName,
  value,
  onSaved,
}: {
  password: string;
  keyName: TabKey;
  value: unknown;
  onSaved?: () => void;
}) {
  const [status, setStatus] = useState<null | "saving" | "saved" | "error">(null);
  const [error, setError] = useState("");

  async function save() {
    setStatus("saving");
    setError("");
    try {
      await callAdmin(password, { action: "save", key: keyName, value });
      setStatus("saved");
      onSaved?.();
      setTimeout(() => setStatus(null), 1500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="sticky bottom-4 mt-8 flex items-center justify-end gap-3">
      {status === "error" && <span className="text-sm text-red-400">{error}</span>}
      {status === "saved" && <span className="text-sm text-green-400">Saved</span>}
      <button
        type="button"
        onClick={save}
        disabled={status === "saving"}
        className="rounded-lg bg-gold px-5 py-2 font-heading text-navy transition hover:bg-cream disabled:opacity-60"
      >
        {status === "saving" ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

function ListEditor<T>({
  items,
  onChange,
  emptyItem,
  render,
  addLabel = "Add",
}: {
  items: T[];
  onChange: (next: T[]) => void;
  emptyItem: () => T;
  render: (item: T, update: (next: T) => void, index: number) => React.ReactNode;
  addLabel?: string;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="relative rounded-xl border border-white/10 bg-navy p-4 pr-14"
        >
          {render(item, (next) => onChange(items.map((it, j) => (j === i ? next : it))), i)}
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                if (i === 0) return;
                const next = [...items];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
              disabled={i === 0}
              className="rounded px-2 py-0.5 text-xs text-white/50 transition hover:text-gold disabled:opacity-30"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => {
                if (i === items.length - 1) return;
                const next = [...items];
                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                onChange(next);
              }}
              disabled={i === items.length - 1}
              className="rounded px-2 py-0.5 text-xs text-white/50 transition hover:text-gold disabled:opacity-30"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded px-2 py-0.5 text-xs text-red-400 transition hover:text-red-300"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, emptyItem()])}
        className="rounded-lg border border-dashed border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-gold hover:text-gold"
      >
        + {addLabel}
      </button>
    </div>
  );
}

function StringListEditor({
  items,
  onChange,
  placeholder,
  addLabel = "Add",
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  return (
    <ListEditor<string>
      items={items}
      onChange={onChange}
      emptyItem={() => ""}
      addLabel={addLabel}
      render={(item, update) => (
        <TextInput
          value={item}
          placeholder={placeholder}
          onChange={(e) => update(e.target.value)}
        />
      )}
    />
  );
}

/* ---------------- Site editor ---------------- */

const SOCIAL_ICONS = ["facebook", "instagram", "linkedin", "tiktok"] as const;

function SiteEditor({
  value,
  onChange,
  password,
}: {
  value: SiteContent;
  onChange: (v: SiteContent) => void;
  password: string;
}) {
  return (
    <div className="space-y-8">
      <Card>
        <SectionHeading>Identity</SectionHeading>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Site Name">
            <TextInput
              value={value.site.name}
              onChange={(e) => onChange({ ...value, site: { ...value.site, name: e.target.value } })}
            />
          </Field>
          <Field label="Brand">
            <TextInput
              value={value.site.brand}
              onChange={(e) => onChange({ ...value, site: { ...value.site, brand: e.target.value } })}
            />
          </Field>
          <Field label="Tagline">
            <TextInput
              value={value.tagline}
              onChange={(e) => onChange({ ...value, tagline: e.target.value })}
            />
          </Field>
          <Field label="Meta Description">
            <TextArea
              rows={3}
              value={value.site.description}
              onChange={(e) => onChange({ ...value, site: { ...value.site, description: e.target.value } })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeading>Contact</SectionHeading>
        <div className="mt-4 grid gap-4">
          <Field label="Email">
            <TextInput
              type="email"
              value={value.contact.email}
              onChange={(e) => onChange({ ...value, contact: { ...value.contact, email: e.target.value } })}
            />
          </Field>
          <Field label="Address Lines">
            <StringListEditor
              items={value.contact.addressLines}
              onChange={(addressLines) => onChange({ ...value, contact: { ...value.contact, addressLines } })}
              placeholder="Address line"
              addLabel="Add line"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeading>Footer</SectionHeading>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Copyright">
            <TextInput
              value={value.footer.copyright}
              onChange={(e) => onChange({ ...value, footer: { ...value.footer, copyright: e.target.value } })}
            />
          </Field>
          <Field label="Credit">
            <TextInput
              value={value.footer.credit}
              onChange={(e) => onChange({ ...value, footer: { ...value.footer, credit: e.target.value } })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeading>Navigation</SectionHeading>
        <div className="mt-4">
          <ListEditor
            items={value.nav}
            onChange={(nav) => onChange({ ...value, nav })}
            emptyItem={() => ({ label: "", href: "/" })}
            addLabel="Add nav item"
            render={(item, update) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Label">
                  <TextInput value={item.label} onChange={(e) => update({ ...item, label: e.target.value })} />
                </Field>
                <Field label="Href">
                  <TextInput value={item.href} onChange={(e) => update({ ...item, href: e.target.value })} />
                </Field>
              </div>
            )}
          />
        </div>
      </Card>

      <Card>
        <SectionHeading>Socials</SectionHeading>
        <div className="mt-4">
          <ListEditor
            items={value.socials}
            onChange={(socials) => onChange({ ...value, socials })}
            emptyItem={() => ({ label: "", href: "", icon: "instagram" as const })}
            addLabel="Add social"
            render={(item, update) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Label">
                  <TextInput value={item.label} onChange={(e) => update({ ...item, label: e.target.value })} />
                </Field>
                <Field label="URL">
                  <TextInput value={item.href} onChange={(e) => update({ ...item, href: e.target.value })} />
                </Field>
                <Field label="Icon">
                  <select
                    value={item.icon}
                    onChange={(e) => update({ ...item, icon: e.target.value as (typeof SOCIAL_ICONS)[number] })}
                    className="w-full rounded-lg border border-white/10 bg-navy-soft px-3 py-2 text-white outline-none focus:border-gold"
                  >
                    {SOCIAL_ICONS.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          />
        </div>
      </Card>

      <SaveBar password={password} keyName="site" value={value} />
    </div>
  );
}

/* ---------------- Home editor ---------------- */

function HomeEditor({
  value,
  onChange,
  password,
}: {
  value: HomeContent;
  onChange: (v: HomeContent) => void;
  password: string;
}) {
  return (
    <div className="space-y-8">
      <Card>
        <SectionHeading>Hero</SectionHeading>
        <div className="mt-4 grid gap-4">
          <Field label="Headline">
            <TextInput
              value={value.hero.headline}
              onChange={(e) => onChange({ ...value, hero: { ...value.hero, headline: e.target.value } })}
            />
          </Field>
          <Field label="Subtitle">
            <TextInput
              value={value.hero.sub}
              onChange={(e) => onChange({ ...value, hero: { ...value.hero, sub: e.target.value } })}
            />
          </Field>
          <Field label="Image URL">
            <TextInput
              value={value.hero.image}
              onChange={(e) => onChange({ ...value, hero: { ...value.hero, image: e.target.value } })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CTA Label">
              <TextInput
                value={value.hero.ctaLabel}
                onChange={(e) => onChange({ ...value, hero: { ...value.hero, ctaLabel: e.target.value } })}
              />
            </Field>
            <Field label="CTA Href">
              <TextInput
                value={value.hero.ctaHref}
                onChange={(e) => onChange({ ...value, hero: { ...value.hero, ctaHref: e.target.value } })}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading>Services Section</SectionHeading>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Eyebrow">
            <TextInput
              value={value.worksEyebrow}
              onChange={(e) => onChange({ ...value, worksEyebrow: e.target.value })}
            />
          </Field>
          <Field label="Heading">
            <TextInput
              value={value.servicesHeading}
              onChange={(e) => onChange({ ...value, servicesHeading: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-6">
          <ListEditor
            items={value.services}
            onChange={(services) => onChange({ ...value, services })}
            emptyItem={() => ({ title: "", description: "" })}
            addLabel="Add service"
            render={(item, update) => (
              <div className="grid gap-3">
                <Field label="Title">
                  <TextInput value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
                </Field>
                <Field label="Description">
                  <TextArea
                    rows={3}
                    value={item.description}
                    onChange={(e) => update({ ...item, description: e.target.value })}
                  />
                </Field>
              </div>
            )}
          />
        </div>
      </Card>

      <Card>
        <SectionHeading>Multicultural Section</SectionHeading>
        <div className="mt-4 grid gap-4">
          <Field label="Title Lines (last line renders in gold)">
            <StringListEditor
              items={value.multicultural.titleLines}
              onChange={(titleLines) =>
                onChange({ ...value, multicultural: { ...value.multicultural, titleLines } })
              }
              placeholder="Title line"
              addLabel="Add line"
            />
          </Field>
          <Field label="Intro">
            <TextArea
              rows={3}
              value={value.multicultural.intro}
              onChange={(e) => onChange({ ...value, multicultural: { ...value.multicultural, intro: e.target.value } })}
            />
          </Field>
          <div>
            <span className="mb-2 block text-xs font-heading uppercase tracking-widest text-white/50">Cards</span>
            <ListEditor
              items={value.multicultural.cards}
              onChange={(cards) =>
                onChange({ ...value, multicultural: { ...value.multicultural, cards } })
              }
              emptyItem={() => ({ title: "", body: "" })}
              addLabel="Add card"
              render={(item, update) => (
                <div className="grid gap-3">
                  <Field label="Title">
                    <TextInput value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
                  </Field>
                  <Field label="Body">
                    <TextArea
                      rows={2}
                      value={item.body}
                      onChange={(e) => update({ ...item, body: e.target.value })}
                    />
                  </Field>
                </div>
              )}
            />
          </div>
        </div>
      </Card>

      <SaveBar password={password} keyName="home" value={value} />
    </div>
  );
}

/* ---------------- Team editor ---------------- */

function TeamEditor({
  value,
  onChange,
  password,
}: {
  value: TeamContent;
  onChange: (v: TeamContent) => void;
  password: string;
}) {
  return (
    <div className="space-y-8">
      <Card>
        <Field label="Section Heading">
          <TextInput
            value={value.heading}
            onChange={(e) => onChange({ ...value, heading: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <SectionHeading>Team Members</SectionHeading>
        <p className="mt-1 text-xs text-white/50">
          Photo accepts a full URL (https://...) or a Wix media id.
        </p>
        <div className="mt-4">
          <ListEditor
            items={value.members}
            onChange={(members) => onChange({ ...value, members })}
            emptyItem={() => ({ name: "", role: "", photo: "" })}
            addLabel="Add member"
            render={(item, update) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <TextInput value={item.name} onChange={(e) => update({ ...item, name: e.target.value })} />
                </Field>
                <Field label="Role">
                  <TextInput value={item.role} onChange={(e) => update({ ...item, role: e.target.value })} />
                </Field>
                <Field label="Photo (URL or Wix id)">
                  <TextInput value={item.photo} onChange={(e) => update({ ...item, photo: e.target.value })} />
                </Field>
              </div>
            )}
          />
        </div>
      </Card>

      <SaveBar password={password} keyName="team" value={value} />
    </div>
  );
}

/* ---------------- Work editor ---------------- */

function WorkEditor({
  value,
  onChange,
  password,
}: {
  value: WorkContent;
  onChange: (v: WorkContent) => void;
  password: string;
}) {
  return (
    <div className="space-y-8">
      <Card>
        <Field label="Section Heading">
          <TextInput
            value={value.heading}
            onChange={(e) => onChange({ ...value, heading: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <SectionHeading>Portfolio Items</SectionHeading>
        <p className="mt-1 text-xs text-white/50">
          Slug is optional — leave blank if the item has no detail page.
          Image accepts a full URL or a Wix media id.
        </p>
        <div className="mt-4">
          <ListEditor
            items={value.items}
            onChange={(items) => onChange({ ...value, items })}
            emptyItem={() => ({ title: "", slug: null, img: "" })}
            addLabel="Add work"
            render={(item, update) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title">
                  <TextInput value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
                </Field>
                <Field label="Slug (optional)">
                  <TextInput
                    value={item.slug ?? ""}
                    onChange={(e) => update({ ...item, slug: e.target.value.trim() ? e.target.value.trim() : null })}
                    placeholder="e.g. la-bombita"
                  />
                </Field>
                <Field label="Image (URL or Wix id)">
                  <TextInput value={item.img} onChange={(e) => update({ ...item, img: e.target.value })} />
                </Field>
              </div>
            )}
          />
        </div>
      </Card>

      <SaveBar password={password} keyName="work" value={value} />
    </div>
  );
}

/* ---------------- Case Studies editor ---------------- */

function CaseStudyEditor({
  value,
  onChange,
  password,
}: {
  value: CaseStudiesContent;
  onChange: (v: CaseStudiesContent) => void;
  password: string;
}) {
  return (
    <div className="space-y-8">
      <Card>
        <SectionHeading>Case Studies</SectionHeading>
        <p className="mt-1 text-xs text-white/50">
          Slug must match the slug used in the Work section for detail-page links to resolve.
        </p>
        <div className="mt-4">
          <ListEditor
            items={value.studies}
            onChange={(studies) => onChange({ ...value, studies })}
            emptyItem={() => ({ slug: "", title: "", background: "", gallery: [] })}
            addLabel="Add case study"
            render={(item, update) => (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title">
                    <TextInput value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
                  </Field>
                  <Field label="Slug">
                    <TextInput value={item.slug} onChange={(e) => update({ ...item, slug: e.target.value })} />
                  </Field>
                </div>
                <Field label="Background">
                  <TextArea
                    rows={4}
                    value={item.background}
                    onChange={(e) => update({ ...item, background: e.target.value })}
                  />
                </Field>
                <Field label="Gallery (URLs or Wix media ids)">
                  <StringListEditor
                    items={item.gallery}
                    onChange={(gallery) => update({ ...item, gallery })}
                    placeholder="Image URL or Wix media id"
                    addLabel="Add image"
                  />
                </Field>
              </div>
            )}
          />
        </div>
      </Card>

      <SaveBar password={password} keyName="case_studies" value={value} />
    </div>
  );
}
