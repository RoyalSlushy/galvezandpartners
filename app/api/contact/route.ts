import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSite } from "@/lib/cms";
import { resendConfigured, sendContactEmail, type ContactSubmission } from "@/lib/resend";

/**
 * Contact form endpoint. Stores the submission in Supabase `contact_submissions`
 * (as the form used to do straight from the browser) and emails it to the team
 * through Resend. The visitor sees success if either of the two worked, so a
 * Resend outage never loses an inquiry and neither does a database one.
 */

const LIMITS = { first: 100, last: 100, email: 254, message: 5000 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Honeypot: a field people never see. Bots that fill it get a quiet success.
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const str = (k: keyof typeof LIMITS) =>
    typeof body[k] === "string" ? (body[k] as string).trim().slice(0, LIMITS[k]) : "";
  const submission: ContactSubmission = {
    first: str("first"),
    last: str("last"),
    email: str("email"),
    message: str("message"),
  };

  if (!submission.email || !submission.message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!EMAIL_RE.test(submission.email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  // Our own id doubles as Resend's idempotency key, so a retried request
  // can't email the same submission twice.
  const id = crypto.randomUUID();

  const { error: dbError } = await supabase.from("contact_submissions").insert({
    id,
    first_name: submission.first,
    last_name: submission.last,
    email: submission.email,
    message: submission.message,
  });
  if (dbError) console.error("[contact] could not store submission:", dbError.message);

  let emailed = false;
  if (resendConfigured()) {
    const fallbackTo = process.env.CONTACT_TO_EMAIL ? "" : (await getSite()).contact.email;
    const result = await sendContactEmail(submission, { fallbackTo, idempotencyKey: id });
    emailed = result.status === "sent";
    if (result.status !== "sent") {
      console.error(`[contact] email ${result.status}:`, "error" in result ? result.error : result.reason);
    }
  }

  if (dbError && !emailed) {
    return NextResponse.json({ error: "not_delivered" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
