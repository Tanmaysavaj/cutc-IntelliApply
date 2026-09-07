/**
 * POST /api/contact — validates a contact submission and emails it.
 *
 * The browser validates with the same schema for instant feedback, but that is
 * advisory only: anything can POST here directly, so this handler re-runs the
 * identical Zod schema and treats its result as the only source of truth.
 */

import {
  CONTACT_CATEGORY_LABELS,
  contactFormSchema,
  toFieldErrors,
  type ContactFieldErrors,
} from "@/lib/contactSchema";
import { getContactRecipient, sendContactEmail } from "@/lib/server/contactEmail";

/** Generous for a 2000-character message, small enough to reject payload abuse. */
const MAX_BODY_BYTES = 16 * 1024;

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    // Never cached: this is a write endpoint.
    headers: { "cache-control": "no-store" },
  });
}

function fieldError(errors: ContactFieldErrors, status = 400) {
  return json({ ok: false, code: "validation-failed", fieldErrors: errors }, status);
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "unsupported-media-type" }, 415);
  }

  const raw = await request.text().catch(() => null);
  if (raw === null) {
    return fieldError({ form: "We could not read that submission. Please try again." });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return fieldError({ form: "That submission is too large." }, 413);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return fieldError({ form: "That submission was not valid JSON." });
  }

  const result = contactFormSchema.safeParse(parsedJson);
  if (!result.success) {
    return fieldError(toFieldErrors(result.error));
  }

  const submission = result.data;

  const delivery = await sendContactEmail({
    name: submission.name,
    email: submission.email,
    categoryLabel: CONTACT_CATEGORY_LABELS[submission.category],
    subject: submission.subject,
    message: submission.message,
    submittedAt: new Date().toISOString(),
  });

  if (!delivery.ok) {
    // Log for the operator; never leak provider detail to the browser.
    console.error(`[contact] delivery failed (${delivery.reason}): ${delivery.detail}`);

    if (delivery.reason === "not-configured") {
      // 503 plus the recipient, so the UI can offer a mailto fallback and the
      // person's message is not lost because of a missing server secret.
      return json(
        {
          ok: false,
          code: "email-not-configured",
          recipient: await getContactRecipient(),
          message:
            "Email delivery is not configured on the server yet. Please send your message by email instead.",
        },
        503
      );
    }

    return json(
      {
        ok: false,
        code: "delivery-failed",
        recipient: await getContactRecipient(),
        message: "We could not send your message right now. Please try again, or email us directly.",
      },
      502
    );
  }

  return json({ ok: true, message: "Thanks — your message has been sent." }, 200);
}

/** Anything other than POST is rejected explicitly rather than falling through. */
export async function GET() {
  return json({ ok: false, code: "method-not-allowed" }, 405);
}
