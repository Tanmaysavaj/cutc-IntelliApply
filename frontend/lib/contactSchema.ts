/**
 * Contact form contract, shared by the browser form and the `/api/contact` route
 * handler so validation cannot drift between the two. The client uses it for
 * instant per-field feedback; the server re-runs the identical schema because
 * client-side validation is advisory only and trivially bypassed.
 */

import { z } from "zod";
// Explicit .ts extension (rather than the extensionless style used elsewhere) so
// this module resolves unchanged in three runtimes: Vite/browser, the Cloudflare
// Worker, and `node --test`, which needs a real specifier to strip types. It is
// what lets the same schema be unit-tested without a build step.
import {
  countUrls,
  hasEnoughDistinctContent,
  isPlaceholderText,
  isRepeatedSingleWord,
  isUnreachableEmailDomain,
  looksLikeGibberish,
  normalizeWhitespace,
} from "./textQuality.ts";

export const CONTACT_CATEGORIES = [
  "bug",
  "error",
  "feedback",
  "feature",
  "data-request",
  "other",
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const CONTACT_CATEGORY_LABELS: Record<ContactCategory, string> = {
  bug: "Bug report",
  error: "Something showed an error",
  feedback: "General feedback",
  feature: "Feature request",
  "data-request": "Data or privacy request",
  other: "Other",
};

export const FIELD_LIMITS = {
  name: { min: 2, max: 60 },
  subject: { min: 8, max: 120 },
  message: { min: 30, max: 2000 },
} as const;

/**
 * Rejects low-value text: filler that says nothing, one word repeated, or mashed
 * keys. Messages are supplied per field because generic wording reads badly — a
 * name is entered, not "described".
 */
const meaningfulText =
  (messages: { placeholder: string; repeated: string; gibberish: string }) =>
  (schema: z.ZodString) =>
    schema
      .refine((v) => !isPlaceholderText(v), { message: messages.placeholder })
      .refine((v) => !isRepeatedSingleWord(v), { message: messages.repeated })
      .refine((v) => !looksLikeGibberish(v), { message: messages.gibberish });

export const contactFormSchema = z
  .object({
    name: meaningfulText({
      placeholder: "Please enter your real name.",
      repeated: "Please enter your real name.",
      gibberish: "That does not look like a name. Please enter the name we should call you by.",
    })(
      z
        .string()
        .trim()
        .min(FIELD_LIMITS.name.min, "Please enter your name (at least 2 characters).")
        .max(FIELD_LIMITS.name.max, `Please keep your name under ${FIELD_LIMITS.name.max} characters.`)
        // Letters from any script, plus the punctuation that appears in real names.
        .regex(
          /^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u,
          "Names can only contain letters, spaces, apostrophes, periods and hyphens."
        )
    ),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Please enter your email address so we can reply.")
      .max(254, "That email address is too long.")
      .email("Please enter a valid email address, for example you@company.com.")
      .refine((v) => !isUnreachableEmailDomain(v), {
        message: "Please use a real, reachable email address — we cannot reply to test or disposable domains.",
      }),

    category: z.enum(CONTACT_CATEGORIES, {
      message: "Please choose what your message is about.",
    }),

    subject: meaningfulText({
      placeholder: "Please write a subject that says what this is about — it becomes the email title.",
      repeated: "Please write a subject that says what this is about, not one repeated word.",
      gibberish: "That subject does not look like real words. Please summarise your message.",
    })(
      z
        .string()
        .trim()
        .min(FIELD_LIMITS.subject.min, "Please write a subject of at least 8 characters.")
        .max(FIELD_LIMITS.subject.max, `Please keep the subject under ${FIELD_LIMITS.subject.max} characters.`)
    ).refine((v) => hasEnoughDistinctContent(v, 2), {
      message: "Please use at least two words in the subject so it is a usable email title.",
    }),

    message: meaningfulText({
      placeholder: "Please tell us what actually happened so we can act on it.",
      repeated: "Please describe the issue instead of repeating one word.",
      gibberish: "That message does not look like real words. Please describe the issue in plain language.",
    })(
      z
        .string()
        .trim()
        .min(
          FIELD_LIMITS.message.min,
          `Please give us at least ${FIELD_LIMITS.message.min} characters so we can act on it.`
        )
        .max(FIELD_LIMITS.message.max, `Please keep the message under ${FIELD_LIMITS.message.max} characters.`)
    )
      .refine((v) => hasEnoughDistinctContent(v, 6), {
        message: "Please describe the issue in a few more words.",
      })
      .refine((v) => countUrls(v) <= 3, {
        message: "Please include at most three links.",
      })
      // A message that is only links gives us nothing to act on.
      .refine((v) => normalizeWhitespace(v.replace(/\b(?:https?:\/\/|www\.)\S+/gi, "")).length >= 20, {
        message: "Please describe the problem in your own words, not only links.",
      }),

    consent: z.literal(true, {
      message: "Please confirm you agree to us using your email to reply.",
    }),

    /** Honeypot. Deliberately meaningless name and hidden from humans, so a
     *  non-empty value means an automated submission. */
    referenceCode: z.string().max(0, "Automated submission detected.").optional().default(""),

    /** Milliseconds between the form mounting and submission. Humans do not fill
     *  a five-field form instantly. A weak signal on its own — it is client
     *  supplied — but free to check alongside the honeypot. */
    elapsedMs: z
      .number({ message: "Invalid submission timing." })
      .int()
      .nonnegative()
      .refine((v) => v >= 1500, { message: "That was submitted too quickly. Please try again." }),
  })
  .strict(); // Reject unknown keys outright rather than forwarding junk into the email.

export type ContactFormValues = z.infer<typeof contactFormSchema>;

/** Shape the form holds while the user types, before validation/coercion. */
export type ContactFormDraft = {
  name: string;
  email: string;
  category: ContactCategory | "";
  subject: string;
  message: string;
  consent: boolean;
  referenceCode: string;
};

export const emptyContactDraft: ContactFormDraft = {
  name: "",
  email: "",
  category: "",
  subject: "",
  message: "",
  consent: false,
  referenceCode: "",
};

/** Field-keyed error map, which is what both the form and the API response use. */
export type ContactFieldErrors = Partial<Record<keyof ContactFormValues | "form", string>>;

export function toFieldErrors(error: z.ZodError): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  for (const issue of error.issues) {
    const key = (issue.path[0] as keyof ContactFormValues | undefined) ?? "form";
    // Keep the first error per field: showing one clear fix at a time is easier
    // to act on than a stack of messages.
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
