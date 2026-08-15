"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ContentKey } from "@/lib/cms";
import {
  ADMIN_PW_KEY,
  getByPath,
  listApply,
  saveSection,
  sectionOf,
  setByPath,
  verifyPassword,
  type ListOp,
} from "@/lib/adminClient";

// Everything visual (drawer, login, picker, toasts) loads only for admins —
// anonymous visitors never download the admin bundle.
const AdminUI = dynamic(() => import("./AdminUI"), { ssr: false });

type Sections = Partial<Record<ContentKey, unknown>>;
type AuthState = "anon" | "checking" | "authed";
type Toast = { id: number; msg: string; kind: "ok" | "err" };
type PickerRequest = { path: string; raw: string };
type EditingInfo = { label: string; multiline: boolean };

type AdminContextValue = {
  auth: AuthState;
  password: string;
  loginOpen: boolean;
  editMode: boolean;
  startingEdit: boolean;
  drafts: Sections | null;
  dirtyCount: number;
  dirtySections: ContentKey[];
  saving: boolean;
  picker: PickerRequest | null;
  toasts: Toast[];
  drawerPoke: number;
  editingInfo: EditingInfo | null;
  setEditingInfo: (info: EditingInfo | null) => void;
  openLogin: () => void;
  closeLogin: () => void;
  login: (pw: string) => Promise<void>;
  logout: () => void;
  toggleEditMode: () => Promise<void>;
  setValue: (path: string, value: unknown) => void;
  /** Set (or clear, with an empty string) the editor's translation of one
   * English source string. */
  setTranslation: (locale: string, source: string, text: string) => void;
  /** Write a batch of translations in one draft edit (the auto-translate pass). */
  setTranslations: (locale: string, entries: Record<string, string>) => void;
  listOp: (listPath: string, op: ListOp) => void;
  discardAll: () => void;
  saveAll: () => Promise<void>;
  openImagePicker: (req: PickerRequest) => void;
  closeImagePicker: () => void;
  notify: (msg: string, kind?: "ok" | "err") => void;
  pokeDrawer: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

/**
 * Read a content value for rendering: the live draft while an edit session is
 * active, otherwise the server-rendered value. `path` is a dot-separated
 * content path rooted at a section key, e.g. "home.hero.headline".
 */
export function useCmsValue<T>(path: string, serverValue: T): T {
  const ctx = useContext(AdminContext);
  if (!ctx || !ctx.editMode || !ctx.drafts) return serverValue;
  const draft = getByPath(ctx.drafts, path);
  return draft === undefined ? serverValue : (draft as T);
}

/** True when edit mode is on (admin edit session active). */
export function useEditMode(): boolean {
  const ctx = useContext(AdminContext);
  return Boolean(ctx?.editMode && ctx.drafts);
}

let toastSeq = 0;

export default function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>("anon");
  const [password, setPassword] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [startingEdit, setStartingEdit] = useState(false);
  const [drafts, setDrafts] = useState<Sections | null>(null);
  const [baseline, setBaseline] = useState<Sections | null>(null);
  const [dirtyPaths, setDirtyPaths] = useState<ReadonlySet<string>>(new Set());
  // Authoritative mirrors so back-to-back commits in one event batch (e.g. a
  // blur-commit immediately followed by a click-commit) never read stale state.
  const draftsRef = useRef<Sections | null>(null);
  const baselineRef = useRef<Sections | null>(null);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawerPoke, setDrawerPoke] = useState(0);
  const [editingInfo, setEditingInfo] = useState<EditingInfo | null>(null);

  // Silent auto-login from the stored password (same key the old /admin used).
  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_PW_KEY);
    if (!saved) return;
    setAuth("checking");
    verifyPassword(saved)
      .then(() => {
        setPassword(saved);
        setAuth("authed");
      })
      .catch(() => {
        localStorage.removeItem(ADMIN_PW_KEY);
        setAuth("anon");
      });
  }, []);

  // Hover/selection CSS across the site is gated on this body attribute.
  useEffect(() => {
    if (editMode) document.body.setAttribute("data-gp-edit-mode", "");
    else document.body.removeAttribute("data-gp-edit-mode");
    return () => document.body.removeAttribute("data-gp-edit-mode");
  }, [editMode]);

  const dirtySections = useMemo(() => {
    if (!drafts || !baseline) return [] as ContentKey[];
    const keys = new Set<ContentKey>();
    for (const path of dirtyPaths) keys.add(sectionOf(path));
    return [...keys].filter(
      (key) => JSON.stringify(drafts[key]) !== JSON.stringify(baseline[key]),
    );
  }, [drafts, baseline, dirtyPaths]);

  const dirtyCount = dirtyPaths.size;

  // Don't lose staged edits to an accidental tab close.
  useEffect(() => {
    if (dirtyCount === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyCount]);

  const notify = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const pokeDrawer = useCallback(() => setDrawerPoke((n) => n + 1), []);

  const login = useCallback(async (pw: string) => {
    await verifyPassword(pw);
    localStorage.setItem(ADMIN_PW_KEY, pw);
    setPassword(pw);
    setAuth("authed");
    setLoginOpen(false);
  }, []);

  const logout = useCallback(() => {
    if (
      dirtyPaths.size > 0 &&
      !window.confirm("You have unsaved changes. Log out and discard them?")
    ) {
      return;
    }
    localStorage.removeItem(ADMIN_PW_KEY);
    setAuth("anon");
    setPassword("");
    setEditMode(false);
    draftsRef.current = null;
    baselineRef.current = null;
    setDrafts(null);
    setBaseline(null);
    setDirtyPaths(new Set());
    setPicker(null);
  }, [dirtyPaths]);

  const toggleEditMode = useCallback(async () => {
    if (editMode) {
      setEditMode(false);
      return;
    }
    if (drafts) {
      setEditMode(true);
      return;
    }
    setStartingEdit(true);
    try {
      // Lazy: keeps supabase-js out of the public bundle.
      const { fetchMergedSections } = await import("@/lib/adminContent");
      const sections = await fetchMergedSections();
      draftsRef.current = sections;
      baselineRef.current = structuredClone(sections);
      setDrafts(sections);
      setBaseline(baselineRef.current);
      setEditMode(true);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not load content", "err");
    } finally {
      setStartingEdit(false);
    }
  }, [editMode, drafts, notify]);

  const markPath = useCallback((nextDrafts: Sections, path: string) => {
    setDirtyPaths((prev) => {
      const next = new Set(prev);
      const now = JSON.stringify(getByPath(nextDrafts, path));
      const was = baselineRef.current
        ? JSON.stringify(getByPath(baselineRef.current, path))
        : undefined;
      if (now === was) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const setValue = useCallback(
    (path: string, value: unknown) => {
      const prev = draftsRef.current;
      if (!prev) return;
      const next = setByPath(prev, path, value);
      draftsRef.current = next;
      setDrafts(next);
      markPath(next, path);
    },
    [markPath],
  );

  // Translations are keyed by the English source string, which is prose — full
  // of the dots the content paths are split on — so this writes the map itself
  // rather than addressing an entry by path. The path it marks dirty is the map,
  // which is all the save needs to know.
  const setTranslation = useCallback(
    (locale: string, source: string, text: string) => {
      const prev = draftsRef.current;
      if (!prev) return;
      const path = `site.translations.${locale}`;
      const table = { ...((getByPath(prev, path) as Record<string, string> | undefined) ?? {}) };
      if (text) table[source] = text;
      else delete table[source];
      const next = setByPath(prev, path, table);
      draftsRef.current = next;
      setDrafts(next);
      markPath(next, path);
    },
    [markPath],
  );

  // The same write as setTranslation, for a whole batch at once: an
  // auto-translate pass fills dozens of entries, and doing them one at a time
  // would re-render the site for each.
  const setTranslations = useCallback(
    (locale: string, entries: Record<string, string>) => {
      const prev = draftsRef.current;
      if (!prev) return;
      const path = `site.translations.${locale}`;
      const table = { ...((getByPath(prev, path) as Record<string, string> | undefined) ?? {}) };
      let changed = false;
      for (const [source, text] of Object.entries(entries)) {
        const value = text.trim();
        if (!value || table[source] === value) continue;
        table[source] = value;
        changed = true;
      }
      if (!changed) return;
      const next = setByPath(prev, path, table);
      draftsRef.current = next;
      setDrafts(next);
      markPath(next, path);
    },
    [markPath],
  );

  const listOp = useCallback(
    (listPath: string, op: ListOp) => {
      const prev = draftsRef.current;
      if (!prev) return;
      const arr = getByPath(prev, listPath);
      // Tolerate an absent list (e.g. a member saved before `socials` existed):
      // adding the first item creates the array.
      const list = Array.isArray(arr) ? arr : [];
      const next = setByPath(prev, listPath, listApply(list, op));
      draftsRef.current = next;
      setDrafts(next);
      markPath(next, listPath);
    },
    [markPath],
  );

  const discardAll = useCallback(() => {
    if (!baselineRef.current) return;
    const restored = structuredClone(baselineRef.current);
    draftsRef.current = restored;
    setDrafts(restored);
    setDirtyPaths(new Set());
  }, []);

  const saveAll = useCallback(async () => {
    // Snapshot from the ref: a blur-commit can land in the same event batch as
    // the save click, and the ref is always current.
    const snapshot = draftsRef.current;
    if (!snapshot || dirtySections.length === 0 || saving) return;
    setSaving(true);
    const failed: string[] = [];
    const savedPaths = new Set<string>();
    for (const key of dirtySections) {
      try {
        await saveSection(password, key, snapshot[key]);
        baselineRef.current = {
          ...(baselineRef.current ?? {}),
          [key]: structuredClone(snapshot[key]),
        };
        setBaseline(baselineRef.current);
        for (const path of dirtyPaths) if (sectionOf(path) === key) savedPaths.add(path);
      } catch (err) {
        failed.push(key);
        notify(
          `Could not save ${key}: ${err instanceof Error ? err.message : "unknown error"}`,
          "err",
        );
      }
    }
    setDirtyPaths((prev) => {
      const next = new Set(prev);
      for (const path of savedPaths) next.delete(path);
      return next;
    });
    setSaving(false);
    if (failed.length === 0) notify("Changes saved");
    router.refresh();
  }, [drafts, dirtySections, dirtyPaths, saving, password, notify, router]);

  const openImagePicker = useCallback((req: PickerRequest) => setPicker(req), []);
  const closeImagePicker = useCallback(() => setPicker(null), []);

  const value = useMemo<AdminContextValue>(
    () => ({
      auth,
      password,
      loginOpen,
      editMode,
      startingEdit,
      drafts,
      dirtyCount,
      dirtySections,
      saving,
      picker,
      toasts,
      drawerPoke,
      editingInfo,
      setEditingInfo,
      openLogin,
      closeLogin,
      login,
      logout,
      toggleEditMode,
      setValue,
      setTranslation,
      setTranslations,
      listOp,
      discardAll,
      saveAll,
      openImagePicker,
      closeImagePicker,
      notify,
      pokeDrawer,
    }),
    [
      auth,
      password,
      loginOpen,
      editMode,
      startingEdit,
      drafts,
      dirtyCount,
      dirtySections,
      saving,
      picker,
      toasts,
      drawerPoke,
      editingInfo,
      openLogin,
      closeLogin,
      login,
      logout,
      toggleEditMode,
      setValue,
      setTranslation,
      setTranslations,
      listOp,
      discardAll,
      saveAll,
      openImagePicker,
      closeImagePicker,
      notify,
      pokeDrawer,
    ],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
      {(auth === "authed" || loginOpen) && <AdminUI />}
    </AdminContext.Provider>
  );
}
