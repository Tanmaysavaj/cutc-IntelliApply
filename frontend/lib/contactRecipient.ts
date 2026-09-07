/**
 * The public contact address, kept in its own module so client components can
 * display it (and build a mailto fallback) without importing
 * `lib/server/contactEmail.ts`, which reads secrets and must stay out of the
 * browser bundle.
 *
 * The server treats CONTACT_TO_EMAIL as an override; this is the default both
 * sides fall back to.
 */
export const DEFAULT_CONTACT_RECIPIENT_PUBLIC = "tanmaysavaj5862@gmail.com";
