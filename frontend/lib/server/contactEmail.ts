/**
 * Server-only email delivery for the contact form.
 *
 * Must never be imported from a client component — it reads secrets.
 *
 * Uses Resend's REST API rather than SMTP because Cloudflare Workers cannot open
 * raw TCP connections, so no SMTP library can work in this runtime. Any HTTP
 * email API would do; Resend is used because it needs nothing but `fetch`.
 */

import { DEFAULT_CONTACT_RECIPIENT_PUBLIC } from "../contactRecipient";

/** Where submissions go when CONTACT_TO_EMAIL is not set. */
export const DEFAULT_CONTACT_RECIPIENT = DEFAULT_CONTACT_RECIPIENT_PUBLIC;

/** Resend's shared sender, usable without verifying a domain. It may only
 *  deliver to the address that owns the Resend account, which is fine here —
 *  point CONTACT_FROM_EMAIL at your own domain once one is verified. */
const DEFAULT_FROM = "IntelliApply <onboarding@resend.dev>";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Reads configuration in whichever runtime we are in.
 *
 * `process.env` covers `vinext start` (Node) and also works in workerd under the
 * nodejs_compat flag. The `cloudflare:workers` fallback covers bindings that are
 * only exposed on the Worker `env` object. Both paths were verified; the dynamic
 * import throws under Node, hence the try/catch.
 */
async function readSetting(key: string): Promise<string | undefined> {
  const fromProcess = typeof process !== "undefined" ? process.env?.[key] : undefined;
  if (fromProcess) return fromProcess;

  try {
    const mod = (await import("cloudflare:workers")) as { env?: Record<string, string | undefined> };
    return mod.env?.[key] || undefined;
  } catch {
    return undefined;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Subjects must be a single line. Guards against header-injection attempts even
 *  though the JSON API is not header-based. */
function sanitizeSubject(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 200);
}

export type ContactEmailPayload = {
  name: string;
  email: string;
  categoryLabel: string;
  subject: string;
  message: string;
  submittedAt: string;
};

export type SendContactEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "not-configured" | "provider-error"; detail: string };

export async function getContactRecipient(): Promise<string> {
  return (await readSetting("CONTACT_TO_EMAIL")) ?? DEFAULT_CONTACT_RECIPIENT;
}

function buildBodies(payload: ContactEmailPayload, recipient: string) {
  const rows: Array<[string, string]> = [
    ["From", `${payload.name} <${payload.email}>`],
    ["About", payload.categoryLabel],
    ["Subject", payload.subject],
    ["Submitted", payload.submittedAt],
  ];

  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Message:",
    payload.message,
    "",
    "—",
    `Sent by the IntelliApply contact form to ${recipient}. Reply directly to reach the sender.`,
  ].join("\n");

  // Every interpolated value is escaped: the message is attacker-controlled text
  // and must not be able to inject markup into the email.
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f8fc;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#101938">
  <div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e1e5ef;border-radius:14px;padding:26px">
    <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#5c45f5">IntelliApply · contact form</p>
    <h1 style="margin:0 0 18px;font-size:20px;line-height:1.3">${escapeHtml(payload.subject)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 0;color:#63708b;width:110px;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`
        )
        .join("")}
    </table>
    <div style="margin-top:18px;padding-top:18px;border-top:1px solid #e1e5ef">
      <p style="margin:0 0 8px;color:#63708b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Message</p>
      <p style="margin:0;white-space:pre-wrap;line-height:1.6;font-size:15px">${escapeHtml(payload.message)}</p>
    </div>
    <p style="margin:22px 0 0;color:#63708b;font-size:12px">Reply directly to this email to reach ${escapeHtml(payload.name)}.</p>
  </div>
</body></html>`;

  return { text, html };
}

export async function sendContactEmail(
  payload: ContactEmailPayload
): Promise<SendContactEmailResult> {
  const apiKey = await readSetting("RESEND_API_KEY");
  const recipient = await getContactRecipient();

  if (!apiKey) {
    // Deliberately not a silent success: the caller surfaces a mailto fallback so
    // the submission is never quietly dropped.
    return {
      ok: false,
      reason: "not-configured",
      detail: "RESEND_API_KEY is not set, so the contact form cannot send email.",
    };
  }

  const from = (await readSetting("CONTACT_FROM_EMAIL")) ?? DEFAULT_FROM;
  const { text, html } = buildBodies(payload, recipient);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        // The email subject is the subject the user typed, verbatim.
        subject: sanitizeSubject(payload.subject),
        text,
        html,
        // Lets you reply straight to the person who wrote in.
        reply_to: payload.email,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        reason: "provider-error",
        detail: `Resend responded ${response.status}: ${detail.slice(0, 300)}`,
      };
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: body?.id ?? null };
  } catch (error) {
    return {
      ok: false,
      reason: "provider-error",
      detail: error instanceof Error ? error.message : "Unknown transport error",
    };
  }
}
