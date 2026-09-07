"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_LABELS,
  contactFormSchema,
  emptyContactDraft,
  FIELD_LIMITS,
  toFieldErrors,
  type ContactFieldErrors,
  type ContactFormDraft,
} from "@/lib/contactSchema";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent" }
  | { kind: "failed"; message: string; recipient?: string };

/** Fields the user can fix, in the order they appear, for focusing the first error. */
const FIELD_ORDER = ["name", "email", "category", "subject", "message", "consent"] as const;

export default function ContactPage() {
  const [draft, setDraft] = useState<ContactFormDraft>(emptyContactDraft);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  /** Only show a field's error once the user has left it, so we do not shout at
   *  someone while they are still typing their email address. */
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const mountedAt = useRef<number>(Date.now());
  const formRef = useRef<HTMLFormElement>(null);

  /** Runs the shared schema and returns the field errors, if any. */
  const validate = useCallback((values: ContactFormDraft): ContactFieldErrors => {
    const result = contactFormSchema.safeParse({
      ...values,
      elapsedMs: Date.now() - mountedAt.current,
    });
    return result.success ? {} : toFieldErrors(result.error);
  }, []);

  const liveErrors = useMemo(() => validate(draft), [draft, validate]);

  const update = <K extends keyof ContactFormDraft>(field: K, value: ContactFormDraft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    // Clear a server-reported error as soon as the field is edited.
    setErrors((prev) => (prev[field as keyof ContactFieldErrors] ? { ...prev, [field]: undefined } : prev));
    if (status.kind === "failed") setStatus({ kind: "idle" });
  };

  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  /** An error is shown if the server sent one, or the field was touched and is invalid. */
  const errorFor = (field: (typeof FIELD_ORDER)[number]): string | undefined =>
    errors[field] ?? (touched[field] ? liveErrors[field] : undefined);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status.kind === "submitting") return;

    const found = validate(draft);
    if (Object.keys(found).length > 0) {
      // Reveal every error at once now that they have actively submitted.
      setTouched(Object.fromEntries(FIELD_ORDER.map((f) => [f, true])));
      setErrors(found);
      const firstBad = FIELD_ORDER.find((f) => found[f]);
      if (firstBad) {
        formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      }
      return;
    }

    setStatus({ kind: "submitting" });
    setErrors({});

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, elapsedMs: Date.now() - mountedAt.current }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; fieldErrors?: ContactFieldErrors; message?: string; recipient?: string }
        | null;

      if (response.ok && body?.ok) {
        setStatus({ kind: "sent" });
        setDraft(emptyContactDraft);
        setTouched({});
        return;
      }

      if (body?.fieldErrors) {
        // The server re-runs the same schema, so this normally only happens when
        // the request was crafted by hand — surface it on the fields anyway.
        setErrors(body.fieldErrors);
        setTouched(Object.fromEntries(FIELD_ORDER.map((f) => [f, true])));
        setStatus({ kind: "idle" });
        return;
      }

      setStatus({
        kind: "failed",
        message: body?.message ?? "We could not send your message. Please try again.",
        recipient: body?.recipient,
      });
    } catch {
      setStatus({
        kind: "failed",
        message: "We could not reach the server. Please check your connection and try again.",
      });
    }
  };

  if (status.kind === "sent") {
    return (
      <>
        <PageTitle />
        <section className="card contact-sent" role="status" aria-live="polite">
          <span className="contact-sent-mark" aria-hidden="true">
            ✓
          </span>
          <h2>Message sent</h2>
          <p>
            Thanks for writing in. Your message has been emailed to the team and we will reply to the
            address you gave us.
          </p>
          <button className="btn secondary" onClick={() => setStatus({ kind: "idle" })}>
            Send another message
          </button>
        </section>
      </>
    );
  }

  const submitting = status.kind === "submitting";
  const messageLength = draft.message.trim().length;

  return (
    <>
      <PageTitle />

      <form className="card contact-form" onSubmit={handleSubmit} ref={formRef} noValidate>
        <div className="contact-row">
          <Field label="Your name" htmlFor="contact-name" error={errorFor("name")} required>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={FIELD_LIMITS.name.max}
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
              onBlur={() => markTouched("name")}
              aria-invalid={Boolean(errorFor("name"))}
              aria-describedby={errorFor("name") ? "contact-name-error" : undefined}
              disabled={submitting}
            />
          </Field>

          <Field label="Your email" htmlFor="contact-email" error={errorFor("email")} required>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={draft.email}
              onChange={(e) => update("email", e.target.value)}
              onBlur={() => markTouched("email")}
              aria-invalid={Boolean(errorFor("email"))}
              aria-describedby={errorFor("email") ? "contact-email-error" : undefined}
              disabled={submitting}
            />
          </Field>
        </div>

        <Field
          label="What is this about?"
          htmlFor="contact-category"
          error={errorFor("category")}
          required
        >
          <select
            id="contact-category"
            name="category"
            value={draft.category}
            onChange={(e) => update("category", e.target.value as ContactFormDraft["category"])}
            onBlur={() => markTouched("category")}
            aria-invalid={Boolean(errorFor("category"))}
            aria-describedby={errorFor("category") ? "contact-category-error" : undefined}
            disabled={submitting}
          >
            <option value="">Choose one…</option>
            {CONTACT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CONTACT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Subject"
          htmlFor="contact-subject"
          error={errorFor("subject")}
          hint="This becomes the subject line of the email we receive."
          required
        >
          <input
            id="contact-subject"
            name="subject"
            type="text"
            maxLength={FIELD_LIMITS.subject.max}
            value={draft.subject}
            onChange={(e) => update("subject", e.target.value)}
            onBlur={() => markTouched("subject")}
            aria-invalid={Boolean(errorFor("subject"))}
            aria-describedby={errorFor("subject") ? "contact-subject-error" : undefined}
            disabled={submitting}
          />
        </Field>

        <Field
          label="Message"
          htmlFor="contact-message"
          error={errorFor("message")}
          hint="What happened, what you expected, and the browser you were using if it is a bug."
          required
        >
          <textarea
            id="contact-message"
            name="message"
            rows={7}
            maxLength={FIELD_LIMITS.message.max}
            value={draft.message}
            onChange={(e) => update("message", e.target.value)}
            onBlur={() => markTouched("message")}
            aria-invalid={Boolean(errorFor("message"))}
            aria-describedby={errorFor("message") ? "contact-message-error" : undefined}
            disabled={submitting}
          />
          <span className="contact-counter">
            {messageLength} / {FIELD_LIMITS.message.max}
            {messageLength > 0 && messageLength < FIELD_LIMITS.message.min
              ? ` · at least ${FIELD_LIMITS.message.min}`
              : ""}
          </span>
        </Field>

        {/* Honeypot. Hidden from people, ignored by password managers, and any
            value here means the submission was automated. */}
        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor="contact-reference">Reference code</label>
          <input
            id="contact-reference"
            name="referenceCode"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={draft.referenceCode}
            onChange={(e) => update("referenceCode", e.target.value)}
          />
        </div>

        <label className="contact-consent">
          <input
            name="consent"
            type="checkbox"
            checked={draft.consent}
            onChange={(e) => {
              update("consent", e.target.checked);
              markTouched("consent");
            }}
            aria-invalid={Boolean(errorFor("consent"))}
            disabled={submitting}
          />
          <span>
            I agree that IntelliApply may use my name and email address to reply to this message.
            Nothing else is collected by this form.
          </span>
        </label>
        {errorFor("consent") && (
          <p className="field-error" role="alert">
            {errorFor("consent")}
          </p>
        )}

        {errors.form && (
          <p className="field-error" role="alert">
            {errors.form}
          </p>
        )}

        {status.kind === "failed" && (
          <div className="contact-failed" role="alert">
            <p>{status.message}</p>
            {status.recipient && (
              <p>
                You can email us directly at{" "}
                <a href={buildMailto(status.recipient, draft)}>{status.recipient}</a>.
              </p>
            )}
          </div>
        )}

        <div className="contact-actions">
          <button className="btn primary" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send message"}
          </button>
          <span className="contact-note">We only use your email to reply.</span>
        </div>
      </form>
    </>
  );
}

function PageTitle() {
  return (
    <div className="page-header">
      <div>
        <h1>Contact us</h1>
        <p>
          Report a bug, tell us something broke, request a feature, or ask us to delete your data.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`form-field ${error ? "has-error" : ""}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && <small className="field-hint">{hint}</small>}
      {children}
      {error && (
        <p className="field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Pre-fills a mail client so a delivery failure never loses the message. */
function buildMailto(recipient: string, draft: ContactFormDraft): string {
  const body = [
    `Name: ${draft.name}`,
    `About: ${draft.category ? CONTACT_CATEGORY_LABELS[draft.category] : "—"}`,
    "",
    draft.message,
  ].join("\n");
  return `mailto:${recipient}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(body)}`;
}
