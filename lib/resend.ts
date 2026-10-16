/**
 * Contact-form notifications through Resend (https://resend.com), called from
 * the server only (app/api/contact/route.ts) so the API key never reaches the
 * browser. Talks to the REST API with plain fetch rather than the SDK, the same
 * way lib/instagram.ts reaches its feeds.
 *
 * Env (all server-only):
 *   RESEND_API_KEY     — required to send; without it emails are skipped and
 *                        submissions are only stored in Supabase.
 *   RESEND_FROM_EMAIL  — sender, on a domain verified in Resend, e.g.
 *                        "Galvez & Partners <website@galvezandpartners.com>".
 *                        Defaults to Resend's test sender, which only delivers
 *                        to the Resend account's own address.
 *   CONTACT_TO_EMAIL   — recipient(s), comma-separated. Defaults to the contact
 *                        email set in the CMS (site.contact.email).
 */

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Galvez & Partners <onboarding@resend.dev>";

export type ContactSubmission = {
  first: string;
  last: string;
  email: string;
  message: string;
};

export type SendResult =
  | { status: "sent"; id: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export const resendConfigured = () => Boolean(process.env.RESEND_API_KEY);

/** Email one submission to the team. `fallbackTo` is used when CONTACT_TO_EMAIL
 * is unset; `idempotencyKey` stops Resend sending the same submission twice if
 * the request is retried. Never throws. */
export async function sendContactEmail(
  submission: ContactSubmission,
  { fallbackTo, idempotencyKey }: { fallbackTo: string; idempotencyKey?: string },
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: "skipped", reason: "RESEND_API_KEY is not set" };

  const to = (process.env.CONTACT_TO_EMAIL || fallbackTo)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length) return { status: "skipped", reason: "No recipient address" };

  const name = [submission.first, submission.last].filter(Boolean).join(" ");
  const from = name ? `${name} <${submission.email}>` : submission.email;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to,
        reply_to: submission.email,
        subject: `New website inquiry from ${name || submission.email}`,
        text: [`From: ${from}`, "", submission.message].join("\n"),
        html: renderHtml(submission, name),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !json.id) {
      return { status: "failed", error: json.message || `Resend responded ${res.status}` };
    }
    return { status: "sent", id: json.id };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

function renderHtml(s: ContactSubmission, name: string): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;vertical-align:top">${label}</td>` +
    `<td style="padding:4px 0">${value}</td></tr>`;
  const email = escapeHtml(s.email);
  return `<!doctype html>
<html><body style="margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#111827">
<h2 style="margin:0 0 16px;font-size:18px">New inquiry from the website</h2>
<table style="border-collapse:collapse;margin-bottom:16px">
${name ? row("Name", escapeHtml(name)) : ""}
${row("Email", `<a href="mailto:${email}">${email}</a>`)}
</table>
<div style="white-space:pre-wrap;line-height:1.5;border-left:3px solid #c9a24b;padding-left:12px">${escapeHtml(s.message)}</div>
<p style="margin-top:24px;color:#6b7280;font-size:13px">Reply to this email to answer ${escapeHtml(name || s.email)} directly.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
