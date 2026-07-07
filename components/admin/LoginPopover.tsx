"use client";

import { useEffect, useRef, useState } from "react";
import { useAdmin } from "./AdminProvider";
import { XIcon } from "./icons";

/** Bottom-right unlock card, opened by the footer gear. The password field is
 * the one deliberate form input in the admin experience — it's auth, not content. */
export default function LoginPopover() {
  const admin = useAdmin();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") admin.closeLogin();
    };
    const onPointer = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) admin.closeLogin();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [admin]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setError("");
    try {
      await admin.login(pw);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      ref={cardRef}
      onSubmit={submit}
      className="fixed bottom-4 right-4 z-[80] w-72 rounded-2xl border border-white/10 bg-navy-soft p-5 shadow-2xl"
      role="dialog"
      aria-label="Admin unlock"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-lg text-white">Site editor</h2>
          <p className="mt-1 text-xs text-white/60">Enter the admin password to edit this site.</p>
        </div>
        <button
          type="button"
          onClick={admin.closeLogin}
          aria-label="Close"
          className="rounded-lg p-1 text-white/50 transition hover:text-white"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
      <input
        type="password"
        autoFocus
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Password"
        className="mt-4 w-full rounded-lg border border-white/10 bg-navy px-3 py-2 text-white placeholder-white/40 outline-none focus:border-gold"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy || !pw}
        className="mt-4 w-full rounded-lg bg-gold px-4 py-2 font-heading text-navy transition hover:bg-cream disabled:opacity-60"
      >
        {busy ? "Checking..." : "Unlock"}
      </button>
    </form>
  );
}
