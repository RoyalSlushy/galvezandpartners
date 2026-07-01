"use client";

import { useState, type FormEvent } from "react";
import { CONTACT } from "@/content/site";

/**
 * Contact form. The original Wix form backend no longer exists, so this composes
 * a mailto: to the agency inbox (works with no server). Swap `handleSubmit` for a
 * real endpoint (route handler / Formspree) when one is available.
 */
export default function ContactForm() {
  const [values, setValues] = useState({ first: "", last: "", email: "", message: "" });
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.email.trim() || !values.message.trim()) {
      setError("Please add your email and a message.");
      return;
    }
    setError(null);
    const subject = encodeURIComponent(`Website inquiry from ${values.first} ${values.last}`.trim());
    const body = encodeURIComponent(
      `Name: ${values.first} ${values.last}\nEmail: ${values.email}\n\n${values.message}`
    );
    window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
  };

  const field =
    "w-full rounded-lg border border-white/15 bg-navy-soft px-4 py-3 text-white placeholder-white/40 outline-none focus:border-gold";

  return (
    <form onSubmit={handleSubmit} className="mt-10 grid max-w-2xl gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <input aria-label="First name" placeholder="First name" className={field} value={values.first} onChange={set("first")} />
        <input aria-label="Last name" placeholder="Last name" className={field} value={values.last} onChange={set("last")} />
      </div>
      <input
        aria-label="Email"
        type="email"
        required
        placeholder="Email *"
        className={field}
        value={values.email}
        onChange={set("email")}
      />
      <textarea
        aria-label="Message"
        required
        placeholder="Message *"
        rows={6}
        className={field}
        value={values.message}
        onChange={set("message")}
      />
      {error && <p className="text-sm text-gold-bright">{error}</p>}
      <button type="submit" className="btn-gold self-start">
        Submit
      </button>
    </form>
  );
}
