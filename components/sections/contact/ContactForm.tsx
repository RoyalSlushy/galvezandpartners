"use client";

import { useState, type FormEvent } from "react";
import { useT } from "@/components/i18n/LocaleProvider";

export default function ContactForm() {
  const t = useT();
  const [values, setValues] = useState({ first: "", last: "", email: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!values.email.trim() || !values.message.trim()) {
      setError("Please add your email and a message.");
      return;
    }
    setError(null);
    setSubmitting(true);

    // Stored in Supabase and emailed through Resend by app/api/contact/route.ts.
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, company: honeypot }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};

    setSubmitting(false);

    if (!res?.ok) {
      setError(
        data.error === "invalid_email"
          ? "Please enter a valid email address."
          : "Something went wrong. Please try again."
      );
      return;
    }

    setSuccess(true);
    setValues({ first: "", last: "", email: "", message: "" });
  };

  const field =
    "w-full border border-white/15 bg-navy-soft px-4 py-3 text-white placeholder-white/40 outline-none focus:border-gold";

  if (success) {
    return (
      <div className="mt-10 max-w-2xl border border-gold/30 bg-navy-soft p-8 text-center">
        <p className="text-f7 font-heading text-gold">{t("Thank you!")}</p>
        <p className="mt-2 text-ink-100">{t("We received your message and will be in touch soon.")}</p>
        <button
          type="button"
          className="btn-outline mt-6"
          onClick={() => setSuccess(false)}
        >
          {t("Send another message")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 grid max-w-2xl gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <input aria-label={t("First name")} placeholder={t("First name")} className={field} value={values.first} onChange={set("first")} />
        <input aria-label={t("Last name")} placeholder={t("Last name")} className={field} value={values.last} onChange={set("last")} />
      </div>
      <input
        aria-label={t("Email")}
        type="email"
        required
        placeholder={t("Email *")}
        className={field}
        value={values.email}
        onChange={set("email")}
      />
      <textarea
        aria-label={t("Message")}
        required
        placeholder={t("Message *")}
        rows={6}
        className={field}
        value={values.message}
        onChange={set("message")}
      />
      {/* Spam trap: hidden from people and screen readers, filled in by bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />
      {error && <p className="text-sm text-gold-bright">{t(error)}</p>}
      <button type="submit" className="btn-gold self-start" disabled={submitting}>
        {submitting ? t("Sending...") : t("Submit")}
      </button>
    </form>
  );
}
